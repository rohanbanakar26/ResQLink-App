import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Zap, MapPin, Star, Wrench, Shield, ArrowRightLeft, UserPlus, UserMinus, RefreshCw, ChevronDown } from "lucide-react";
import { useAppData } from "../../context/AppDataContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCategoryMeta } from "../../data/system";
import { haversineDistance } from "../../utils/geo";
import { findBestVolunteer } from "../../utils/matching";
import t from "@/utils/i18n";

function getDistanceScore(distKm: number | null): number {
  if (distKm == null) return 8;
  if (distKm <= 2) return 35;
  if (distKm <= 5) return 26;
  if (distKm <= 10) return 18;
  if (distKm <= 20) return 10;
  return 4;
}

function getSkillOverlap(category: string, skills: string[]): number {
  const categorySkills: Record<string, string[]> = {
    food: ["food", "delivery", "distribution", "logistics"],
    disaster: ["rescue", "disaster", "logistics", "medical"],
    sanitation: ["sanitation", "cleanliness", "waste"],
  };
  const reqSkills = categorySkills[category] ?? [category];
  const normalizedSkills = skills.map((s) => s.toLowerCase());
  return reqSkills.filter((s) => normalizedSkills.some((es) => es.includes(s))).length;
}

export default function SmartAllocationPanel() {
  const { activeRequests, volunteers, ngos, currentUser, location, assignVolunteer } = useAppData();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const ngo = useMemo(() => ngos.find((n) => n.userId === currentUser?.userId), [ngos, currentUser]);
  const assignedRequests = useMemo(
    () => activeRequests.filter((r) => r.assignedVolunteerId),
    [activeRequests],
  );

  const availableVolunteers = useMemo(() => volunteers.filter((v) => v.available), [volunteers]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-foreground flex items-center gap-2">
          <Zap className="w-5 h-5 text-warning" /> {t("ngo.smartAllocation")}
        </h2>
        <Badge variant="outline" className="text-[10px]">{assignedRequests.length} assigned</Badge>
      </div>

      <Card className="bg-warning/5 border-warning/20">
        <CardContent className="p-3 text-xs text-muted-foreground">
          <strong className="text-foreground">How it works:</strong> The system scores volunteers by <span className="text-info font-bold">distance</span>, <span className="text-success font-bold">skills</span>, and <span className="text-warning font-bold">trust</span>. You can see why each volunteer was assigned and override if needed.
        </CardContent>
      </Card>

      <div className="space-y-3">
        {assignedRequests.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No requests have been assigned yet.</CardContent></Card>
        ) : (
          assignedRequests.map((req) => {
            const cat = getCategoryMeta(req.category);
            const assignedVol = volunteers.find((v) => v.id === req.assignedVolunteerId);
            const isExpanded = expandedId === req.id;

            if (!assignedVol) return null;

            const distKm = haversineDistance(req.location, assignedVol.location);
            const distScore = getDistanceScore(distKm);
            const skillOverlap = getSkillOverlap(req.category, assignedVol.skills || []);
            const skillScore = Math.min(skillOverlap * 8, 30);
            const trustScore = (assignedVol.trustScore ?? 4) * 4;
            const totalScore = distScore + skillScore + trustScore;
            const maxScore = 85;

            return (
              <Card key={req.id} className="border-border/30 overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-4 cursor-pointer flex items-start justify-between" onClick={() => setExpandedId(isExpanded ? null : req.id)}>
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{cat.emoji}</span>
                      <div>
                        <p className="text-sm font-bold text-foreground">{cat.label} → {assignedVol.name}</p>
                        <p className="text-[10px] text-muted-foreground">Match Score: <span className="text-warning font-bold">{totalScore}/{maxScore}</span></p>
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </div>

                  {isExpanded && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 pb-4 space-y-4 border-t border-border/20 pt-3">
                      {/* Score Breakdown */}
                      <div>
                        <p className="text-xs font-bold text-foreground mb-3 flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-warning" /> {t("ngo.whyAssigned")}
                        </p>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-[10px] font-bold mb-1">
                              <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-info" /> {t("ngo.distanceScore")}</span>
                              <span className="text-info">{distScore}/35</span>
                            </div>
                            <Progress value={(distScore / 35) * 100} className="h-2" />
                            <p className="text-[10px] text-muted-foreground mt-0.5">{distKm?.toFixed(1) || "?"} km away</p>
                          </div>
                          <div>
                            <div className="flex justify-between text-[10px] font-bold mb-1">
                              <span className="flex items-center gap-1"><Wrench className="w-3 h-3 text-success" /> {t("ngo.skillScore")}</span>
                              <span className="text-success">{skillScore}/30</span>
                            </div>
                            <Progress value={(skillScore / 30) * 100} className="h-2" />
                            <p className="text-[10px] text-muted-foreground mt-0.5">{skillOverlap} skill(s) matched: {(assignedVol.skills || []).slice(0, 3).join(", ") || "—"}</p>
                          </div>
                          <div>
                            <div className="flex justify-between text-[10px] font-bold mb-1">
                              <span className="flex items-center gap-1"><Star className="w-3 h-3 text-warning" /> {t("ngo.trustScoreLabel")}</span>
                              <span className="text-warning">{trustScore.toFixed(0)}/20</span>
                            </div>
                            <Progress value={(trustScore / 20) * 100} className="h-2" />
                            <p className="text-[10px] text-muted-foreground mt-0.5">⭐ {assignedVol.trustScore?.toFixed(1)} trust · {assignedVol.completedTasks} completed tasks</p>
                          </div>
                        </div>
                      </div>

                      {/* Override Controls */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-border/20">
                        <Select onValueChange={(v) => assignVolunteer(req.id, v)}>
                          <SelectTrigger className="h-8 w-auto text-[10px] font-bold rounded-lg">
                            <ArrowRightLeft className="w-3 h-3 mr-1" />
                            <SelectValue placeholder={t("ngo.changeLeader")} />
                          </SelectTrigger>
                          <SelectContent>
                            {availableVolunteers.map((v) => (
                              <SelectItem key={v.id} value={v.id}>{v.name} · ⭐{v.trustScore?.toFixed(1)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="outline" className="h-8 rounded-lg text-[10px] font-bold" onClick={() => {
                          const best = findBestVolunteer(req, volunteers);
                          if (best) assignVolunteer(req.id, best.id);
                        }}>
                          <RefreshCw className="w-3 h-3 mr-1" /> {t("ngo.rerunMatching")}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
