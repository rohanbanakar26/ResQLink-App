import { useMemo } from "react";
import { motion } from "framer-motion";
import { Bell, AlertTriangle, Users, Clock, Shield, Zap, TrendingUp, MapPin } from "lucide-react";
import { useAppData } from "../../context/AppDataContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCategoryMeta } from "../../data/system";
import t from "@/utils/i18n";

interface Alert {
  id: string;
  type: "spike" | "shortage" | "delayed" | "lowTrust";
  icon: typeof AlertTriangle;
  color: string;
  bgColor: string;
  borderColor: string;
  title: string;
  message: string;
  timestamp: number;
}

export default function NgoAlerts() {
  const { activeRequests, requests, volunteers, priorityZones } = useAppData();

  const alerts = useMemo(() => {
    const result: Alert[] = [];

    // 1. Emergency spikes — zones with 3+ requests in the period
    const zoneCounts: Record<string, number> = {};
    activeRequests.forEach((r) => {
      if (!r.location) return;
      const key = `${Math.round(r.location.lat * 100) / 100},${Math.round(r.location.lng * 100) / 100}`;
      zoneCounts[key] = (zoneCounts[key] || 0) + 1;
    });
    Object.entries(zoneCounts).forEach(([zone, count]) => {
      if (count >= 3) {
        result.push({
          id: `spike-${zone}`,
          type: "spike",
          icon: Zap,
          color: "text-emergency",
          bgColor: "bg-emergency/5",
          borderColor: "border-emergency/20",
          title: t("ngo.emergencySpike"),
          message: `${count} requests concentrated in zone ${zone}. Consider deploying additional volunteers.`,
          timestamp: Date.now(),
        });
      }
    });

    // 2. Volunteer shortage — unassigned requests older than 30 minutes
    const unassigned = activeRequests.filter((r) => {
      const age = Date.now() - r.createdAt;
      return !r.assignedVolunteerId && age > 30 * 60 * 1000;
    });
    if (unassigned.length > 0) {
      result.push({
        id: "shortage",
        type: "shortage",
        icon: Users,
        color: "text-warning",
        bgColor: "bg-warning/5",
        borderColor: "border-warning/20",
        title: t("ngo.volunteerShortage"),
        message: `${unassigned.length} request(s) unassigned for 30+ minutes. ${unassigned.map((r) => getCategoryMeta(r.category).label).join(", ")}`,
        timestamp: Date.now(),
      });
    }

    // 3. Delayed tasks — in-progress for over 2 hours
    const delayed = activeRequests.filter((r) => {
      const age = Date.now() - r.createdAt;
      return (r.status === "In progress" || r.status === "In Progress") && age > 2 * 60 * 60 * 1000;
    });
    delayed.forEach((r) => {
      const cat = getCategoryMeta(r.category);
      const hours = Math.round((Date.now() - r.createdAt) / 3600000);
      result.push({
        id: `delayed-${r.id}`,
        type: "delayed",
        icon: Clock,
        color: "text-info",
        bgColor: "bg-info/5",
        borderColor: "border-info/20",
        title: t("ngo.delayedTask"),
        message: `${cat.label} mission has been in progress for ${hours}+ hours. Consider checking with the team.`,
        timestamp: Date.now(),
      });
    });

    // 4. Low trust warnings — assigned volunteers with trust < 2.5
    activeRequests.forEach((r) => {
      const vol = volunteers.find((v) => v.id === r.assignedVolunteerId);
      if (vol && (vol.trustScore ?? 5) < 2.5) {
        result.push({
          id: `trust-${r.id}`,
          type: "lowTrust",
          icon: Shield,
          color: "text-destructive",
          bgColor: "bg-destructive/5",
          borderColor: "border-destructive/20",
          title: t("ngo.lowTrustWarning"),
          message: `Volunteer "${vol.name}" assigned to ${getCategoryMeta(r.category).label} has a low trust score (${vol.trustScore?.toFixed(1)}). Monitor closely.`,
          timestamp: Date.now(),
        });
      }
    });

    return result.sort((a, b) => {
      const priority = { spike: 0, shortage: 1, delayed: 2, lowTrust: 3 };
      return (priority[a.type] ?? 4) - (priority[b.type] ?? 4);
    });
  }, [activeRequests, volunteers]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-foreground flex items-center gap-2">
          <Bell className="w-5 h-5 text-emergency" /> {t("ngo.alerts")}
        </h2>
        <Badge variant="outline" className={`text-[10px] ${alerts.length > 0 ? "border-emergency/30 text-emergency" : "border-success/30 text-success"}`}>
          {alerts.length > 0 ? `${alerts.length} active` : "All clear"}
        </Badge>
      </div>

      {alerts.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-3">
              <Shield className="w-7 h-7 text-success" />
            </div>
            <p className="text-sm font-bold text-foreground">All Systems Clear</p>
            <p className="text-xs text-muted-foreground mt-1">No active alerts. Operations running smoothly.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert, i) => {
            const Icon = alert.icon;
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className={`${alert.bgColor} ${alert.borderColor} border overflow-hidden`}>
                  <CardContent className="p-3 flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg ${alert.bgColor} flex items-center justify-center flex-shrink-0 border ${alert.borderColor}`}>
                      <Icon className={`w-4 h-4 ${alert.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={`text-xs font-bold ${alert.color}`}>{alert.title}</p>
                        <Badge variant="outline" className={`text-[8px] ${alert.borderColor} ${alert.color}`}>
                          {alert.type.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{alert.message}</p>
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
