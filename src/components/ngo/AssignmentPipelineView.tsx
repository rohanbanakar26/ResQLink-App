import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Zap, Crown, Users, Radio, Loader2,
  MapPin, Star, Shield, ChevronRight, Bell,
} from "lucide-react";
import { db } from "@/lib/firebase";
import {
  collection, onSnapshot, query, orderBy, doc, getDoc,
} from "firebase/firestore";
import { useAppData } from "../../context/AppDataContext";
import type { EmergencyRequest } from "../../context/AppDataContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { haversineDistance } from "../../utils/geo";

interface AssignedVolunteerInfo {
  id: string;
  name: string;
  trustScore: number;
  distKm: number | null;
  isLeader: boolean;
  ngoId: string;
  status: string;
}

interface Props {
  request: EmergencyRequest;
  onClose?: () => void;
}

const PIPELINE_STEPS = [
  { id: "accepted",   label: "Request Accepted by NGO",       icon: CheckCircle2 },
  { id: "scanning",   label: "Scanning volunteer pool",       icon: Radio },
  { id: "ranking",    label: "Ranking by proximity & trust",  icon: Star },
  { id: "electing",   label: "Electing Team Leader",          icon: Crown },
  { id: "notifying",  label: "Sending mission alerts",        icon: Bell },
  { id: "complete",   label: "Team Dispatched",               icon: Zap },
];

function getStepIndex(status: string): number {
  if (status === "Created" || status === "Requested") return -1;
  // "Accepted" means NGO accepted + system is actively running ranking & assignment
  if (status === "Accepted") return 2;
  // "Escalating" means ranking ran but timed out, now escalating globally
  if (status === "Escalating") return 2;
  // "Awaiting more volunteers" means ranking done, shortage cascade is active
  if (status === "Awaiting more volunteers") return 3;
  // Once volunteers are assigned, all steps are complete
  if (status === "Volunteer assigned") return 5;
  if (status === "On the way" || status === "In progress" || status === "In Progress" || status === "Team is ready") return 5;
  if (status === "Completed") return 5;
  // Default fallback for any unexpected intermediate state
  return 2;
}

export default function AssignmentPipelineView({ request, onClose }: Props) {
  const { volunteers, ngos, location } = useAppData();
  const [assignedVolunteers, setAssignedVolunteers] = useState<AssignedVolunteerInfo[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);

  // Real-time listener on the assignments subcollection
  useEffect(() => {
    const assignmentsRef = collection(db, "emergency_requests", request.id, "assignments");
    const q = query(assignmentsRef, orderBy("created_at", "asc"));

    const unsub = onSnapshot(q, async (snap) => {
      const items = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();
          const volId = data.volunteer_id;

          const vol = volunteers.find((v) => v.id === volId);
          let name = vol?.name || "Volunteer";
          let trustScore = vol?.trustScore || 0;
          let distKm: number | null = null;

          if (!vol) {
            try {
              const vSnap = await getDoc(doc(db, "volunteers", volId));
              if (vSnap.exists()) {
                const pSnap = await getDoc(doc(db, "profiles", vSnap.data().user_id));
                name = pSnap.exists() ? pSnap.data().full_name || "Volunteer" : "Volunteer";
                trustScore = pSnap.exists() ? pSnap.data().trust_score || 0 : 0;
              }
            } catch (_) {}
          } else {
            distKm = haversineDistance(request.location, vol.location);
          }

          return {
            id: volId,
            name,
            trustScore,
            distKm,
            isLeader: data.is_leader === true || volId === request.teamLeaderVolunteerId,
            ngoId: data.ngo_id || "",
            status: data.status || "assigned",
          };
        })
      );
      // Leader always first
      items.sort((a, b) => (b.isLeader ? 1 : 0) - (a.isLeader ? 1 : 0));
      setAssignedVolunteers(items);
      setLoadingAssignments(false);
    });

    return () => unsub();
  }, [request.id, request.location, request.teamLeaderVolunteerId, volunteers]);

  const currentStep = getStepIndex(request.status);
  const isShortage = request.status === "Awaiting more volunteers";
  const totalNeeded = request.volunteersNeeded || 1;
  const totalFilled = assignedVolunteers.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-black text-foreground flex items-center gap-2">
          <Zap className="w-4 h-4 text-warning" />
          Assignment Pipeline
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            {totalFilled}/{totalNeeded} volunteers
          </Badge>
          {isShortage && (
            <Badge className="bg-warning/20 text-warning border-warning/30 text-[10px] animate-pulse">
              Cascading to next NGO…
            </Badge>
          )}
        </div>
      </div>

      {/* Step Progress */}
      <div className="space-y-1">
        {PIPELINE_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isDone = idx <= currentStep;
          const isActive = idx === currentStep + 1;

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08 }}
              className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                isDone
                  ? "bg-success/5 border border-success/20"
                  : isActive
                  ? "bg-info/5 border border-info/20"
                  : "bg-muted/10 border border-transparent opacity-40"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  isDone ? "bg-success/20 text-success" : isActive ? "bg-info/20 text-info" : "bg-muted/20 text-muted-foreground"
                }`}
              >
                {isActive ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
              </div>
              <span className={`text-xs font-bold ${isDone ? "text-foreground" : "text-muted-foreground"}`}>
                {step.label}
              </span>
              {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-success ml-auto" />}
            </motion.div>
          );
        })}
      </div>

      {/* Multi-NGO Participating NGOs */}
      {(request.participatingNgoIds || []).length > 1 && (
        <Card className="border-info/20 bg-info/5">
          <CardContent className="p-3 space-y-1">
            <p className="text-[10px] font-black text-info uppercase mb-2 flex items-center gap-1">
              <Users className="w-3 h-3" /> Multi-NGO Team
            </p>
            {(request.participatingNgoIds || []).map((ngoId) => {
              const ngo = ngos.find((n) => n.id === ngoId);
              const contribCount = assignedVolunteers.filter((v) => v.ngoId === ngoId).length;
              return (
                <div key={ngoId} className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-foreground">{ngo?.ngoName || ngoId}</span>
                  <Badge variant="outline" className="text-[8px]">{contribCount} volunteer(s)</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Assigned Team */}
      <div className="space-y-2">
        <p className="text-[10px] font-black text-muted-foreground uppercase flex items-center gap-1">
          <Users className="w-3 h-3" /> Assigned Team
        </p>

        {loadingAssignments ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-4 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading team members…
          </div>
        ) : assignedVolunteers.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No volunteers assigned yet.
          </p>
        ) : (
          <AnimatePresence>
            {assignedVolunteers.map((vol, i) => (
              <motion.div
                key={vol.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`flex items-center gap-3 p-3 rounded-xl border ${
                  vol.isLeader
                    ? "bg-warning/5 border-warning/20"
                    : "bg-muted/10 border-border/30"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    vol.isLeader ? "bg-warning/20" : "bg-muted/30"
                  }`}
                >
                  {vol.isLeader ? (
                    <Crown className="w-4 h-4 text-warning" />
                  ) : (
                    <Shield className="w-4 h-4 text-info" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">{vol.name}</p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>⭐ {vol.trustScore.toFixed(1)}</span>
                    {vol.distKm != null && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-2.5 h-2.5" />
                        {vol.distKm.toFixed(1)} km
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {vol.isLeader && (
                    <Badge className="bg-warning/20 text-warning border-warning/30 text-[8px]">LEADER</Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={`text-[8px] ${
                      vol.status === "acknowledged"
                        ? "border-success/30 text-success"
                        : "border-border/30 text-muted-foreground"
                    }`}
                  >
                    {vol.status === "acknowledged" ? "On the way" : "Assigned"}
                  </Badge>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}

        {/* Unfilled slots indicator */}
        {totalNeeded > totalFilled &&
          Array.from({ length: totalNeeded - totalFilled }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-border/40 opacity-50"
            >
              <div className="w-8 h-8 rounded-full bg-muted/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Awaiting volunteer…</p>
            </div>
          ))}
      </div>
    </div>
  );
}
