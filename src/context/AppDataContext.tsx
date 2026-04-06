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
  runTransaction
} from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import type { GeoPoint } from "../utils/geo";
import { haversineDistance } from "../utils/geo";
import { buildPriorityZones, calculatePriorityScore, getUrgencyValue, getSeverityValue } from "../utils/analytics";
import { smartAnalyzeRequest, generateMissionBrief } from "@/lib/gemini";
import { getEarnedBadges } from "../utils/badges";

// Types
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
  volunteers: Volunteer[];
  ngos: Ngo[];
  priorityZones: any[];
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  isAvailable: boolean;
  toggleAvailable: () => Promise<void>;
  joinTask: (requestId: string) => Promise<void>;
  createEmergency: (data: Record<string, any>) => Promise<string>;
  acceptRequest: (id: string) => Promise<void>;
  assignVolunteer: (requestId: string, volunteerId: string) => Promise<void>;
  autoAssignVolunteers: (requestId: string, isGlobal?: boolean) => Promise<void>;
  volunteerAdvance: (requestId: string, status: string) => Promise<void>;
  completeRequest: (id: string) => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: any) => Promise<boolean>;
  logout: () => Promise<void>;
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

function toGeo(lat: number | null, lng: number | null): GeoPoint | null {
  return lat != null && lng != null ? { lat, lng } : null;
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [ngos, setNgos] = useState<Ngo[]>([]);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [location, setLocation] = useState<GeoPoint | null>(FALLBACK_LOCATION);

  const isAuthenticated = user !== null;

  // Real browser geolocation
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}, // keep fallback on error
      { enableHighAccuracy: true, timeout: 10000 }
    );
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Sync Profile and Data
  useEffect(() => {
    if (!user) { 
      setProfile(null); 
      setRequests([]); 
      setVolunteers([]); 
      setNgos([]);
      setDataLoading(false);
      return; 
    }

    // 1. Listen to Profile
    const profileRef = doc(db, "profiles", user.uid);
    const unsubscribeProfile = onSnapshot(profileRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        // Fetch badges (from subcollection)
        const badgesRef = collection(db, "profiles", user.uid, "badges");
        const badgeSnaps = await getDocs(badgesRef);
        const badgeIds = badgeSnaps.docs.map(d => d.id);

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

    // 2. Listen to Requests
    const requestsRef = collection(db, "emergency_requests");
    const qRequests = query(requestsRef, orderBy("created_at", "desc"));
    const unsubscribeRequests = onSnapshot(qRequests, (snapshot) => {
      setRequests(snapshot.docs.map(d => {
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
      }));
    }, (err) => console.error("Requests listener error:", err));

    // 3. Listen to Volunteers
    const volunteersRef = collection(db, "volunteers");
    const unsubscribeVolunteers = onSnapshot(volunteersRef, async (snapshot) => {
      const volData = await Promise.all(snapshot.docs.map(async d => {
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
          skills: v.skills || [],
          location: toGeo(v.location_lat, v.location_lng),
          available: v.available ?? true,
          trustScore: pData.trust_score ?? 4.5,
          completedTasks: v.completed_tasks || 0,
          currentTaskId: v.current_task_id,
          ngoMemberships: v.ngo_memberships || {},
        };
      }));
      setVolunteers(volData);
    }, (err) => console.error("Volunteers listener error:", err));

    return () => {
      unsubscribeProfile();
      unsubscribeRequests();
      unsubscribeVolunteers();
    };
  }, [user]);

  // 4. Listen to NGOs (Publicly available for registration)
  useEffect(() => {
    const ngosRef = collection(db, "ngos");
    const unsubscribeNgos = onSnapshot(ngosRef, async (snapshot) => {
      const ngoData = await Promise.all(snapshot.docs.map(async d => {
        const n = d.data();
        const pRef = doc(db, "profiles", n.user_id);
        const pSnap = await getDoc(pRef);
        const pData = pSnap.exists() ? pSnap.data() : {};

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
        };
      }));
      setNgos(ngoData);
      console.log(`Loaded ${ngoData.length} public NGOs for registration.`);
      setDataLoading(false);
    }, (err) => {
      console.error("NGOs listener error:", err);
      if (err.code === "permission-denied") {
        console.warn("NGO list access denied. Please check Firestore security rules for the 'ngos' collection.");
      }
      setDataLoading(false);
    });

    return () => unsubscribeNgos();
  }, []);

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

  const priorityZones = useMemo(() => buildPriorityZones([], requests), [requests]);

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

  const autoAssignVolunteers = useCallback(async (requestId: string, isGlobal: boolean = false) => {
    const reqRef = doc(db, "emergency_requests", requestId);
    const reqSnap = await getDoc(reqRef);
    if (!reqSnap.exists()) return;
    const reqData = reqSnap.data();

    if (!isGlobal && !reqData.ngo_id) {
       console.log("Waiting for an NGO to accept the request before assigning volunteers.");
       return; 
    }

    // Query online volunteers
    const vQuery = query(collection(db, "volunteers"), where("available", "==", true));
    const vSnapshot = await getDocs(vQuery);
    
    if (vSnapshot.empty) {
      console.warn("No available volunteers found for assignment.");
      // In real escalations, we could potentially alert offline users via push here.
      return;
    }

    const volDataRaw = await Promise.all(vSnapshot.docs.map(async d => {
      const v = d.data();
      const pSnap = await getDoc(doc(db, "profiles", v.user_id));
      return { 
        id: d.id, 
        ...v, 
        name: pSnap.exists() ? (pSnap.data().full_name || "Volunteer") : "Volunteer",
        skills: v.skills || [],
        trustScore: pSnap.exists() ? (pSnap.data().trust_score || 0) : 0 
      };
    }));

    // Filter by NGO if not escalating globally
    const volData = isGlobal ? volDataRaw : volDataRaw.filter((v: any) => v.ngo_memberships?.[reqData.ngo_id] === "approved");

    if (volData.length === 0) {
      console.warn("No approved volunteers exist within this NGO. Wait for escalation or manual override.");
      return;
    }

    const reqLoc = toGeo(reqData.location_lat, reqData.location_lng);
    if (!reqLoc) return;

    // AI ANALYSIS (Primary)
    let aiMatch = null;
    try {
      aiMatch = await smartAnalyzeRequest(
        { category: reqData.category, urgency: reqData.urgency, description: reqData.description },
        volData
      );
    } catch (e) {
      console.error("AI Smart Match failed, falling back to proximity.", e);
    }

    // Rank volunteers (AI + Proximity Hybrid)
    const ranked = volData.map((v: any) => {
      const vLoc = toGeo(v.location_lat, v.location_lng);
      const dist = haversineDistance(reqLoc, vLoc);
      const proximityScore = dist != null ? Math.max(0, 1 - dist/20) : 0;
      
      // Use AI ranking if available, otherwise trust score
      const aiScore = aiMatch?.volunteerRankings?.[v.id] ?? (v.trustScore / 5);
      
      const totalScore = (aiScore * 0.7) + (proximityScore * 0.3);
      return { ...v, totalScore, dist };
    }).sort((a: any, b: any) => b.totalScore - a.totalScore);

    const needed = reqData.volunteers_needed || 1;
    const toAssign = ranked.slice(0, needed);
    if (toAssign.length === 0) return;

    // Team Leader = highest trustScore among the chosen group
    const leaderData = [...toAssign].sort((a: any, b: any) => b.trustScore - a.trustScore)[0];
    const leaderId = leaderData.id;
    const leaderName = leaderData.name;

    // Generate Mission Brief (AI)
    let missionBrief = "";
    if (aiMatch) {
      missionBrief = await generateMissionBrief(
        { category: reqData.category, description: reqData.description, citizenName: reqData.citizen_name },
        leaderName,
        aiMatch.reasoning
      );
    }

    // Perform updates in a batch/transaction
    await runTransaction(db, async (transaction) => {
      toAssign.forEach(v => {
        const vRef = doc(db, "volunteers", v.id);
        transaction.update(vRef, { available: false, current_task_id: requestId });
        
        const assignRef = doc(collection(db, "emergency_requests", requestId, "assignments"), v.id);
        transaction.set(assignRef, { 
          volunteer_id: v.id, 
          status: "assigned", 
          created_at: serverTimestamp() 
        });
      });

      transaction.update(reqRef, {
        status: "Volunteer assigned",
        assigned_volunteer_id: leaderId,
        volunteer_name: leaderName,
        eta: toAssign[0].dist ? Math.round(toAssign[0].dist * 8) : 5, // 8 mins per km estimate
        team_leader_volunteer_id: leaderId,
        ai_mission_brief: missionBrief,
        ai_analysis_reason: aiMatch?.reasoning || "Matched based on proximity and trust score.",
        ai_suggested_steps: aiMatch?.suggestedSteps || [],
        priority_score: aiMatch?.priorityAdjusted ? (reqData.priority_score * 1.5) : reqData.priority_score,
        updated_at: serverTimestamp()
      });
    });

    // Notify Volunteers
    await Promise.all(toAssign.map(v => 
      createNotification(v.userId, "New Mission Assigned", `You have been dispatched to a ${reqData.category} emergency. Check your dashboard.`, "request_accepted")
    ));
  }, []);

  const createEmergency = useCallback(async (data: Record<string, any>) => {
    const ps = calculatePriorityScore({
      averageUrgency: getUrgencyValue(data.urgency),
      severity: getSeverityValue(data.category),
      totalReports: 1,
      recentReports: 1,
    });

    const docRef = await addDoc(collection(db, "emergency_requests"), {
      user_id: user!.uid,
      category: data.category,
      urgency: data.urgency,
      description: data.description,
      location_lat: location?.lat ?? null,
      location_lng: location?.lng ?? null,
      citizen_name: profile?.name || "",
      priority_score: ps,
      status: "Created",
      people_affected: data.people_affected ? parseInt(data.people_affected) || null : null,
      volunteers_needed: data.volunteers_needed || 1,
      created_at: serverTimestamp(),
      updated_at: serverTimestamp(),
    });

    // Do NOT auto-assign instantly. Wait for NGO acceptance.
    return docRef.id;
  }, [user, profile, location, autoAssignVolunteers]);

  const acceptRequest = useCallback(async (id: string) => {
    const ngo = ngos.find((n) => n.userId === user?.uid);
    if (!ngo) return;

    const request = requests.find(r => r.id === id);
    if (!request) return;

    await updateDoc(doc(db, "emergency_requests", id), {
      status: "Accepted",
      ngo_id: ngo.id,
      ngo_name: ngo.ngoName,
      updated_at: serverTimestamp()
    });

    // Notify Citizen
    await createNotification(request!.userId, "Request Accepted", `${ngo.ngoName} is now handling your emergency.`, "request_accepted");
    
    await autoAssignVolunteers(id);
  }, [user, ngos, autoAssignVolunteers]);

  const rejectTask = useCallback(async (requestId: string) => {
    if (!profile || !user) return;
    const vol = volunteers.find(v => v.userId === user.uid);
    if (!vol) return;

    await runTransaction(db, async (transaction) => {
      const assignRef = doc(db, "emergency_requests", requestId, "assignments", vol.id);
      transaction.delete(assignRef);
      
      const vRef = doc(db, "volunteers", vol.id);
      transaction.update(vRef, { available: true, current_task_id: null });
    });

    await autoAssignVolunteers(requestId);
  }, [profile, user, volunteers, autoAssignVolunteers]);

  const checkAndAwardBadges = useCallback(async (userId: string) => {
    try {
      const pRef = doc(db, "profiles", userId);
      const pSnap = await getDoc(pRef);
      if (!pSnap.exists()) return;
      const pData = pSnap.data();

      // Calculate simplified stats for badge logic
      let completedCount = 0;
      if (pData.role === "volunteer") {
        const vSnap = await getDoc(doc(db, "volunteers", userId));
        completedCount = vSnap.data()?.completed_tasks || 0;
      } else {
        const q = query(collection(db, "emergency_requests"), where("user_id", "==", userId), where("status", "==", "Completed"));
        const snap = await getDocs(q);
        completedCount = snap.size;
      }

      const stats = {
        completedTasks: completedCount,
        avgResponseMinutes: null,
        uniqueAreas: 1,
        criticalTasks: 0,
        highImpactTasks: 0,
        isTopPercentile: false
      };

      const earned = getEarnedBadges(stats);
      const currentBadgesRef = collection(db, "profiles", userId, "badges");
      
      for (const badge of earned) {
        const bRef = doc(currentBadgesRef, badge.id);
        const bSnap = await getDoc(bRef);
        if (!bSnap.exists()) {
           await setDoc(bRef, {
             earned_at: serverTimestamp(),
             badge_name: badge.name
           });
           await createNotification(userId, "New Badge Earned! 🏆", `You've earned the "${badge.name}" badge. Check your profile.`, "badge");
        }
      }
    } catch (e) {
      console.error("Error awarding badges:", e);
    }
  }, []);

  const citizenFinalize = useCallback(async (requestId: string, approved: boolean, feedback?: string, rating?: number) => {
    const status = approved ? "Completed" : "Cancelled";
    await updateDoc(doc(db, "emergency_requests", requestId), {
      status,
      citizen_approved: approved,
      citizen_feedback: feedback || "",
      rating: rating || null,
      completed_at: approved ? new Date().toISOString() : null,
      updated_at: serverTimestamp()
    });

    if (approved) {
      // Award points & Badges
      const q = query(collection(db, "emergency_requests", requestId, "assignments"));
      const snaps = await getDocs(q);
      await Promise.all(snaps.docs.map(async d => {
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
             
             transaction.update(pRef, { points: currentPoints + 150 }); // Higher points
             transaction.update(vRef, { completed_tasks: currentCompletions + 1, available: true, current_task_id: null });
          });
          
          await checkAndAwardBadges(uId);
        }
      }));

      // Award Citizen
      const citizenRef = doc(db, "profiles", user!.uid);
      await runTransaction(db, async (transaction) => {
        const pSnap = await transaction.get(citizenRef);
        const currentPoints = pSnap.data()?.points || 0;
        transaction.update(citizenRef, { points: currentPoints + 50 });
      });
      await checkAndAwardBadges(user!.uid);
    }
  }, []);

  const assignVolunteer = useCallback(async (requestId: string, volunteerId: string) => {
    await updateDoc(doc(db, "emergency_requests", requestId), {
      status: "Volunteer assigned",
      assigned_volunteer_id: volunteerId,
      team_leader_volunteer_id: volunteerId,
      updated_at: serverTimestamp()
    });
  }, []);

  const volunteerAdvance = useCallback(async (requestId: string, status: string) => {
    await updateDoc(doc(db, "emergency_requests", requestId), { status, updated_at: serverTimestamp() });
  }, []);

  const approveVolunteer = useCallback(async (vId: string) => {
    const ngo = ngos.find(n => n.userId === user?.uid);
    if (!ngo) return;
    const vRef = doc(db, "volunteers", vId);
    const vSnap = await getDoc(vRef);
    if (vSnap.exists()) {
      const ms = vSnap.data().ngo_memberships || {};
      ms[ngo.id] = "approved";
      await updateDoc(vRef, { ngo_memberships: ms });
      await createNotification(vSnap.data().user_id, "NGO Membership Approved! 🎉", `${ngo.ngoName} has officially approved your join request.`, "info");
    }
  }, [user, ngos, createNotification]);

  const rejectVolunteer = useCallback(async (vId: string) => {
    const ngo = ngos.find(n => n.userId === user?.uid);
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
    const vol = volunteers.find(v => v.userId === user.uid);
    if (!vol) return;

    await addDoc(collection(db, "emergency_requests", requestId, "assignments"), {
       volunteer_id: vol.id,
       status: "assigned",
       created_at: serverTimestamp()
    });
    
    await updateDoc(doc(db, "volunteers", vol.id), {
       current_task_id: requestId,
       available: false
    });
  }, [profile, user, volunteers]);

  const register = useCallback(async (data: any) => {
    const metadata: Record<string, string> = {
      full_name: data.fullName || data.ngoName || "",
      role: data.role || "citizen",
    };
    await signUp(data.email, data.password, metadata);

    // If role is volunteer or ngo, create their extra record
    const newUser = auth.currentUser;
    if (newUser) {
      if (metadata.role === "volunteer") {
        const initialMemberships: Record<string, string> = {};
        (data.ngoIds || []).forEach((id: string) => {
          initialMemberships[id] = "pending";
        });

        await setDoc(doc(db, "volunteers", newUser.uid), {
          user_id: newUser.uid,
          available: true,
          skills: data.skills || [],
          ngo_memberships: initialMemberships,
          completed_tasks: 0,
          created_at: serverTimestamp()
        });
      } else if (metadata.role === "ngo") {
        await setDoc(doc(db, "ngos", newUser.uid), {
          user_id: newUser.uid,
          ngo_name: metadata.full_name,
          services: [],
          capacity: 10,
          created_at: serverTimestamp()
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

  const logout = useCallback(async () => {
    await signOut();
    setProfile(null);
  }, [signOut]);

  const value = useMemo(() => ({
    loading: authLoading || dataLoading,
    location,
    requests,
    activeRequests,
    nearbyRequests,
    myRequests,
    volunteers,
    ngos,
    priorityZones,
    currentUser: profile,
    isAuthenticated,
    emergencyMode,
    isAvailable,
    isToggling,
    toggleAvailable,
    joinTask,
    createEmergency,
    autoAssignVolunteers,
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
    setEmergencyMode,
  }), [authLoading, dataLoading, requests, activeRequests, nearbyRequests, myRequests, volunteers, ngos, priorityZones, profile, isAuthenticated, emergencyMode, isAvailable, isToggling, createEmergency, autoAssignVolunteers, acceptRequest, assignVolunteer, volunteerAdvance, completeRequest, rejectTask, citizenFinalize, login, register, logout]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
