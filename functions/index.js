/**
 * ResQLink Firebase Cloud Functions
 * ──────────────────────────────────────────────────────────────────────────
 *
 * ⚠️  FIREBASE BLAZE PLAN REQUIRED TO DEPLOY THESE FUNCTIONS.
 *
 *  You are currently on the Spark (free) plan.
 *  The app works FULLY without these functions — the client-side escalation
 *  engine in AppDataContext.tsx handles the 10-minute timeout using Firestore
 *  transactions (zero cost, race-condition safe).
 *
 *  These Cloud Functions are kept here for a FUTURE upgrade to Blaze.
 *  When you upgrade, they replace the client-side escalation with true
 *  server-side timers that fire even when no user has the app open.
 *
 * UPGRADE STEPS (when ready):
 *   1. Upgrade Firebase project to Blaze plan at console.firebase.google.com
 *   2. cd functions && npm install
 *   3. firebase login && firebase use <your-project-id>
 *   4. firebase deploy --only functions
 *   5. Remove the escalation useEffect from AppDataContext.tsx (it will be
 *      replaced by the onRequestCreated Cloud Function below)
 *
 * FUNCTIONS:
 *   - onRequestCreated: Fires on new emergency_requests doc creation.
 *     Waits 10 minutes. If no NGO accepted → global auto-assign via Admin SDK.
 *
 *   - onVolunteerShortage: Fires when status → "Awaiting more volunteers".
 *     Sends extra notifications to remaining nearby NGOs.
 */

const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// Set region (change to match your Firebase project region)
setGlobalOptions({ region: "us-central1" });

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Haversine distance (km)
// ─────────────────────────────────────────────────────────────────────────────
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Create in-app notification
// ─────────────────────────────────────────────────────────────────────────────
async function createNotification(userId, title, body, type = "info") {
  await db.collection("notifications").add({
    user_id: userId,
    title,
    body,
    type,
    read: false,
    created_at: admin.firestore.FieldValue.serverTimestamp(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Global auto-assignment (bypasses NGO membership)
// Called when 10-min timer fires and no NGO has accepted the request.
// ─────────────────────────────────────────────────────────────────────────────
async function globalAutoAssign(requestId, requestData) {
  const volunteersNeeded = requestData.volunteers_needed || 1;
  const reqLat = requestData.location_lat;
  const reqLng = requestData.location_lng;

  // Fetch all available volunteers
  const volSnap = await db
    .collection("volunteers")
    .where("available", "==", true)
    .get();

  if (volSnap.empty) {
    console.log(`[GlobalAssign] No available volunteers for request ${requestId}`);
    await db.collection("emergency_requests").doc(requestId).update({
      status: "Escalated — No Volunteers",
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });
    return;
  }

  // Enrich with profile data and score by distance
  const volData = await Promise.all(
    volSnap.docs.map(async (d) => {
      const v = d.data();
      let trustScore = 0;
      let name = "Volunteer";
      try {
        const pSnap = await db.collection("profiles").doc(v.user_id).get();
        if (pSnap.exists) {
          trustScore = pSnap.data().trust_score || 0;
          name = pSnap.data().full_name || "Volunteer";
        }
      } catch (_) {}
      const dist =
        reqLat && reqLng && v.location_lat && v.location_lng
          ? haversineDistance(reqLat, reqLng, v.location_lat, v.location_lng)
          : 999;
      return { id: d.id, ...v, name, trustScore, dist };
    })
  );

  // Rank: closer + higher trust first
  volData.sort((a, b) => {
    const scoreA = Math.max(0, 1 - a.dist / 20) * 0.5 + (a.trustScore / 5) * 0.5;
    const scoreB = Math.max(0, 1 - b.dist / 20) * 0.5 + (b.trustScore / 5) * 0.5;
    return scoreB - scoreA;
  });

  const toAssign = volData.slice(0, volunteersNeeded);
  if (toAssign.length === 0) return;

  const leader = [...toAssign].sort((a, b) => b.trustScore - a.trustScore)[0];

  const batch = db.batch();
  const reqRef = db.collection("emergency_requests").doc(requestId);
  const assignedIds = toAssign.map((v) => v.id);

  toAssign.forEach((v) => {
    batch.update(db.collection("volunteers").doc(v.id), {
      available: false,
      current_task_id: requestId,
    });
    batch.set(
      db.collection("emergency_requests").doc(requestId).collection("assignments").doc(v.id),
      {
        volunteer_id: v.id,
        ngo_id: "",
        status: "assigned",
        is_leader: v.id === leader.id,
        escalated: true,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      }
    );
  });

  batch.update(reqRef, {
    status: "Volunteer assigned",
    assigned_volunteer_id: leader.id,
    volunteer_name: leader.name,
    team_leader_volunteer_id: leader.id,
    assigned_volunteer_ids: admin.firestore.FieldValue.arrayUnion(...assignedIds),
    remaining_volunteers_needed: 0,
    escalated: true,
    eta: Math.round((leader.dist || 5) * 8),
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();

  // Notify citizen
  await createNotification(
    requestData.user_id,
    "🚨 Emergency Team Dispatched",
    `No NGO responded in time. The system has automatically assigned ${toAssign.length} volunteer(s) including Team Leader ${leader.name}.`,
    "escalation"
  );

  // Notify volunteers
  await Promise.all(
    toAssign.map((v) =>
      createNotification(
        v.user_id,
        v.id === leader.id ? "🏅 You are Team Leader (Escalated)" : "🚨 Emergency Assignment (Escalated)",
        `You've been automatically dispatched to a ${requestData.category} emergency. Check your dashboard immediately.`,
        "request_accepted"
      )
    )
  );

  console.log(`[GlobalAssign] Assigned ${toAssign.length} volunteer(s) to ${requestId}. Leader: ${leader.name}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 1: onRequestCreated
// Triggers when a new emergency_requests document is created.
// Waits 10 minutes. If still no NGO accepted → global auto-assign.
// ─────────────────────────────────────────────────────────────────────────────
exports.onRequestCreated = onDocumentCreated(
  "emergency_requests/{requestId}",
  async (event) => {
    const requestId = event.params.requestId;
    const requestData = event.data.data();

    console.log(`[onRequestCreated] New request ${requestId}. Scheduling 10-min escalation check.`);

    // Wait 10 minutes (600,000 ms)
    // Cloud Functions have a max timeout — for long delays, use Cloud Tasks.
    // For simplicity and reliability within the 9-minute CF timeout limit,
    // we use a 9-minute wait. Adjust with Cloud Tasks for true 10-min reliability.
    await new Promise((resolve) => setTimeout(resolve, 9 * 60 * 1000));

    // Re-fetch the request to see its current state
    const freshSnap = await db.collection("emergency_requests").doc(requestId).get();
    if (!freshSnap.exists) {
      console.log(`[onRequestCreated] Request ${requestId} no longer exists. Aborting.`);
      return;
    }

    const fresh = freshSnap.data();

    // If an NGO has already accepted, do nothing
    if (fresh.ngo_id) {
      console.log(`[onRequestCreated] NGO ${fresh.ngo_id} already accepted ${requestId}. No escalation needed.`);
      return;
    }

    // No NGO accepted within 10 minutes → escalate globally
    console.log(`[onRequestCreated] No NGO accepted ${requestId} in time. Escalating globally.`);

    await db.collection("emergency_requests").doc(requestId).update({
      status: "Escalating",
      escalated: true,
      updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    await globalAutoAssign(requestId, fresh);
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// FUNCTION 2: onVolunteerShortage
// Triggers when a request status changes to "Awaiting more volunteers".
// Sends additional push alerts to any remaining nearby NGOs.
// ─────────────────────────────────────────────────────────────────────────────
exports.onVolunteerShortage = onDocumentUpdated(
  "emergency_requests/{requestId}",
  async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    const requestId = event.params.requestId;

    // Only fire when status just changed TO "Awaiting more volunteers"
    if (
      before.status === after.status ||
      after.status !== "Awaiting more volunteers"
    ) {
      return;
    }

    const remainingNeeded = after.remaining_volunteers_needed || 0;
    if (remainingNeeded <= 0) return;

    const nearbyNgoIds = after.nearby_ngo_ids || [];
    const participatingNgoIds = after.participating_ngo_ids || [];
    const pendingNgoIds = nearbyNgoIds.filter((id) => !participatingNgoIds.includes(id));

    if (pendingNgoIds.length === 0) {
      console.log(`[onVolunteerShortage] No remaining NGOs to notify for ${requestId}.`);
      return;
    }

    console.log(`[onVolunteerShortage] Notifying ${pendingNgoIds.length} NGO(s) for shortage in ${requestId}.`);

    await Promise.all(
      pendingNgoIds.map(async (ngoId) => {
        try {
          const ngoSnap = await db.collection("ngos").doc(ngoId).get();
          if (ngoSnap.exists) {
            const ngoData = ngoSnap.data();
            await createNotification(
              ngoData.user_id,
              "⚠️ Volunteer Shortage — Your Help is Needed",
              `An active ${after.category} emergency near you still needs ${remainingNeeded} volunteer(s). Accept the request to contribute your team.`,
              "shortage"
            );
          }
        } catch (e) {
          console.error(`[onVolunteerShortage] Failed to notify NGO ${ngoId}:`, e);
        }
      })
    );
  }
);
