import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageSquare, Send, Crown, Users, Radio, Megaphone } from "lucide-react";
import { useAppData } from "../../context/AppDataContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCategoryMeta } from "../../data/system";
import BroadcastComposer from "./BroadcastComposer";
import t from "@/utils/i18n";

export default function NgoCommunication() {
  const navigate = useNavigate();
  const { activeRequests, volunteers, ngos, currentUser } = useAppData();

  const ngo = useMemo(() => ngos.find((n) => n.userId === currentUser?.userId), [ngos, currentUser]);

  // Requests with teams (leader assigned)
  const teamsWithLeaders = useMemo(() => {
    return activeRequests.filter((r) => r.teamLeaderVolunteerId).map((req) => {
      const leader = volunteers.find((v) => v.id === req.teamLeaderVolunteerId);
      return { req, leader };
    });
  }, [activeRequests, volunteers]);

  // Requests from citizens (for escalation)
  const citizenRequests = useMemo(() => {
    return activeRequests.filter((r) => r.userId && r.assignedVolunteerId);
  }, [activeRequests]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-black text-foreground flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-success" /> {t("ngo.communication")}
      </h2>

      <Tabs defaultValue="leaders" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="leaders" className="text-[10px] font-bold">
            <Crown className="w-3 h-3 mr-1" /> {t("ngo.directChat")}
          </TabsTrigger>
          <TabsTrigger value="broadcast" className="text-[10px] font-bold">
            <Megaphone className="w-3 h-3 mr-1" /> {t("ngo.broadcast")}
          </TabsTrigger>
          <TabsTrigger value="escalation" className="text-[10px] font-bold">
            <Radio className="w-3 h-3 mr-1" /> {t("ngo.escalation")}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: NGO → Team Leaders */}
        <TabsContent value="leaders" className="space-y-3">
          <Card className="bg-success/5 border-success/20">
            <CardContent className="p-3 text-xs text-muted-foreground">
              Chat directly with team leaders for active missions.
            </CardContent>
          </Card>

          {teamsWithLeaders.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No active teams with leaders.</CardContent></Card>
          ) : (
            teamsWithLeaders.map(({ req, leader }) => {
              const cat = getCategoryMeta(req.category);
              return (
                <motion.div key={req.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="border-border/30 hover:border-success/30 transition-all cursor-pointer" onClick={() => navigate(`/requests/${req.id}/chat`)}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                        <Crown className="w-5 h-5 text-warning" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-foreground">{leader?.name || "Leader"}</p>
                        <p className="text-[10px] text-muted-foreground">{cat.emoji} {cat.label} mission · ⭐ {leader?.trustScore?.toFixed(1)}</p>
                      </div>
                      <Button size="sm" variant="outline" className="h-8 rounded-lg text-[10px] font-bold">
                        <MessageSquare className="w-3 h-3 mr-1" /> Chat
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </TabsContent>

        {/* Tab 2: Broadcast to All Volunteers */}
        <TabsContent value="broadcast">
          <BroadcastComposer ngoId={ngo?.id || ""} />
        </TabsContent>

        {/* Tab 3: NGO → Citizen (Escalation) */}
        <TabsContent value="escalation" className="space-y-3">
          <Card className="bg-emergency/5 border-emergency/20">
            <CardContent className="p-3 text-xs text-muted-foreground">
              <strong className="text-foreground">Escalation only.</strong> Use this to contact citizens directly when urgent intervention is needed.
            </CardContent>
          </Card>

          {citizenRequests.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No active citizen requests with assignments.</CardContent></Card>
          ) : (
            citizenRequests.slice(0, 10).map((req) => {
              const cat = getCategoryMeta(req.category);
              return (
                <motion.div key={req.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="border-border/30 hover:border-emergency/30 transition-all cursor-pointer" onClick={() => navigate(`/requests/${req.id}/chat`)}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emergency/10 flex items-center justify-center text-sm font-bold text-emergency">
                        {(req.citizenName || "C").charAt(0)}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-foreground">{req.citizenName || "Citizen"}</p>
                        <p className="text-[10px] text-muted-foreground">{cat.emoji} {cat.label} · {req.urgency}</p>
                      </div>
                      <Badge variant="outline" className="text-[8px] border-emergency/30 text-emergency">ESCALATE</Badge>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
