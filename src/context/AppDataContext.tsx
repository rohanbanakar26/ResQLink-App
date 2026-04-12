import { createContext, useContext, useMemo, useState, useCallback, useEffect, type ReactNode } from "react";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  runTransaction,
  writeBatch,
  increment,
  arrayUnion,
} from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import type { GeoPoint } from "../utils/geo";
import { haversineDistance } from "../utils/geo";
import { buildPriorityZones, calculatePriorityScore, getUrgencyValue, getSeverityValue } from "../utils/analytics";
import { smartAnalyzeRequest, generateMissionBrief } from "@/lib/gemini";
import { getEarnedBadges } from "../utils/badges";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EmergencyRequest {
  id: string;
  userId: string;
  category: string;
  urgency: string;
  description: string;
  location: GeoPoint | null;
  status: string;
  citizenName: string;
  citizenPhone?: string;
  ngoId: string;
  ngoName: string;
  assignedVolunteerId: string;
  teamLeaderVolunteerId?: string | null;
  volunteersNeeded?: number;
  /** Tracks remaining unfilled volunteer slots for cascade logic */
  remainingVolunteersNeeded?: number;
  /** IDs of all NGOs notified when request was created (≤25 km) */
  nearbyNgoIds?: string[];
  /** IDs of NGOs that have accepted and are contributing volunteers */
  participatingNgoIds?: string[];
  /** All volunteer IDs currently assigned to this request (entire team) */
  assignedVolunteerIds?: string[];
  volunteerName: string;
  eta: number | null;
  priorityScore: number;
  photoUrl: string;
  createdAt: number;
  distanceKm?: number | null;
  completionProofUrls: string[];
  citizenApproved: boolean | null;
  citizenFeedback: string;
  rating: number | null;
  completedAt?: string | null;
}

export interface Volunteer {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  skills: string[];
  location: GeoPoint | null;
  available: boolean;
  trustScore: number;
  completedTasks: number;
  followersCount?: number;
  distanceKm?: number | null;
  currentTaskId?: string | null;
  ngoMemberships: Record<string, "pending" | "approved">;
}

export interface Ngo {
  id: string;
  userId: string;
  ngoName: string;
  email: string;
  phone: string;
  services: string[];
  location: GeoPoint | null;
  trustScore: number;
  capacity: number;
  followersCount?: number;
  distanceKm?: number | null;
}

export interface UserProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: "citizen" | "volunteer" | "ngo";
  phone: string;
  location: GeoPoint | null;
  trustScore: number;
  points: number;
  streakDays: number;
  earnedBadgeIds: string[];
}

interface AppDataContextValue {
  loading: boolean;
  location: GeoPoint | null;
  requests: EmergencyRequest[];
  activeRequests: EmergencyRequest[];
  nearbyRequests: EmergencyRequest[];
  myRequests: EmergencyRequest[];
  /** Auto-assigned missions for the currently logged-in volunteer */
  myAssignedRequests: EmergencyRequest[];
  volunteers: Volunteer[];
  ngos: Ngo[];
  priorityZones: any[];
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  followingList: string[];
  toggleFollow: (targetId: string, type: "ngo" | "volunteer") => Promise<void>;
  isAvailable: boolean;
  toggleAvailable: () => Promise<void>;
  joinTask: (requestId: string) => Promise<void>;
  createEmergency: (data: Record<string, any>) => Promise<string>;
  acceptRequest: (id: string) => Promise<void>;
  assignVolunteer: (requestId: string, volunteerId: string) => Promise<void>;
  /** Core auto-assignment. Pass ngoId to restrict to that NGO's pool; omit or pass "" for global escalation. */
  autoAssignVolunteers: (requestId: string, ngoId?: string) => Promise<void>;
  /** Triggered after a shortage — notifies remaining nearby NGOs to fill remaining slots */
  handleVolunteerShortage: (requestId: string) => Promise<void>;
  /** Volunteer confirms their auto-assigned mission */
  acknowledgeAssignment: (requestId: string) => Promise<void>;
  volunteerAdvance: (requestId: string, status: string) => Promise<void>;
  completeRequest: (id: string) => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: any) => Promise<boolean>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  setEmergencyMode: (v: boolean) => void;
  isToggling: boolean;
  rejectTask: (requestId: string) => Promise<void>;
  citizenFinalize: (requestId: string, approved: boolean, feedback?: string, rating?: number) => Promise<void>;
  approveVolunteer: (volunteerId: string) => Promise<void>;
  rejectVolunteer: (volunteerId: string) => Promise<void>;
  createNotification: (userId: string, title: string, body: string, type?: string) => Promise<void>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

const FALLBACK_LOCATION: GeoPoint = { lat: 12.9716, lng: 77.5946 };
/** Max radius (km) within which NGOs are notified when a request is created */
const NGO_BROADCAST_RADIUS_KM = 25;

function toGeo(lat: number | null, lng: number | null): GeoPoint | null {
  return lat != null && lng != null ? { lat, lng } : null;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, signIn, signUp, signOut, resetPassword } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [ngos, setNgos] = useState<Ngo[]>([]);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [followingList, setFollowingList] = useState<string[]>([]);
  const [location, setLocation] = useState<GeoPoint | null>(FALLBACK_LOCATION);

  const isAuthenticated = user !== null;

  // ── Real browser geolocation ──────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // ── Profile, Follows, Requests, Volunteers ────────────────────────────────
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setRequests([]);
      setVolunteers([]);
      setNgos([]);
      setDataLoading(false);
      return;
    }

    // 1. Profile
    const profileRef = doc(db, "profiles", user.uid);
    const unsubscribeProfile = onSnapshot(profileRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const badgesRef = collection(db, "profiles", user.uid, "badges");
        const badgeSnaps = await getDocs(badgesRef);
        const badgeIds = badgeSnaps.docs.map((d) => d.id);

        setProfile({
          id: docSnap.id,
          userId: data.user_id,
          name: data.full_name || user.email?.split("@")[0] || "Unknown",
          email: data.email,
          role: data.role as any,
          phone: data.phone || "",
          location: toGeo(data.location_lat, data.location_lng),
          trustScore: data.trust_score ?? 4.5,
          points: data.points ?? 0,
          streakDays: data.streak_days ?? 0,
          earnedBadgeIds: badgeIds,
        });

        if (data.role === "volunteer") {
          const volRef = doc(db, "volunteers", user.uid);
          const volSnap = await getDoc(volRef);
          if (volSnap.exists()) {
            setIsAvailable(volSnap.data().available || false);
          }
        }
      }
    });

    // 2. Follows
    const followsQuery = query(collection(db, "user_follows"), where("user_id", "==", user.uid));
    const unsubscribeFollows = onSnapshot(followsQuery, (snap) => {
      setFollowingList(snap.docs.map((d) => d.data().target_id));
    });

    return () => {
      unsubscribeProfile();
      unsubscribeFollows();
    };
  }, [user]);

  // ── Secure Requests & Volunteers Listener ─────────────────────────────────
  useEffect(() => {
    if (!user || user.uid !== profile?.userId) {
      return;
    }

    // 3. Requests
    const requestsRef = collection(db, "emergency_requests");
    let qRequests = query(requestsRef, orderBy("created_at", "desc"));
    
    // Secure scope: Citizens only sync their own requests locally.
    if (profile.role === "citizen") {
      qRequests = query(requestsRef, where("user_id", "==", user.uid), orderBy("created_at", "desc"));
    }

    const unsubscribeRequests = onSnapshot(
      qRequests,
      (snapshot) => {
        setRequests(
          snapshot.docs.map((d) => {
            const r = d.data();
            return {
              id: d.id,
              userId: r.user_id,
              category: r.category,
              urgency: r.urgency,
              description: r.description,
              location: toGeo(r.location_lat, r.location_lng),
              status: r.status,
              citizenName: r.citizen_name || "",
              ngoId: r.ngo_id || "",
              ngoName: r.ngo_name || "",
              assignedVolunteerId: r.assigned_volunteer_id || "",
              teamLeaderVolunteerId: r.team_leader_volunteer_id,
              volunteersNeeded: r.volunteers_needed || 1,
              remainingVolunteersNeeded: r.remaining_volunteers_needed ?? null,
              nearbyNgoIds: r.nearby_ngo_ids || [],
              participatingNgoIds: r.participating_ngo_ids || [],
              assignedVolunteerIds: r.assigned_volunteer_ids || [],
              volunteerName: r.volunteer_name || "",
              eta: r.eta,
              priorityScore: r.priority_score || 0,
              photoUrl: r.photo_url || "",
              createdAt: r.created_at?.toMillis?.() || Date.now(),
              completionProofUrls: r.completion_proof_urls || [],
              citizenApproved: r.citizen_approved ?? null,
              citizenFeedback: r.citizen_feedback || "",
              rating: r.rating ?? null,
              completedAt: r.completed_at || null,
            };
          })
        );
      },
      (err) => console.error("Requests listener error:", err)
    );

    // 4. Volunteers
    const volunteersRef = collection(db, "volunteers");
    const unsubscribeVolunteers = onSnapshot(volunteersRef, async (snapshot) => {
      const volData = await Promise.all(
        snapshot.docs.map(async (d) => {
          const v = d.data();
          const pRef = doc(db, "profiles", v.user_id);
          const pSnap = await getDoc(pRef);
          const pData = pSnap.exists() ? pSnap.data() : {};
          return {
            id: d.id,
            userId: v.user_id,
            name: pData.full_name || "",
            email: pData.email || "",
            phone: pData.phone || "",
            skills: Array.isArray(v.skills)
              ? v.skills
              : typeof v.skills === "string"
              ? v.skills.split(",").map((s: string) => s.trim()).filter(Boolean)
              : [],
            location: toGeo(v.location_lat, v.location_lng),
            available: v.available ?? true,
            trustScore: pData.trust_score ?? 4.5,
            completedTasks: v.completed_tasks || 0,
            followersCount: v.followers_count || 0,
            currentTaskId: v.current_task_id,
            ngoMemberships: v.ngo_memberships || {},
          };
        })
      );
      setVolunteers(volData);
    }, (err) => console.error("Volunteers listener error:", err));

    return () => {
      unsubscribeRequests();
      unsubscribeVolunteers();
    };
  }, [user, profile?.role, profile?.userId]);

  // ── NGOs (public) ─────────────────────────────────────────────────────────
  useEffect(() => {
    const ngosRef = collection(db, "ngos");
    const unsubscribeNgos = onSnapshot(ngosRef, async (snapshot) => {
      const ngoData = await Promise.all(
        snapshot.docs.map(async (d) => {
          const n = d.data();
          let pData: any = {};
          try {
            const pRef = doc(db, "profiles", n.user_id);
            const pSnap = await getDoc(pRef);
            if (pSnap.exists()) pData = pSnap.data();
          } catch (e) {}
          return {
            id: d.id,
            userId: n.user_id,
            ngoName: n.ngo_name,
            email: pData.email || "",
            phone: pData.phone || "",
            services: n.services || [],
            location: toGeo(n.location_lat, n.location_lng),
            trustScore: pData.trust_score ?? 4.5,
            capacity: n.capacity || 10,
            followersCount: n.followers_count || 0,
          };
        })
      );
      setNgos(ngoData);
      setDataLoading(false);
    }, (err) => {
      console.error("NGOs listener error:", err);
      setDataLoading(false);
    });
    return () => unsubscribeNgos();
  }, []);

  // ── Derived state ─────────────────────────────────────────────────────────

  const activeRequests = useMemo(() => requests.filter((r) => r.status !== "Completed"), [requests]);

  const nearbyRequests = useMemo(() => {
    return requests
      .map((r) => ({ ...r, distanceKm: haversineDistance(location, r.location) }))
      .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  }, [requests, location]);

  const myRequests = useMemo(() => {
    if (!profile) return [];
    if (profile.role === "citizen") return requests.filter((r) => r.userId === user?.uid);
    if (profile.role === "volunteer") {
      const vol = volunteers.find((v) => v.userId === user?.uid);
      return vol ? requests.filter((r) => r.assignedVolunteerId === vol.id) : [];
    }
    if (profile.role === "ngo") {
      const ngo = ngos.find((n) => n.userId === user?.uid);
      return ngo ? requests.filter((r) => r.ngoId === ngo.id) : [];
    }
    return [];
  }, [requests, profile, user, volunteers, ngos]);

  /**
   * All requests where the current volunteer is part of the assigned team.
   * Uses the `assignedVolunteerIds` array field written by autoAssignVolunteers.
   */
  const myAssignedRequests = useMemo(() => {
    if (!profile || profile.role !== "volunteer" || !user) return [];
    const vol = volunteers.find((v) => v.userId === user.uid);
    if (!vol) return [];
    return requests.filter((r) => (r.assignedVolunteerIds || []).includes(vol.id));
  }, [requests, profile, user, volunteers]);

  const priorityZones = useMemo(() => buildPriorityZones([], requests), [requests]);

  // ── Notification helper ───────────────────────────────────────────────────

  const createNotification = useCallback(async (userId: string, title: string, body: string, type: string = "info") => {
    try {
      await addDoc(collection(db, "notifications"), {
        user_id: userId,
        title,
        body,
        type,
        read: false,
        created_at: serverTimestamp(),
      });
    } catch (e) {
      console.error("Failed to create notification:", e);
    }
  }, []);

  // ── Core: Auto-Assign Volunteers ──────────────────────────────────────────

  /**
   * Automatically selects and assigns the best volunteers to a request.
   *
   * @param requestId - The Firestore document ID of the emergency request
   * @param ngoId     - Restrict to this NGO's approved volunteer pool.
   *                    Pass "" or omit to run a global (escalation) assignment
   *                    that ignores NGO membership.
   *
   * Flow:
   * 1. Read remaining_volunteers_needed (falls back to volunteers_needed)
   * 2. Filter available volunteers by NGO membership (or all if global)
   * 3. Rank by Proximity (30%) + AI match (40%) + Trust (30%)
   * 4. Pick top N
   * 5. Elect Team Leader = highest trustScore
   * 6. Write to Firestore in a transaction
   * 7. If still short after assignment → call handleVolunteerShortage
   */
  const autoAssignVolunteers = useCallback(async (requestId: string, ngoId: string = "") => {
    const reqRef = doc(db, "emergency_requests", requestId);
    const reqSnap = await getDoc(reqRef);
    if (!reqSnap.exists()) return;
    const reqData = reqSnap.data();

    // Guard: must have an NGO unless this is a global escalation
    if (!ngoId && !reqData.ngo_id) {
      console.log("[AutoAssign] Waiting for NGO acceptance before assigning volunteers.");
      return;
    }

    const targetNgoId = ngoId || reqData.ngo_id;
    const isGlobal = !ngoId;

    // How many slots still need to be filled?
    const currentlyAssigned = (reqData.assigned_volunteer_ids || []).length;
    const totalNeeded = reqData.volunteers_needed || 1;
    const remaining = reqData.remaining_volunteers_needed ?? (totalNeeded - currentlyAssigned);

    if (remaining <= 0) {
      console.log("[AutoAssign] Team is already fully staffed.");
      return;
    }

    // Fetch ALL volunteers — we'll filter by NGO membership below.
    // We query all, NOT just available==true, because a volunteer in the primary
    // NGO may be currently marked offline but can toggle available and accept.
    // Cascade to other NGOs must NOT happen just because some volunteers are busy.
    const vQuery = query(collection(db, "volunteers"));
    const vSnapshot = await getDocs(vQuery);
    if (vSnapshot.empty) {
      console.warn("[AutoAssign] No volunteers found in database at all.");
      // Nothing to do — notify the NGO admin to register volunteers first
      const ngoSnap = await getDoc(doc(db, "ngos", targetNgoId));
      if (ngoSnap.exists()) {
        await createNotification(
          ngoSnap.data().user_id,
          "⚠️ No Volunteers Found",
          "Your NGO has no volunteers yet. Please invite volunteers to join your NGO.",
          "warning"
        );
      }
      return;
    }

    const volDataRaw = await Promise.all(
      vSnapshot.docs.map(async (d) => {
        const v = d.data();
        const pSnap = await getDoc(doc(db, "profiles", v.user_id));
        return {
          id: d.id,
          ...v,
          name: pSnap.exists() ? pSnap.data().full_name || "Volunteer" : "Volunteer",
          skills: v.skills || [],
          trustScore: pSnap.exists() ? pSnap.data().trust_score || 0 : 0,
        };
      })
    );

    // Filter: NGO-specific or global
    const alreadyAssigned: string[] = reqData.assigned_volunteer_ids || [];
    const eligiblePool = isGlobal
      ? volDataRaw.filter((v: any) => !alreadyAssigned.includes(v.id))
      : volDataRaw.filter(
          (v: any) =>
            v.ngo_memberships?.[targetNgoId] === "approved" && !alreadyAssigned.includes(v.id)
        );

    if (eligiblePool.length === 0) {
      console.warn(`[AutoAssign] No eligible volunteers in NGO ${targetNgoId}. Notifying NGO admin.`);
      if (!isGlobal) {
        // Notify the NGO admin — their pool is empty, not cascading to other NGOs
        try {
          const ngoSnap = await getDoc(doc(db, "ngos", targetNgoId));
          if (ngoSnap.exists()) {
            await createNotification(
              ngoSnap.data().user_id,
              "⚠️ No Eligible Volunteers Available",
              "None of your approved volunteers are available for the accepted emergency. Please approve more volunteers or ask existing ones to toggle Available.",
              "warning"
            );
          }
        } catch (e) {
          console.warn("[AutoAssign] Failed to notify NGO admin:", e);
        }
      }
      return; // STOP — do not cascade to other NGOs
    }

    const reqLoc = toGeo(reqData.location_lat, reqData.location_lng);
    if (!reqLoc) return;

    // AI ranking (best-effort)
    let aiMatch: any = null;
    try {
      aiMatch = await smartAnalyzeRequest(
        { category: reqData.category, urgency: reqData.urgency, description: reqData.description },
        eligiblePool
      );
    } catch (e) {
      console.warn("[AutoAssign] AI match failed, falling back to proximity+trust scoring.", e);
    }

    // Score each volunteer
    const ranked = eligiblePool
      .map((v: any) => {
        const vLoc = toGeo(v.location_lat, v.location_lng);
        const dist = haversineDistance(reqLoc, vLoc);
        const proximityScore = dist != null ? Math.max(0, 1 - dist / 20) : 0;
        const aiScore = aiMatch?.volunteerRankings?.[v.id] ?? v.trustScore / 5;
        const totalScore = aiScore * 0.7 + proximityScore * 0.3;
        return { ...v, totalScore, dist };
      })
      .sort((a: any, b: any) => b.totalScore - a.totalScore);

    const toAssign = ranked.slice(0, remaining);
    if (toAssign.length === 0) {
      // Ranked list was empty after scoring — just stop, no cascade
      console.warn("[AutoAssign] Ranked pool is empty after scoring. Stopping.");
      return;
    }

    // Team Leader = highest trustScore in newly assigned batch
    // (compare against any existing leader as well)
    const existingLeaderId: string | null = reqData.team_leader_volunteer_id || null;
    const existingLeaderTrust = existingLeaderId
      ? (volDataRaw.find((v: any) => v.id === existingLeaderId)?.trustScore ?? 0)
      : 0;

    const newLeaderCandidate = [...toAssign].sort((a: any, b: any) => b.trustScore - a.trustScore)[0];
    const leaderId =
      newLeaderCandidate.trustScore > existingLeaderTrust ? newLeaderCandidate.id : existingLeaderId;
    const leaderName =
      newLeaderCandidate.trustScore > existingLeaderTrust
        ? newLeaderCandidate.name
        : (volDataRaw.find((v: any) => v.id === existingLeaderId)?.name ?? newLeaderCandidate.name);

    // Generate AI mission brief
    let missionBrief = "";
    if (aiMatch) {
      try {
        missionBrief = await generateMissionBrief(
          { category: reqData.category, description: reqData.description, citizenName: reqData.citizen_name },
          leaderName,
          aiMatch.reasoning
        );
      } catch (e) {
        console.warn("[AutoAssign] Mission brief generation failed.", e);
      }
    }

    const newAssignedIds = toAssign.map((v: any) => v.id);
    const stillRemaining = remaining - toAssign.length;

    // Atomic Firestore write
    const batch = writeBatch(db);
    toAssign.forEach((v: any) => {
      batch.update(doc(db, "volunteers", v.id), {
        available: false,
        current_task_id: requestId,
      });
      const assignRef = doc(collection(db, "emergency_requests", requestId, "assignments"), v.id);
      batch.set(assignRef, {
        volunteer_id: v.id,
        ngo_id: targetNgoId,
        status: "assigned",
        is_leader: v.id === leaderId,
        created_at: serverTimestamp(),
      });
    });

    batch.update(reqRef, {
      status: "Volunteer assigned",
      assigned_volunteer_id: leaderId,
      volunteer_name: leaderName,
      team_leader_volunteer_id: leaderId,
      // Merge new IDs into the full list
      assigned_volunteer_ids: arrayUnion(...newAssignedIds),
      remaining_volunteers_needed: stillRemaining > 0 ? stillRemaining : 0,
      eta: toAssign[0]?.dist ? Math.round(toAssign[0].dist * 8) : 5,
      ...(missionBrief && { ai_mission_brief: missionBrief }),
      ...(aiMatch?.reasoning && { ai_analysis_reason: aiMatch.reasoning }),
      ...(aiMatch?.suggestedSteps && { ai_suggested_steps: aiMatch.suggestedSteps }),
      updated_at: serverTimestamp(),
    });
    
    await batch.commit();

    // Notify assigned volunteers
    await Promise.all(
      toAssign.map((v: any) =>
        createNotification(
          v.user_id,
          v.id === leaderId ? "🏅 You are the Team Leader!" : "🚨 New Mission Assigned",
          `You've been dispatched to a ${reqData.category} emergency${v.id === leaderId ? " and selected as Team Leader" : ""}. Check your dashboard.`,
          "request_accepted"
        )
      )
    );

    // ── IMPORTANT: Do NOT cascade to other NGOs here ──────────────────────
    // If this NGO's pool couldn't fill all slots right now (some volunteers
    // are currently busy/offline), we simply record the shortage and STOP.
    // Cascade to other NGOs only happens when a volunteer ACTIVELY REJECTS
    // their assignment (handled in rejectTask below).
    // This gives the primary NGO's volunteers a real chance to accept first.
    if (stillRemaining > 0 && !isGlobal) {
      console.log(`[AutoAssign] ${stillRemaining} slot(s) open in NGO ${targetNgoId}. Waiting for volunteer responses before cascading.`);
      // Just update the remaining count — no cascade yet
      await updateDoc(reqRef, {
        remaining_volunteers_needed: stillRemaining,
        updated_at: serverTimestamp(),
      });
    }
  }, [createNotification]);

  // ── Multi-NGO Cascade: Shortage Handler ───────────────────────────────────

  /**
   * Called when a volunteer rejects, or when autoAssignVolunteers can't fill
   * all slots from a single NGO's pool.
   *
   * Notifies remaining nearby NGOs (those in nearby_ngo_ids but NOT yet in
   * participating_ngo_ids) that there are still open volunteer slots.
   * Each notified NGO's admin can accept the request to contribute their
   * own volunteers and fill the remaining slots.
   */
  const handleVolunteerShortage = useCallback(async (requestId: string) => {
    const reqRef = doc(db, "emergency_requests", requestId);
    const reqSnap = await getDoc(reqRef);
    if (!reqSnap.exists()) return;
    const reqData = reqSnap.data();

    const currentlyAssigned = (reqData.assigned_volunteer_ids || []).length;
    const totalNeeded = reqData.volunteers_needed || 1;
    const remaining = reqData.remaining_volunteers_needed ?? (totalNeeded - currentlyAssigned);

    if (remaining <= 0) {
      console.log("[Shortage] Team is fully staffed. No cascade needed.");
      return;
    }

    const nearbyNgoIds: string[] = reqData.nearby_ngo_ids || [];
    const participatingNgoIds: string[] = reqData.participating_ngo_ids || [];

    // NGOs that know about this request but haven't accepted yet
    const pendingNgoIds = nearbyNgoIds.filter((id) => !participatingNgoIds.includes(id));

    if (pendingNgoIds.length === 0) {
      // All nearby NGOs are exhausted — escalate globally via Cloud Function logic
      // (The Firebase Cloud Function handles true global fallback via Admin SDK)
      console.warn("[Shortage] All nearby NGOs exhausted. Global escalation will be handled by Cloud Function.");
      await updateDoc(reqRef, {
        status: "Awaiting more volunteers",
        remaining_volunteers_needed: remaining,
        updated_at: serverTimestamp(),
      });
      return;
    }

    // Notify each remaining nearby NGO
    await Promise.all(
      pendingNgoIds.map(async (ngoId) => {
        try {
          const ngoSnap = await getDoc(doc(db, "ngos", ngoId));
          if (ngoSnap.exists()) {
            const ngoData = ngoSnap.data();
            await createNotification(
              ngoData.user_id,
              "⚠️ Team Needs More Volunteers",
              `An active ${reqData.category} emergency near you still needs ${remaining} more volunteer(s). Can your team help fill the gap?`,
              "shortage"
            );
          }
        } catch (e) {
          console.warn(`[Shortage] Failed to notify NGO ${ngoId}:`, e);
        }
      })
    );

    await updateDoc(reqRef, {
      status: "Awaiting more volunteers",
      remaining_volunteers_needed: remaining,
      updated_at: serverTimestamp(),
    });
  }, [createNotification]);

  // ── Client-Side Escalation Engine (Spark plan — no Cloud Functions needed) ─
  //
  // How it works:
  //   1. Runs whenever the requests list changes (any user's tab detects stale requests)
  //   2. Finds requests still "Created" after ESCALATION_TIMEOUT_MS (10 min)
  //   3. Uses a Firestore TRANSACTION to atomically claim escalation:
  //        - Checks status is still "Created" inside the transaction
  //        - Changes to "Escalating" only if still "Created"
  //        - This ensures ONLY ONE client tab ever triggers the global assign,
  //          even if 100 users have the app open simultaneously
  //   4. Calls autoAssignVolunteers(id, "") — global, bypasses NGO filter
  //
  // NOTE: If you upgrade to Firebase Blaze, replace this with the Cloud Function
  //       in functions/index.js (onRequestCreated) for true server-side reliability.

  const ESCALATION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

  useEffect(() => {
    if (!requests.length) return;

    const staleRequests = requests.filter(
      (r) =>
        r.status === "Created" &&
        Date.now() - r.createdAt >= ESCALATION_TIMEOUT_MS
    );

    if (staleRequests.length === 0) return;

    staleRequests.forEach(async (req) => {
      try {
        const reqRef = doc(db, "emergency_requests", req.id);

        // Atomically claim this request for escalation.
        // Only the FIRST client to reach this transaction wins.
        const claimed = await runTransaction(db, async (transaction) => {
          const snap = await transaction.get(reqRef);
          if (!snap.exists()) return false;
          const currentStatus = snap.data().status;
          // If another client already claimed it, back off
          if (currentStatus !== "Created") return false;
          // Claim it
          transaction.update(reqRef, {
            status: "Escalating",
            escalated: true,
            updated_at: serverTimestamp(),
          });
          return true;
        });

        if (!claimed) {
          // Another client (or an NGO) already handled this — skip
          return;
        }

        console.log(
          `[Escalation] Request ${req.id} unclaimed after 10 min. Running global auto-assign.`
        );

        // Notify citizen that system is escalating
        await createNotification(
          req.userId,
          "⏱️ Escalating Your Request",
          "No NGO responded in time. The system is now automatically finding volunteers for you.",
          "escalation"
        );

        // Global assignment — no NGO filter
        await autoAssignVolunteers(req.id, "");
      } catch (e) {
        // Transaction conflicts are expected (other clients racing) — safe to ignore
        console.warn(`[Escalation] Transaction conflict for ${req.id} — another client handled it.`, e);
      }
    });
  }, [requests]);

  // ── Create Emergency ──────────────────────────────────────────────────────

  const createEmergency = useCallback(async (data: Record<string, any>) => {
    const ps = calculatePriorityScore({
      averageUrgency: getUrgencyValue(data.urgency),
      severity: getSeverityValue(data.category),
      totalReports: 1,
      recentReports: 1,
    });

    const reqLat = location?.lat ?? null;
    const reqLng = location?.lng ?? null;
    const reqLoc: GeoPoint | null = toGeo(reqLat, reqLng);

    // Find all NGOs within broadcast radius
    const nearbyNgos = ngos.filter((n) => {
      const dist = haversineDistance(reqLoc, n.location);
      return dist != null && dist <= NGO_BROADCAST_RADIUS_KM;
    });
    const nearbyNgoIds = nearbyNgos.map((n) => n.id);

    const docRef = await addDoc(collection(db, "emergency_requests"), {
      user_id: user!.uid,
      category: data.category,
      urgency: data.urgency,
      description: data.description,
      location_lat: reqLat,
      location_lng: reqLng,
      citizen_name: profile?.name || "",
      priority_score: ps,
      status: "Created",
      people_affected: data.people_affected ? parseInt(data.people_affected) || null : null,
      volunteers_needed: data.volunteers_needed || 1,
      remaining_volunteers_needed: data.volunteers_needed || 1,
      nearby_ngo_ids: nearbyNgoIds,
      participating_ngo_ids: [],
      assigned_volunteer_ids: [],
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    // Notify all nearby NGOs simultaneously
    if (nearbyNgos.length > 0) {
      await Promise.all(
        nearbyNgos.map((ngo) =>
          createNotification(
            ngo.userId,
            "🚨 New Emergency Request Nearby",
            `A ${data.urgency} ${data.category} emergency has been reported ${
              reqLoc && ngo.location
                ? `~${haversineDistance(reqLoc, ngo.location)?.toFixed(1)} km`
                : "near"
            } from your NGO. Open the app to review and accept.`,
            "new_request"
          )
        )
      );
      console.log(`[CreateEmergency] Broadcast to ${nearbyNgos.length} nearby NGO(s). Request: ${docRef.id}`);
    } else {
      console.warn("[CreateEmergency] No NGOs within broadcast radius. Request awaits global escalation (Cloud Function).");
    }

    // NOTE: 10-minute escalation is handled by the Firebase Cloud Function
    // at functions/index.js — it watches emergency_requests onDocumentCreated
    // and escalates globally if no NGO accepts within 10 minutes.

    return docRef.id;
  }, [user, profile, location, ngos, createNotification]);

  // ── Accept Request (Primary + Supplementary NGO logic) ────────────────────

  /**
   * Called when an NGO admin clicks "Accept".
   *
   * - If no NGO has accepted yet → this NGO becomes the PRIMARY handler
   *   (sets ngo_id, ngo_name, status "Accepted")
   * - If another NGO already accepted → this NGO is SUPPLEMENTARY
   *   (doesn't overwrite ngo_id; just adds to participating_ngo_ids)
   * - In both cases: runs autoAssignVolunteers with this NGO's pool
   */
  const acceptRequest = useCallback(async (id: string) => {
    const ngo = ngos.find((n) => n.userId === user?.uid);
    if (!ngo) return;

    const reqRef = doc(db, "emergency_requests", id);
    const reqSnap = await getDoc(reqRef);
    if (!reqSnap.exists()) return;
    const reqData = reqSnap.data();

    const request = requests.find((r) => r.id === id);
    const isPrimary = !reqData.ngo_id;

    if (isPrimary) {
      // First NGO to accept — becomes primary
      await updateDoc(reqRef, {
        status: "Accepted",
        ngo_id: ngo.id,
        ngo_name: ngo.ngoName,
        participating_ngo_ids: arrayUnion(ngo.id),
        updated_at: serverTimestamp(),
      });
      await createNotification(
        request?.userId || reqData.user_id,
        "✅ Request Accepted",
        `${ngo.ngoName} is now handling your emergency and dispatching a team.`,
        "request_accepted"
      );
    } else {
      // Supplementary NGO — helps fill remaining volunteer slots
      await updateDoc(reqRef, {
        participating_ngo_ids: arrayUnion(ngo.id),
        updated_at: serverTimestamp(),
      });
      await createNotification(
        request?.userId || reqData.user_id,
        "🤝 Additional Support On the Way",
        `${ngo.ngoName} is contributing more volunteers to your request.`,
        "request_accepted"
      );
    }

    // Run assignment for THIS NGO's pool only
    await autoAssignVolunteers(id, ngo.id);
  }, [user, ngos, requests, autoAssignVolunteers, createNotification]);

  // ── Reject Task (volunteer declines) ─────────────────────────────────────

  /**
   * Correct cascade order when a volunteer rejects:
   *
   * STEP 1 — Try to replace from the SAME primary NGO first.
   *   The rejecting volunteer freed their slot. Before going elsewhere,
   *   check if the primary NGO still has other available approved volunteers
   *   who haven't been assigned yet. If yes → assign one more from the same NGO.
   *
   * STEP 2 — Only if the primary NGO's pool is NOW exhausted, cascade to
   *   other nearby NGOs via handleVolunteerShortage.
   *
   * This ensures other NGOs are NEVER involved unless the primary NGO truly
   * cannot provide enough volunteers.
   */
  const rejectTask = useCallback(async (requestId: string) => {
    if (!profile || !user) return;
    const vol = volunteers.find((v) => v.userId === user.uid);
    if (!vol) return;

    // Remove volunteer from assignment subcollection and free them up
    const batch = writeBatch(db);
    const assignRef = doc(db, "emergency_requests", requestId, "assignments", vol.id);
    batch.delete(assignRef);
    batch.update(doc(db, "volunteers", vol.id), { available: true, current_task_id: null });
    await batch.commit();

    // Re-fetch request to get current state
    const reqRef = doc(db, "emergency_requests", requestId);
    const reqSnap = await getDoc(reqRef);
    if (!reqSnap.exists()) return;
    const reqData = reqSnap.data();

    // Update assigned list (remove the rejecting volunteer)
    const currentAssigned = (reqData.assigned_volunteer_ids || []).filter(
      (vid: string) => vid !== vol.id
    );
    const totalNeeded = reqData.volunteers_needed || 1;
    const newRemaining = totalNeeded - currentAssigned.length;

    await updateDoc(reqRef, {
      assigned_volunteer_ids: currentAssigned,
      remaining_volunteers_needed: newRemaining,
      updated_at: serverTimestamp(),
    });

    if (newRemaining <= 0) {
      // Team is still fully staffed (edge case) — nothing to do
      console.log(`[RejectTask] Slot freed but team is still full. No cascade needed.`);
      return;
    }

    // ── STEP 1: Try to refill from the primary NGO first ─────────────────
    const primaryNgoId = reqData.ngo_id;
    if (primaryNgoId) {
      // Query ALL volunteers from that NGO (not just available==true).
      // A volunteer might be offline right now but can toggle Available and accept.
      const vSnap = await getDocs(query(collection(db, "volunteers")));

      const sameNgoPool = vSnap.docs.filter((d) => {
        const memberships = d.data().ngo_memberships || {};
        return (
          memberships[primaryNgoId] === "approved" &&
          !currentAssigned.includes(d.id) &&
          d.id !== vol.id // exclude the one who just rejected
        );
      });

      if (sameNgoPool.length > 0) {
        // Primary NGO still has more members — try to fill the slot from same NGO
        console.log(
          `[RejectTask] Primary NGO (${primaryNgoId}) has ${sameNgoPool.length} more member(s). Refilling from same NGO.`
        );
        await autoAssignVolunteers(requestId, primaryNgoId);
        return; // Done — no need to involve other NGOs
      }

      console.log(
        `[RejectTask] Primary NGO (${primaryNgoId}) has no more approved members. Cascading to next nearby NGO.`
      );
    }


    // ── STEP 2: Primary NGO exhausted → cascade to other nearby NGOs ─────
    await handleVolunteerShortage(requestId);
  }, [profile, user, volunteers, autoAssignVolunteers, handleVolunteerShortage]);

  // ── Acknowledge Assignment (volunteer confirms mission) ───────────────────

  /**
   * Volunteer formally acknowledges their auto-assigned mission.
   * Changes assignment status: "assigned" → "acknowledged"
   * Changes request status: → "On the way"
   */
  const acknowledgeAssignment = useCallback(async (requestId: string) => {
    if (!profile || profile.role !== "volunteer" || !user) return;
    const vol = volunteers.find((v) => v.userId === user.uid);
    if (!vol) return;

    const assignRef = doc(db, "emergency_requests", requestId, "assignments", vol.id);
    await updateDoc(assignRef, {
      status: "acknowledged",
      acknowledged_at: serverTimestamp(),
    });

    await updateDoc(doc(db, "emergency_requests", requestId), {
      status: "On the way",
      updated_at: serverTimestamp(),
    });

    await updateDoc(doc(db, "volunteers", vol.id), {
      current_task_id: requestId,
    });
  }, [profile, user, volunteers]);

  // ── Badge check ───────────────────────────────────────────────────────────

  const checkAndAwardBadges = useCallback(async (userId: string) => {
    try {
      const pRef = doc(db, "profiles", userId);
      const pSnap = await getDoc(pRef);
      if (!pSnap.exists()) return;
      const pData = pSnap.data();

      let completedCount = 0;
      if (pData.role === "volunteer") {
        const vSnap = await getDoc(doc(db, "volunteers", userId));
        completedCount = vSnap.data()?.completed_tasks || 0;
      } else {
        const q = query(
          collection(db, "emergency_requests"),
          where("user_id", "==", userId),
          where("status", "==", "Completed")
        );
        const snap = await getDocs(q);
        completedCount = snap.size;
      }

      const stats = {
        completedTasks: completedCount,
        avgResponseMinutes: null,
        uniqueAreas: 1,
        criticalTasks: 0,
        highImpactTasks: 0,
        isTopPercentile: false,
      };

      const earned = getEarnedBadges(stats);
      const currentBadgesRef = collection(db, "profiles", userId, "badges");
      for (const badge of earned) {
        const bRef = doc(currentBadgesRef, badge.id);
        const bSnap = await getDoc(bRef);
        if (!bSnap.exists()) {
          await setDoc(bRef, { earned_at: serverTimestamp(), badge_name: badge.name });
          await createNotification(userId, "New Badge Earned! 🏆", `You've earned the "${badge.name}" badge.`, "badge");
        }
      }
    } catch (e) {
      console.error("Error awarding badges:", e);
    }
  }, [createNotification]);

  // ── Citizen Finalize ──────────────────────────────────────────────────────

  const citizenFinalize = useCallback(async (requestId: string, approved: boolean, feedback?: string, rating?: number) => {
    const status = approved ? "Completed" : "Cancelled";
    await updateDoc(doc(db, "emergency_requests", requestId), {
      status,
      citizen_approved: approved,
      citizen_feedback: feedback || "",
      rating: rating || null,
      completed_at: approved ? new Date().toISOString() : null,
      updated_at: serverTimestamp(),
    });

    if (approved) {
      const q = query(collection(db, "emergency_requests", requestId, "assignments"));
      const snaps = await getDocs(q);

      let ngoUserToAward: string | null = null;
      let reqDbId: string | null = null;
      const reqDoc = await getDoc(doc(db, "emergency_requests", requestId));
      if (reqDoc.exists() && reqDoc.data().ngo_id) {
        reqDbId = reqDoc.data().ngo_id;
        const nDoc = await getDoc(doc(db, "ngos", reqDbId!));
        ngoUserToAward = nDoc.exists() ? nDoc.data().user_id : null;
      }

      await Promise.all(
        snaps.docs.map(async (d) => {
          const vId = d.data().volunteer_id;
          const vSnap = await getDoc(doc(db, "volunteers", vId));
          if (vSnap.exists()) {
            const uId = vSnap.data().user_id;
            const pRef = doc(db, "profiles", uId);
            const vRef = doc(db, "volunteers", vId);
            await runTransaction(db, async (transaction) => {
              const pSnap = await transaction.get(pRef);
              const vData = (await transaction.get(vRef)).data();
              const currentPoints = pSnap.data()?.points || 0;
              const currentCompletions = vData?.completed_tasks || 0;
              transaction.update(pRef, { points: currentPoints + 150 });
              transaction.update(vRef, { completed_tasks: currentCompletions + 1, available: true, current_task_id: null });
            });
            await checkAndAwardBadges(uId);
          }
        })
      );

      // Award citizen
      const citizenRef = doc(db, "profiles", user!.uid);
      await runTransaction(db, async (transaction) => {
        const pSnap = await transaction.get(citizenRef);
        const currentPoints = pSnap.data()?.points || 0;
        transaction.update(citizenRef, { points: currentPoints + 50 });
      });
      await checkAndAwardBadges(user!.uid);

      // Award NGO
      if (ngoUserToAward && reqDbId) {
        const ngoProfileRef = doc(db, "profiles", ngoUserToAward);
        const ngoRef = doc(db, "ngos", reqDbId);
        await runTransaction(db, async (transaction) => {
          const pSnap = await transaction.get(ngoProfileRef);
          const currentPoints = pSnap.exists() ? pSnap.data().points || 0 : 0;
          transaction.update(ngoProfileRef, { points: currentPoints + 100 });
          const nSnap = await transaction.get(ngoRef);
          const currentComps = nSnap.exists() ? nSnap.data().completed_tasks || 0 : 0;
          transaction.update(ngoRef, { completed_tasks: currentComps + 1 });
        });
        await checkAndAwardBadges(ngoUserToAward);
      }
    }
  }, [user, checkAndAwardBadges]);

  // ── Remaining CRUD actions ────────────────────────────────────────────────

  const assignVolunteer = useCallback(async (requestId: string, volunteerId: string) => {
    await updateDoc(doc(db, "emergency_requests", requestId), {
      status: "Volunteer assigned",
      assigned_volunteer_id: volunteerId,
      team_leader_volunteer_id: volunteerId,
      assigned_volunteer_ids: arrayUnion(volunteerId),
      updated_at: serverTimestamp(),
    });
  }, []);

  const volunteerAdvance = useCallback(async (requestId: string, status: string) => {
    await updateDoc(doc(db, "emergency_requests", requestId), { status, updated_at: serverTimestamp() });
  }, []);

  const approveVolunteer = useCallback(async (vId: string) => {
    const ngo = ngos.find((n) => n.userId === user?.uid);
    if (!ngo) return;
    const vRef = doc(db, "volunteers", vId);
    const vSnap = await getDoc(vRef);
    if (vSnap.exists()) {
      const ms = vSnap.data().ngo_memberships || {};
      ms[ngo.id] = "approved";
      await updateDoc(vRef, { ngo_memberships: ms });
      await createNotification(vSnap.data().user_id, "NGO Membership Approved! 🎉", `${ngo.ngoName} has approved your join request.`, "info");
    }
  }, [user, ngos, createNotification]);

  const rejectVolunteer = useCallback(async (vId: string) => {
    const ngo = ngos.find((n) => n.userId === user?.uid);
    if (!ngo) return;
    const vRef = doc(db, "volunteers", vId);
    const vSnap = await getDoc(vRef);
    if (vSnap.exists()) {
      const ms = vSnap.data().ngo_memberships || {};
      delete ms[ngo.id];
      await updateDoc(vRef, { ngo_memberships: ms });
    }
  }, [user, ngos]);

  const completeRequest = useCallback(async (id: string) => {
    await updateDoc(doc(db, "emergency_requests", id), { status: "Completed", updated_at: serverTimestamp() });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await signIn(email, password);
    return true;
  }, [signIn]);

  const joinTask = useCallback(async (requestId: string) => {
    if (!profile || profile.role !== "volunteer" || !user) return;
    const vol = volunteers.find((v) => v.userId === user.uid);
    if (!vol) return;
    await addDoc(collection(db, "emergency_requests", requestId, "assignments"), {
      volunteer_id: vol.id,
      status: "assigned",
      is_leader: false,
      created_at: serverTimestamp(),
    });
    await updateDoc(doc(db, "volunteers", vol.id), { current_task_id: requestId, available: false });
  }, [profile, user, volunteers]);

  const register = useCallback(async (data: any) => {
    const metadata: Record<string, string> = {
      full_name: data.fullName || data.ngoName || "",
      role: data.role || "citizen",
    };
    await signUp(data.email, data.password, metadata);

    const newUser = auth.currentUser;
    if (newUser) {
      if (metadata.role === "volunteer") {
        const initialMemberships: Record<string, string> = {};
        (data.ngoIds || []).forEach((id: string) => { initialMemberships[id] = "pending"; });
        await setDoc(doc(db, "volunteers", newUser.uid), {
          user_id: newUser.uid,
          available: true,
          skills: Array.isArray(data.skills)
            ? data.skills
            : typeof data.skills === "string"
            ? data.skills.split(",").map((s: string) => s.trim()).filter(Boolean)
            : [],
          ngo_memberships: initialMemberships,
          completed_tasks: 0,
          created_at: serverTimestamp(),
        });
      } else if (metadata.role === "ngo") {
        await setDoc(doc(db, "ngos", newUser.uid), {
          user_id: newUser.uid,
          ngo_name: metadata.full_name,
          services: [],
          capacity: 10,
          created_at: serverTimestamp(),
        });
      }
    }
    return true;
  }, [signUp]);

  const toggleAvailable = useCallback(async () => {
    if (!profile || profile.role !== "volunteer") return;
    const nextValue = !isAvailable;
    setIsToggling(true);
    setIsAvailable(nextValue);
    const volRef = doc(db, "volunteers", user!.uid);
    try {
      await updateDoc(volRef, { available: nextValue });
    } catch (e) {
      setIsAvailable(!nextValue);
    }
    setIsToggling(false);
  }, [isAvailable, profile, user]);

  const toggleFollow = useCallback(async (targetId: string, type: "ngo" | "volunteer") => {
    if (!user) return;
    const q = query(
      collection(db, "user_follows"),
      where("user_id", "==", user.uid),
      where("target_id", "==", targetId)
    );
    const snap = await getDocs(q);
    const collectionName = type === "ngo" ? "ngos" : "volunteers";
    const targetRef = doc(db, collectionName, targetId);
    if (!snap.empty) {
      await deleteDoc(snap.docs[0].ref);
      await updateDoc(targetRef, { followers_count: increment(-1) }).catch(() => {});
    } else {
      await addDoc(collection(db, "user_follows"), {
        user_id: user.uid,
        target_id: targetId,
        type,
        created_at: serverTimestamp(),
      });
      await updateDoc(targetRef, { followers_count: increment(1) }).catch(() => {});
    }
  }, [user]);

  const logout = useCallback(async () => {
    await signOut();
    setProfile(null);
  }, [signOut]);

  // ── Context value ─────────────────────────────────────────────────────────

  const value = useMemo(
    () => ({
      loading: authLoading || dataLoading,
      location,
      requests,
      activeRequests,
      nearbyRequests,
      myRequests,
      myAssignedRequests,
      volunteers,
      ngos,
      priorityZones,
      currentUser: profile,
      isAuthenticated,
      emergencyMode,
      isAvailable,
      isToggling,
      followingList,
      toggleFollow,
      toggleAvailable,
      joinTask,
      createEmergency,
      autoAssignVolunteers,
      handleVolunteerShortage,
      acknowledgeAssignment,
      acceptRequest,
      assignVolunteer,
      volunteerAdvance,
      completeRequest,
      rejectTask,
      citizenFinalize,
      approveVolunteer,
      rejectVolunteer,
      createNotification,
      login,
      register,
      logout,
      resetPassword,
      setEmergencyMode,
    }),
    [
      authLoading, dataLoading, requests, activeRequests, nearbyRequests,
      myRequests, myAssignedRequests, volunteers, ngos, priorityZones,
      profile, isAuthenticated, emergencyMode, isAvailable, isToggling,
      followingList, createEmergency, autoAssignVolunteers, handleVolunteerShortage,
      acknowledgeAssignment, acceptRequest, assignVolunteer, volunteerAdvance,
      completeRequest, rejectTask, citizenFinalize, login, register, logout, resetPassword,
      toggleFollow, toggleAvailable, joinTask, approveVolunteer, rejectVolunteer,
      createNotification,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
