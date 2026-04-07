import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Building2, Radio, Users, CheckCircle2, TrendingUp, MapPin, Zap, Shield, BarChart3, MessageSquare, Bell, Crown, FileSearch, Megaphone } from "lucide-react";
import { useAppData } from "../../context/AppDataContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCategoryMeta, STATUS_COLORS } from "../../data/system";
import VerifiedBadge from "../safety/VerifiedBadge";
import NgoRequestManager from "./NgoRequestManager";
import SmartAllocationPanel from "./SmartAllocationPanel";
import NgoVolunteerPanel from "./NgoVolunteerPanel";
import NgoTeamMonitor from "./NgoTeamMonitor";
import NgoTaskReview from "./NgoTaskReview";
import NgoAnalytics from "./NgoAnalytics";
import NgoAlerts from "./NgoAlerts";
import NgoCommunication from "./NgoCommunication";
import CampaignCreator from "./CampaignCreator";
import t from "@/utils/i18n";

type NgoTab = "overview" | "requests" | "allocation" | "volunteers" | "teams" | "review" | "analytics" | "alerts" | "comms" | "campaigns";

const NAV_ITEMS: { id: NgoTab; label: string; icon: any; color: string }[] = [
  { id: "overview", label: "ngo.overview", icon: BarChart3, color: "text-info" },
  { id: "requests", label: "ngo.allRequests", icon: Radio, color: "text-emergency" },
  { id: "allocation", label: "ngo.smartAllocation", icon: Zap, color: "text-warning" },
  { id: "volunteers", label: "ngo.volunteers", icon: Users, color: "text-success" },
  { id: "teams", label: "ngo.teamMonitor", icon: Crown, color: "text-info" },
  { id: "review", label: "ngo.taskReview", icon: FileSearch, color: "text-accent" },
  { id: "analytics", label: "ngo.analytics", icon: TrendingUp, color: "text-info" },
  { id: "comms", label: "ngo.communication", icon: MessageSquare, color: "text-success" },
  { id: "campaigns", label: "ngo.createCampaign", icon: Megaphone, color: "text-warning" },
  { id: "alerts", label: "ngo.alerts", icon: Bell, color: "text-emergency" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.4 } }),
};

export default function NgoControlCenter() {
  const { currentUser, activeRequests, requests, volunteers, ngos, nearbyRequests } = useAppData();
  const [activeTab, setActiveTab] = useState<NgoTab>("overview");

  const ngo = useMemo(() => ngos.find((n) => n.userId === currentUser?.userId), [ngos, currentUser]);
  const ngoRequests = useMemo(() => requests.filter((r) => r.ngoId === ngo?.id), [requests, ngo]);
  const completedCount = useMemo(() => ngoRequests.filter((r) => r.status === "Completed").length, [ngoRequests]);
  const activeCount = useMemo(() => ngoRequests.filter((r) => r.status !== "Completed" && r.status !== "Cancelled").length, [ngoRequests]);
  const onlineVolunteers = useMemo(() => volunteers.filter((v) => v.available), [volunteers]);
  const successRate = ngoRequests.length > 0 ? Math.round((completedCount / ngoRequests.length) * 100) : 0;

  // Smart alerts count
  const unassignedOld = activeRequests.filter((r) => {
    const age = Date.now() - r.createdAt;
    return !r.assignedVolunteerId && age > 30 * 60 * 1000;
  });
  const alertCount = unassignedOld.length;

  const renderActiveTab = () => {
    switch (activeTab) {
      case "requests": return <NgoRequestManager />;
      case "allocation": return <SmartAllocationPanel />;
      case "volunteers": return <NgoVolunteerPanel />;
      case "teams": return <NgoTeamMonitor />;
      case "review": return <NgoTaskReview />;
      case "analytics": return <NgoAnalytics />;
      case "comms": return <NgoCommunication />;
      case "campaigns": return <CampaignCreator />;
      case "alerts": return <NgoAlerts />;
      default: return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-success/20 to-success/5 flex items-center justify-center border border-success/20 shadow-lg">
            <Building2 className="w-7 h-7 text-success" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-foreground tracking-tight">{ngo?.ngoName || "NGO Dashboard"}</h1>
              <VerifiedBadge type="ngo" size="sm" />
            </div>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {t("ngo.controlCenter")}
            </p>
          </div>
        </div>
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => setActiveTab("alerts")}
          >
            <Bell className="w-5 h-5" />
          </Button>
          {alertCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-emergency text-emergency-foreground text-[10px] font-bold flex items-center justify-center animate-pulse">
              {alertCount}
            </span>
          )}
        </div>
      </div>

      {/* Tab Navigation — Horizontal Scroll */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1 mt-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all border flex-shrink-0 ${
                isActive
                  ? "bg-emergency/10 border-emergency/30 text-emergency shadow-sm"
                  : "bg-card border-border/30 text-muted-foreground hover:border-border hover:text-foreground"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? item.color : ""}`} />
              {t(item.label)}
              {item.id === "alerts" && alertCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-emergency text-emergency-foreground text-[8px] flex items-center justify-center ml-0.5">{alertCount}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Metrics Cards */}
      {activeTab === "overview" && (
        <>
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
          >
            {[
              { label: t("ngo.activeRequests"), value: activeCount, color: "text-emergency", bg: "from-emergency/10 to-emergency/5", icon: Radio },
              { label: t("ngo.volunteersActive"), value: onlineVolunteers.length, color: "text-success", bg: "from-success/10 to-success/5", icon: Users },
              { label: t("ngo.tasksCompleted"), value: completedCount, color: "text-info", bg: "from-info/10 to-info/5", icon: CheckCircle2 },
              { label: t("ngo.successRate"), value: `${successRate}%`, color: "text-warning", bg: "from-warning/10 to-warning/5", icon: TrendingUp },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div key={stat.label} variants={fadeUp} custom={i}>
                  <Card className={`bg-gradient-to-br ${stat.bg} border-border/30 shadow-lg overflow-hidden`}>
                    <CardContent className="p-4">
                      <Icon className={`w-5 h-5 ${stat.color} mb-2 opacity-70`} />
                      <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">{stat.label}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Live Request Feed */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-black text-foreground uppercase tracking-wider flex items-center gap-2">
                <Radio className="w-4 h-4 text-emergency" /> {t("ngo.liveFeed")}
              </h2>
              <Badge variant="outline" className="text-[10px] border-emergency/30 text-emergency animate-pulse">
                LIVE
              </Badge>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {nearbyRequests
                .filter(r => r.status !== "Completed" && r.status !== "Cancelled")
                .slice(0, 8)
                .map((req) => {
                const cat = getCategoryMeta(req.category);
                return (
                  <Card key={req.id} className="border-border/30 hover:border-emergency/20 transition-all cursor-pointer" onClick={() => setActiveTab("requests")}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <span className="text-xl">{cat.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{cat.label} — {req.citizenName || "Citizen"}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{req.description || "No details"}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant="outline" className={`text-[8px] ${STATUS_COLORS[req.urgency] || ""}`}>{req.urgency}</Badge>
                        {req.distanceKm != null && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" /> {req.distanceKm.toFixed(1)} km
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {nearbyRequests.filter(r => r.status !== "Completed" && r.status !== "Cancelled").length === 0 && (
                <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No incoming requests right now.</CardContent></Card>
              )}
            </div>
          </div>
        </>
      )}


      {/* Active Tab Content */}
      {activeTab !== "overview" && (
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {renderActiveTab()}
        </motion.div>
      )}
    </div>
  );
}
