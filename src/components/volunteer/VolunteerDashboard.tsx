import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, MapPin, Zap, ShieldCheck, Clock, AlertTriangle,
  X, LayoutDashboard, Crown, Shield, Bell, ChevronRight,
  MessageSquare, Phone, Navigation,
} from "lucide-react";
import { useAppData } from "../../context/AppDataContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getCategoryMeta, STATUS_COLORS } from "../../data/system";
import TaskDetailView from "./TaskDetailView";

export default function VolunteerDashboard() {
  const {
    isAvailable, isToggling, toggleAvailable,
    nearbyRequests, activeRequests,
    myAssignedRequests, myAssignmentStatuses, currentUser, volunteers, user,
    acknowledgeAssignment, rejectTask,
  } = useAppData() as any;

  const [filter, setFilter] = useState("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [declinedRequests, setDeclinedRequests] = useState<Set<string>>(new Set());
  const [ackLoading, setAckLoading] = useState<string | null>(null);

  // volunteer's own record (for team leader check)
  const meVol = volunteers?.find((v: any) => v.userId === (user as any)?.uid);

  if (selectedTaskId) {
    return <TaskDetailView requestId={selectedTaskId} onBack={() => setSelectedTaskId(null)} />;
  }

  // ── My Auto-Assigned Missions ──────────────────────────────────────────
  // FIX: Use per-volunteer assignment status instead of request-level status.
  // Each volunteer sees "pending" only when THEIR OWN assignment is "assigned",
  // not based on what other volunteers have done.
  const pendingAck = (myAssignedRequests || []).filter(
    (r: any) => (myAssignmentStatuses || {})[r.id] === "assigned"
  );

  // Missions this volunteer has accepted (status === "acknowledged")
  const acceptedMissions = (myAssignedRequests || []).filter(
    (r: any) => (myAssignmentStatuses || {})[r.id] === "acknowledged"
  );

  async function handleAcknowledge(requestId: string) {
    setAckLoading(requestId);
    try {
      await acknowledgeAssignment(requestId);
    } finally {
      setAckLoading(null);
    }
  }

  async function handleDecline(requestId: string) {
    setAckLoading(requestId);
    try {
      await rejectTask(requestId);
    } finally {
      setAckLoading(null);
    }
  }

  // ── Nearby Feed (unaccepted, for supplementary opt-in) ────────────────
  const eligibleRequests = nearbyRequests.filter(
    (r: any) => !declinedRequests.has(r.id) && r.status === "Waiting for volunteers"
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-card/50 p-4 rounded-2xl border border-border/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-emergency/10 flex items-center justify-center border border-emergency/20">
            <Zap className="w-6 h-6 text-emergency" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Volunteer Home</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-success" /> Trusted Responder
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end mr-2">
            <Label htmlFor="availability-toggle" className="text-[10px] uppercase font-bold text-muted-foreground mb-1">
              Status
            </Label>
            <div className="flex items-center gap-2 bg-muted/30 px-2 py-1 rounded-full border border-border/50">
              <span className={`text-[10px] font-bold ${isAvailable ? "text-success" : "text-muted-foreground"}`}>
                {isToggling ? "SYNCING..." : isAvailable ? "AVAILABLE" : "OFFLINE"}
              </span>
              <Switch
                id="availability-toggle"
                checked={isAvailable}
                onCheckedChange={toggleAvailable}
                disabled={isToggling}
                className="scale-75 origin-right data-[state=checked]:bg-success"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-card border-border/50 shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Active</p>
            <p className="text-xl font-bold text-foreground">{activeRequests.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50 shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">My Tasks</p>
            <p className="text-xl font-bold text-foreground">{(myAssignedRequests || []).length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50 shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Points</p>
            <p className="text-xl font-bold text-success">{currentUser?.points ?? 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Offline Notice */}
      {!isAvailable && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-warning/10 border border-warning/30 p-4 rounded-xl flex items-center gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
          <p className="text-sm text-warning-foreground font-medium">
            You are offline. Toggle 'Available' to receive emergency alerts.
          </p>
        </motion.div>
      )}

      {/* ── AUTO-ASSIGNED MISSIONS ─────────────────────────────────────────── */}
      {pendingAck.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-foreground flex items-center gap-2">
              <Bell className="w-4 h-4 text-emergency animate-pulse" />
              NGO-Assigned Missions
            </h2>
            <Badge className="bg-emergency/10 text-emergency border-emergency/20 text-[10px] animate-pulse">
              {pendingAck.length} pending
            </Badge>
          </div>

          <AnimatePresence>
            {pendingAck.map((req: any) => {
              const cat = getCategoryMeta(req.category);
              const isLeader = req.teamLeaderVolunteerId === meVol?.id;
              const loading = ackLoading === req.id;

              return (
                <motion.div
                  key={req.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                >
                  <Card className="overflow-hidden border-emergency/20 ring-1 ring-emergency/10 shadow-sm">
                    <CardContent className="p-0">
                      {/* Urgency strip */}
                      <div className={`h-1.5 w-full ${req.urgency === "critical" ? "bg-emergency animate-pulse" : "bg-orange-400"}`} />

                      <div className="p-4 space-y-3">
                        {/* Top row */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-muted/30 flex items-center justify-center text-2xl">
                              {cat.emoji}
                            </div>
                            <div>
                              <h3 className="text-sm font-black text-foreground">{cat.label} Mission</h3>
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {Math.round((Date.now() - req.createdAt) / 60000)}m ago
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            {isLeader ? (
                              <Badge className="bg-warning/20 text-warning border-warning/30 text-[8px]">
                                <Crown className="w-2.5 h-2.5 mr-0.5" /> TEAM LEADER
                              </Badge>
                            ) : (
                              <Badge className="bg-info/10 text-info border-info/20 text-[8px]">
                                <Shield className="w-2.5 h-2.5 mr-0.5" /> MEMBER
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={`text-[8px] uppercase font-black ${STATUS_COLORS[req.urgency] || ""}`}
                            >
                              {req.urgency}
                            </Badge>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-foreground/80 line-clamp-2 leading-relaxed">
                          {req.description}
                        </p>

                        {/* NGO info */}
                        {req.ngoName && (
                          <p className="text-[10px] text-muted-foreground">
                            Dispatched by: <span className="font-bold text-foreground">{req.ngoName}</span>
                            {(req.participatingNgoIds || []).length > 1 && (
                              <span className="ml-1 text-info">(Multi-NGO team)</span>
                            )}
                          </p>
                        )}

                        {/* Team size */}
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/20 rounded-lg px-2 py-1">
                          <Shield className="w-3 h-3" />
                          Team: {(req.assignedVolunteerIds || []).length}/{req.volunteersNeeded} volunteers assigned
                        </div>

                        {/* Action buttons */}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <Button
                            variant="outline"
                            className="h-11 rounded-xl border-border/50 hover:bg-destructive/5 hover:border-destructive/30 transition-colors"
                            disabled={loading}
                            onClick={() => handleDecline(req.id)}
                          >
                            <X className="w-4 h-4 mr-2 text-destructive" />
                            Decline
                          </Button>
                          <Button
                            className="h-11 rounded-xl bg-emergency hover:bg-emergency/90 text-emergency-foreground font-bold shadow-lg shadow-emergency/20"
                            disabled={loading}
                            onClick={() => handleAcknowledge(req.id)}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                            {loading ? "Confirming…" : "Accept & Go"}
                          </Button>
                        </div>

                        {/* View full details */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full h-8 text-xs text-muted-foreground"
                          onClick={() => setSelectedTaskId(req.id)}
                        >
                          View full mission details <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ── ACTIVE (ACCEPTED) MISSIONS ─────────────────────────────────────── */}
      {acceptedMissions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-success" />
              Active Missions
            </h2>
            <Badge className="bg-success/10 text-success border-success/20 text-[10px]">
              {acceptedMissions.length} active
            </Badge>
          </div>

          <AnimatePresence>
            {acceptedMissions.map((req: any) => {
              const cat = getCategoryMeta(req.category);
              const isLeader = req.teamLeaderVolunteerId === meVol?.id;

              return (
                <motion.div
                  key={req.id}
                  layout
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.97 }}
                >
                  <Card className="overflow-hidden border-success/20 ring-1 ring-success/10 shadow-sm">
                    <CardContent className="p-0">
                      {/* Success strip */}
                      <div className="h-1.5 w-full bg-success" />

                      <div className="p-4 space-y-3">
                        {/* Top row */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-muted/30 flex items-center justify-center text-2xl">
                              {cat.emoji}
                            </div>
                            <div>
                              <h3 className="text-sm font-black text-foreground">{cat.label} Mission</h3>
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {Math.round((Date.now() - req.createdAt) / 60000)}m ago
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            {isLeader ? (
                              <Badge className="bg-warning/20 text-warning border-warning/30 text-[8px]">
                                <Crown className="w-2.5 h-2.5 mr-0.5" /> TEAM LEADER
                              </Badge>
                            ) : (
                              <Badge className="bg-info/10 text-info border-info/20 text-[8px]">
                                <Shield className="w-2.5 h-2.5 mr-0.5" /> MEMBER
                              </Badge>
                            )}
                            <Badge className="bg-success/10 text-success border-success/20 text-[8px] font-black">
                              ACCEPTED
                            </Badge>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-foreground/80 line-clamp-2 leading-relaxed">
                          {req.description}
                        </p>

                        {/* Post-acceptance action buttons */}
                        <div className={`grid ${isLeader ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
                          <Button
                            variant="outline"
                            className="h-11 rounded-xl border-border/50 hover:bg-info/5 hover:border-info/30 transition-colors"
                          >
                            <MessageSquare className="w-4 h-4 mr-1.5" /> Chat with Team
                          </Button>
                          {isLeader && (
                            <Button
                              className="h-11 rounded-xl bg-info hover:bg-info/90 text-white transition-colors"
                            >
                              <Phone className="w-4 h-4 mr-1.5" /> Chat with Citizen
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            className="h-11 rounded-xl border-emergency/30 hover:bg-emergency/5 transition-colors"
                            onClick={() => {
                              if (req.location) {
                                window.open(
                                  `https://www.google.com/maps/dir/?api=1&destination=${req.location.lat},${req.location.lng}`,
                                  "_blank"
                                );
                              }
                            }}
                          >
                            <Navigation className="w-4 h-4 mr-1.5 text-emergency" /> Navigate
                          </Button>
                        </div>

                        {/* View full details */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full h-8 text-xs text-muted-foreground"
                          onClick={() => setSelectedTaskId(req.id)}
                        >
                          View full mission details <ChevronRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* ── NEARBY MISSIONS FEED ──────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-emergency" /> Nearby Missions
          </h2>
          <div className="flex gap-1">
            <Badge
              variant={filter === "all" ? "default" : "outline"}
              className="cursor-pointer text-[10px] px-2 py-0.5"
              onClick={() => setFilter("all")}
            >
              All
            </Badge>
            <Badge
              variant={filter === "critical" ? "default" : "outline"}
              className="cursor-pointer text-[10px] px-2 py-0.5"
              onClick={() => setFilter("critical")}
            >
              Critical
            </Badge>
          </div>
        </div>

        <AnimatePresence>
          {eligibleRequests.length > 0 ? (
            eligibleRequests
              .filter((r: any) => filter === "all" || r.urgency === filter)
              .map((req: any) => (
                <motion.div
                  key={req.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="group"
                >
                  <Card
                    onClick={() => setSelectedTaskId(req.id)}
                    className="overflow-hidden border-border/50 hover:border-emergency/30 transition-all shadow-sm hover:shadow-md active:scale-[0.98] cursor-pointer"
                  >
                    <CardContent className="p-0">
                      <div className="p-4 border-b border-border/30 bg-card/30 flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-xl">
                            {getCategoryMeta(req.category).emoji}
                          </div>
                          <div>
                            <h3 className="font-bold text-foreground text-sm uppercase tracking-tight">
                              {getCategoryMeta(req.category).label} Mission
                            </h3>
                            <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(req.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </div>
                        </div>
                        <Badge
                          className={`${STATUS_COLORS[req.urgency] || "bg-info"} text-[10px] px-2 py-0.5 uppercase font-black tracking-widest`}
                        >
                          {req.urgency}
                        </Badge>
                      </div>

                      <div className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-lg">
                            <MapPin className="w-3.5 h-3.5 text-emergency" />
                            <span className="font-medium text-foreground">{req.distanceKm?.toFixed(1) || "?"} km away</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-lg">
                            <Zap className="w-3.5 h-3.5 text-warning" />
                            <span className="font-medium text-foreground">{req.distanceKm ? Math.round(req.distanceKm * 8) : "?"} min ETA</span>
                          </div>
                        </div>

                        <p className="text-sm text-foreground line-clamp-2 leading-relaxed font-medium">
                          {req.description}
                        </p>

                        <div className="grid grid-cols-2 gap-3 pt-2">
                          <Button
                            variant="outline"
                            className="h-11 rounded-xl border-border/50 hover:bg-muted/50 transition-colors group"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeclinedRequests((prev) => new Set(prev).add(req.id));
                            }}
                          >
                            <X className="w-4 h-4 mr-2 text-muted-foreground group-hover:text-destructive transition-colors" />
                            Pass
                          </Button>
                          <Button
                            className="h-11 rounded-xl bg-emergency hover:bg-emergency/90 text-emergency-foreground font-bold shadow-lg shadow-emergency/20 group"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTaskId(req.id);
                            }}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-2 group-hover:scale-125 transition-transform" />
                            View Task
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
          ) : (
            <div className="text-center py-20 px-8 bg-muted/10 rounded-3xl border-2 border-dashed border-border/50">
              <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4 scale-150 grayscale opacity-50">
                🛰️
              </div>
              <h3 className="text-lg font-bold text-foreground mb-1">Scanning for Requests</h3>
              <p className="text-sm text-muted-foreground font-medium">
                No missions found in your area. We'll alert you the moment someone needs help.
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="pt-4 flex justify-center">
        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.2em] opacity-40">
          ResQLink Secure Patrol Mode
        </p>
      </div>
    </div>
  );
}
