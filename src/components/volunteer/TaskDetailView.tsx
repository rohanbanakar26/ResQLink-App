import { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, Clock, Users, Shield, Zap, ArrowLeft, CheckCircle2, Phone, MessageSquare, AlertTriangle, Play, Navigation, X } from "lucide-react";
import { useAppData } from "../../context/AppDataContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCategoryMeta, STATUS_COLORS } from "../../data/system";
import OnFieldMode from "./OnFieldMode";
import AiMissionBrief from "./AiMissionBrief";

interface TaskDetailViewProps {
  requestId: string;
  onBack: () => void;
}

export default function TaskDetailView({ requestId, onBack }: TaskDetailViewProps) {
  const {
    requests, volunteers, currentUser, joinTask, isAvailable,
    myAssignmentStatuses, acknowledgeAssignment, rejectTask,
  } = useAppData() as any;
  const [showServiceMode, setShowServiceMode] = useState(false);
  const [ackLoading, setAckLoading] = useState(false);

  const request = requests.find((r: any) => r.id === requestId);
  const currentVol = volunteers.find((v: any) => v.userId === currentUser?.userId);

  // FIX: Compare volunteer doc IDs (not auth UID) against the full team array
  const isJoined = currentVol
    ? (request?.assignedVolunteerIds || []).includes(currentVol.id)
    : false;

  const isLeader = request?.teamLeaderVolunteerId === currentVol?.id;

  // Per-volunteer acceptance status from real-time listener
  const myStatus = (myAssignmentStatuses || {})[requestId];
  const hasAccepted = myStatus === "acknowledged";
  const isPendingAcceptance = isJoined && myStatus === "assigned";
  const isLive = request?.status !== "Completed" && request?.status !== "Cancelled";

  if (!request) return null;

  if (showServiceMode) {
    return <OnFieldMode requestId={requestId} onExit={() => setShowServiceMode(false)} />;
  }

  const category = getCategoryMeta(request.category);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="fixed inset-0 z-50 bg-background pb-20 overflow-y-auto"
    >
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-full">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <Badge className={`${STATUS_COLORS[request.urgency] || "bg-info"} uppercase font-black tracking-widest`}>
            {request.urgency}
          </Badge>
        </div>

        <div className="relative aspect-video rounded-3xl overflow-hidden shadow-xl border border-border/50 bg-muted/20">
          {request.photoUrl ? (
            <img src={request.photoUrl} alt="Emergency" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/30">
               <span className="text-6xl mb-2">{category.emoji}</span>
               <p className="text-xs font-bold uppercase tracking-widest">No visual asset provided</p>
            </div>
          )}
          <div className="absolute top-4 left-4">
             <Badge className="bg-background/80 backdrop-blur-md text-foreground border-none px-3 py-1 font-bold">
                {category.label}
             </Badge>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-black text-foreground mb-2 flex items-center gap-2">
               Live Incident Details <Zap className="w-5 h-5 text-warning fill-warning" />
            </h1>
            <p className="text-muted-foreground leading-relaxed">
              {request.description}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <Card className="bg-muted/10 border-border/50">
                <CardContent className="p-4 flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-emergency/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-emergency" />
                   </div>
                   <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none mb-1">Distance</p>
                      <p className="text-sm font-bold text-foreground">{request.distanceKm?.toFixed(1) || "?"} km</p>
                   </div>
                </CardContent>
             </Card>
             <Card className="bg-muted/10 border-border/50">
                <CardContent className="p-4 flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-info" />
                   </div>
                   <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase leading-none mb-1">Impact</p>
                      <p className="text-sm font-bold text-foreground">3-5 People</p>
                   </div>
                </CardContent>
             </Card>
          </div>

          <div className="space-y-3">
             <h3 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-success" /> Assignment Status
             </h3>
             <Card className="bg-muted/5 border-border/50 border-dashed">
                <CardContent className="p-6 text-center">
                   {/* ── STATE 1: Accepted — show post-acceptance actions ── */}
                   {isJoined && hasAccepted ? (
                      <div className="space-y-4 text-left">
                         <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mb-3">
                               {isLeader ? (
                                  <span className="text-3xl">👑</span>
                               ) : (
                                  <Users className="w-8 h-8 text-success" />
                               )}
                            </div>
                            <h4 className="text-lg font-bold text-foreground">
                               {isLeader ? "You are Team Leader" : "You are Assigned"}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1 px-8">
                               Maintain radio silence on group chat unless necessary. Follow protocols.
                            </p>
                         </div>
                         
                         {/* Post-acceptance action buttons */}
                         <div className="grid grid-cols-2 gap-3">
                            <Button variant="outline" className="rounded-xl h-12">
                               <MessageSquare className="w-4 h-4 mr-2" /> Chat with Team
                            </Button>
                            {isLeader && (
                               <Button className="rounded-xl h-12 bg-info hover:bg-info/90">
                                  <Phone className="w-4 h-4 mr-2" /> Chat with Citizen
                               </Button>
                            )}
                         </div>

                         {/* Navigate to location */}
                         <Button
                           variant="outline"
                           className="w-full rounded-xl h-12 border-emergency/30 hover:bg-emergency/5"
                           onClick={() => {
                             if (request.location) {
                               window.open(
                                 `https://www.google.com/maps/dir/?api=1&destination=${request.location.lat},${request.location.lng}`,
                                 "_blank"
                               );
                             }
                           }}
                         >
                            <Navigation className="w-4 h-4 mr-2 text-emergency" /> Navigate to Location
                         </Button>

                         {/* AI Mission Briefing */}
                         {(request as any).ai_mission_brief && (
                            <AiMissionBrief 
                              brief={(request as any).ai_mission_brief}
                              reason={(request as any).ai_analysis_reason}
                              steps={(request as any).ai_suggested_steps}
                            />
                         )}
                         
                         <Button 
                           onClick={() => setShowServiceMode(true)}
                           className="w-full h-14 rounded-2xl bg-success hover:bg-success/90 text-white font-black text-lg shadow-xl shadow-success/20"
                         >
                            <Play className="w-5 h-5 mr-2 fill-white" /> Start Service Mode
                         </Button>
                      </div>

                   /* ── STATE 2: Assigned but not yet accepted — show Accept/Decline ── */
                   ) : isPendingAcceptance ? (
                      <div className="space-y-4">
                         <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center mb-3 animate-pulse">
                               <AlertTriangle className="w-8 h-8 text-warning" />
                            </div>
                            <h4 className="text-lg font-bold text-foreground">Mission Assigned to You</h4>
                            <p className="text-xs text-muted-foreground mt-1 px-8">
                               Accept this mission to see team chat, citizen contact, and navigation.
                            </p>
                         </div>
                         <div className="grid grid-cols-2 gap-3">
                            <Button
                              variant="outline"
                              className="h-12 rounded-xl border-border/50 hover:bg-destructive/5 hover:border-destructive/30"
                              disabled={ackLoading}
                              onClick={async () => {
                                setAckLoading(true);
                                try { await rejectTask(requestId); onBack(); } finally { setAckLoading(false); }
                              }}
                            >
                               <X className="w-4 h-4 mr-2 text-destructive" /> Decline
                            </Button>
                            <Button
                              className="h-12 rounded-xl bg-emergency hover:bg-emergency/90 text-emergency-foreground font-bold shadow-lg shadow-emergency/20"
                              disabled={ackLoading}
                              onClick={async () => {
                                setAckLoading(true);
                                try { await acknowledgeAssignment(requestId); } finally { setAckLoading(false); }
                              }}
                            >
                               <CheckCircle2 className="w-4 h-4 mr-2" />
                               {ackLoading ? "Confirming…" : "Accept & Go"}
                            </Button>
                         </div>
                      </div>

                   /* ── STATE 3: Not assigned — show opt-in button ── */
                   ) : (
                      <div className="space-y-4">
                         <div className="inline-flex items-center gap-2 bg-warning/10 px-3 py-1 rounded-full border border-warning/20 mb-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                            <span className="text-[10px] font-bold text-warning uppercase">Help Needed urgently</span>
                         </div>
                         <p className="text-sm text-muted-foreground">
                            This task requires multiple responders. Join the team to coordinate rescue and relief.
                         </p>
                         <Button 
                           onClick={() => joinTask(requestId)}
                           disabled={!isAvailable}
                           className="w-full h-14 rounded-2xl bg-emergency hover:bg-emergency/90 text-emergency-foreground font-black text-xl shadow-2xl shadow-emergency/40 group"
                         >
                            <Shield className="w-5 h-5 mr-2 group-hover:scale-125 transition-transform" />
                            Join Life-Saving Task
                         </Button>
                         {!isAvailable && (
                            <p className="text-[10px] text-destructive font-bold uppercase">Go online to join tasks</p>
                         )}
                      </div>
                   )}
                </CardContent>
             </Card>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
