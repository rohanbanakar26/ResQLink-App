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
  skills: string[];
  location: GeoPoint | null;
  available: boolean;
  trustScore: number;
  completedTasks: number;
  distanceKm?: number | null;
  currentTaskId?: string | null;
}

export interface Ngo {
  id: string;
  userId: string;
  ngoName: string;
  email: string;
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
  volunteerAdvance: (requestId: string, status: string) => Promise<void>;
  completeRequest: (id: string) => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: any) => Promise<boolean>;
  logout: () => Promise<void>;
  setEmergencyMode: (v: boolean) => void;
  isToggling: boolean;
  rejectTask: (requestId: string) => Promise<void>;
  citizenFinalize: (requestId: string, approved: boolean, feedback?: string, rating?: number) => Promise<void>;
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
          skills: v.skills || [],
          location: toGeo(v.location_lat, v.location_lng),
          available: v.available ?? true,
          trustScore: pData.trust_score ?? 4.5,
          completedTasks: v.completed_tasks || 0,
          currentTaskId: v.current_task_id,
        };
      }));
      setVolunteers(volData);
    }, (err) => console.error("Volunteers listener error:", err));

    // 4. Listen to NGOs
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
          services: n.services || [],
          location: toGeo(n.location_lat, n.location_lng),
          trustScore: pData.trust_score ?? 4.5,
          capacity: n.capacity || 10,
        };
      }));
      setNgos(ngoData);
      // Data is considered "ready" once the initial metadata listeners resolve
      setDataLoading(false);
    }, (err) => {
      console.error("NGOs listener error:", err);
      setDataLoading(false);
    });

    return () => {
      unsubscribeProfile();
      unsubscribeRequests();
      unsubscribeVolunteers();
      unsubscribeNgos();
    };
  }, [user]);

  const activeRequests = useMemo(() => requests.filter((r) => r.status !== "Completed"), [requests]);

  const nearbyRequests = useMemo(() => {
    return activeRequests
      .map((r) => ({ ...r, distanceKm: haversineDistance(location, r.location) }))
      .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  }, [activeRequests, location]);

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

    return docRef.id;
  }, [user, profile, location]);

  const autoAssignVolunteers = useCallback(async (requestId: string) => {
    const reqRef = doc(db, "emergency_requests", requestId);
    const reqSnap = await getDoc(reqRef);
    if (!reqSnap.exists()) return;
    const reqData = reqSnap.data();

    // Query online volunteers
    const vQuery = query(collection(db, "volunteers"), where("available", "==", true));
    const vSnapshot = await getDocs(vQuery);
    
    if (vSnapshot.empty) return;

    const volData = await Promise.all(vSnapshot.docs.map(async d => {
      const v = d.data();
      const pSnap = await getDoc(doc(db, "profiles", v.user_id));
      return { id: d.id, ...v, trustScore: pSnap.exists() ? (pSnap.data().trust_score || 0) : 0 };
    }));

    const reqLoc = toGeo(reqData.location_lat, reqData.location_lng);
    if (!reqLoc) return;

    // Rank volunteers
    const ranked = volData.map((v: any) => {
      const vLoc = toGeo(v.location_lat, v.location_lng);
      const dist = haversineDistance(reqLoc, vLoc);
      const proximityScore = dist != null ? Math.max(0, 1 - dist/20) : 0;
      const trustScore = v.trustScore / 5;
      const totalScore = (trustScore * 0.7) + (proximityScore * 0.3);
      return { ...v, totalScore };
    }).sort((a: any, b: any) => b.totalScore - a.totalScore);

    const needed = reqData.volunteers_needed || 1;
    const toAssign = ranked.slice(0, needed);
    if (toAssign.length === 0) return;

    const leaderId = toAssign[0].id;

    // Perform updates in a batch/transaction
    await runTransaction(db, async (transaction) => {
      toAssign.forEach(v => {
        const vRef = doc(db, "volunteers", v.id);
        transaction.update(vRef, { available: false, current_task_id: requestId });
        
        const assignRef = doc(collection(db, "emergency_requests", requestId, "assignments"), v.id);
        transaction.set(assignRef, { volunteer_id: v.id, status: "assigned", created_at: serverTimestamp() });
      });

      transaction.update(reqRef, {
        status: "Volunteer assigned",
        assigned_volunteer_id: leaderId,
        team_leader_volunteer_id: leaderId,
        updated_at: serverTimestamp()
      });
    });
  }, []);

  const acceptRequest = useCallback(async (id: string) => {
    const ngo = ngos.find((n) => n.userId === user?.uid);
    if (!ngo) return;

    await updateDoc(doc(db, "emergency_requests", id), {
      status: "Accepted",
      ngo_id: ngo.id,
      ngo_name: ngo.ngoName,
      updated_at: serverTimestamp()
    });
    
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
      // Award points (in-app logic)
      const q = query(collection(db, "emergency_requests", requestId, "assignments"));
      const snaps = await getDocs(q);
      await Promise.all(snaps.docs.map(async d => {
        const vId = d.data().volunteer_id;
        // Fetch volunteer's profile to get user_id
        const vSnap = await getDoc(doc(db, "volunteers", vId));
        if (vSnap.exists()) {
          const uId = vSnap.data().user_id;
          const pRef = doc(db, "profiles", uId);
          await runTransaction(db, async (transaction) => {
             const pSnap = await transaction.get(pRef);
             const currentPoints = pSnap.data()?.points || 0;
             transaction.update(pRef, { points: currentPoints + 50 });
          });
        }
      }));
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
        await setDoc(doc(db, "volunteers", newUser.uid), {
          user_id: newUser.uid,
          available: true,
          skills: [],
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
    acceptRequest,
    assignVolunteer,
    volunteerAdvance,
    completeRequest,
    rejectTask,
    citizenFinalize,
    login,
    register,
    logout,
    setEmergencyMode,
  }), [authLoading, dataLoading, requests, activeRequests, nearbyRequests, myRequests, volunteers, ngos, priorityZones, profile, isAuthenticated, emergencyMode, isAvailable, isToggling, createEmergency, acceptRequest, assignVolunteer, volunteerAdvance, completeRequest, rejectTask, citizenFinalize, login, register, logout]);

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
