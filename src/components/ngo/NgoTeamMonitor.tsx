import { useMemo } from "react";
import { motion } from "framer-motion";
import { Crown, Users, Clock, Shield, MapPin, MessageSquare, AlertTriangle, CheckCircle2, Radio } from "lucide-react";
import { useAppData } from "../../context/AppDataContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getCategoryMeta, STATUS_COPY } from "../../data/system";
import { useNavigate } from "react-router-dom";
import t from "@/utils/i18n";

function getProgressPercent(status: string): number {
  const map: Record<string, number> = {
    Created: 10, Requested: 10, Matching: 20, Accepted: 30,
    "Volunteer assigned": 40, Assigned: 40, "Awaiting more volunteers": 45,
    "Team is ready": 85, "In progress": 65, "In Progress": 65,
    Completed: 100,
  };
  return map[status] ?? 15;
}

export default function NgoTeamMonitor() {
  const { activeRequests, volunteers } = useAppData();
  const navigate = useNavigate();

  const teamsInProgress = useMemo(() => {
    return activeRequests
      .filter((r) => r.assignedVolunteerId)
      .map((req) => {
        const assignedVol = volunteers.find((v) => v.id === req.assignedVolunteerId);
        const leader = volunteers.find((v) => v.id === req.teamLeaderVolunteerId);
        const elapsed = Math.round((Date.now() - req.createdAt) / 60000);
        const progress = getProgressPercent(req.status);

        return { req, assignedVol, leader, elapsed, progress };
      });
  }, [activeRequests, volunteers]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-foreground flex items-center gap-2">
          <Crown className="w-5 h-5 text-warning" /> {t("ngo.teamMonitor")}
        </h2>
        <Badge variant="outline" className="text-[10px]">{teamsInProgress.length} active teams</Badge>
      </div>

      {teamsInProgress.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-3 opacity-50">
              <Users className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">No active teams right now.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {teamsInProgress.map(({ req, assignedVol, leader, elapsed, progress }) => {
            const cat = getCategoryMeta(req.category);
            const isDelayed = elapsed > 120;

            return (
              <motion.div key={req.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className={`border-border/30 overflow-hidden ${isDelayed ? "border-warning/30 bg-warning/5" : ""}`}>
                  <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{cat.emoji}</span>
                        <div>
                          <p className="text-sm font-bold text-foreground">{cat.label} Mission</p>
                          <p className="text-[10px] text-muted-foreground">{req.citizenName || "Citizen"}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className="text-[8px]">{STATUS_COPY[req.status] || req.status}</Badge>
                        {isDelayed && (
                          <Badge className="bg-warning/10 text-warning border-warning/30 text-[8px]">
                            <AlertTriangle className="w-2.5 h-2.5 mr-0.5" /> DELAYED
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-muted-foreground mb-1">
                        <span>{t("ngo.taskProgress")}</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2.5" />
                    </div>

                    {/* Team Members */}
                    <div className="space-y-2">
                      {/* Leader */}
                      {leader && (
                        <div className="flex items-center gap-2 bg-warning/5 border border-warning/20 rounded-lg p-2">
                          <Crown className="w-4 h-4 text-warning" />
                          <span className="text-xs font-bold text-foreground">{leader.name}</span>
                          <Badge variant="outline" className="text-[8px] border-warning/30 text-warning">LEADER</Badge>
                          <span className="text-[10px] text-muted-foreground ml-auto">⭐ {leader.trustScore?.toFixed(1)}</span>
                        </div>
                      )}
                      {/* Assigned Volunteer (if different from leader) */}
                      {assignedVol && assignedVol.id !== leader?.id && (
                        <div className="flex items-center gap-2 bg-muted/10 border border-border/30 rounded-lg p-2">
                          <Shield className="w-4 h-4 text-info" />
                          <span className="text-xs font-bold text-foreground">{assignedVol.name}</span>
                          <Badge variant="outline" className="text-[8px]">MEMBER</Badge>
                          <span className="text-[10px] text-muted-foreground ml-auto">⭐ {assignedVol.trustScore?.toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {elapsed}m elapsed</span>
                      {req.distanceKm != null && (
                        <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {req.distanceKm.toFixed(1)} km</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" className="h-8 rounded-lg text-[10px] font-bold flex-1" onClick={() => navigate(`/requests/${req.id}/chat`)}>
                        <MessageSquare className="w-3 h-3 mr-1" /> Chat with Team
                      </Button>
                      {isDelayed && (
                        <Button size="sm" className="h-8 rounded-lg text-[10px] font-bold bg-warning hover:bg-warning/90 text-warning-foreground">
                          <AlertTriangle className="w-3 h-3 mr-1" /> {t("ngo.intervene")}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
