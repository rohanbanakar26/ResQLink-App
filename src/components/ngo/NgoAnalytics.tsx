import { useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Clock, MapPin, Users, Star, Trophy, Zap } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { useAppData } from "../../context/AppDataContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import t from "@/utils/i18n";

const CHART_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6"];

export default function NgoAnalytics() {
  const { requests, volunteers, activeRequests, ngos, currentUser, priorityZones } = useAppData();

  const ngo = useMemo(() => ngos.find((n) => n.userId === currentUser?.userId), [ngos, currentUser]);
  const allRequests = requests;
  const completedRequests = useMemo(() => allRequests.filter((r) => r.status === "Completed"), [allRequests]);

  // Requests per day (last 7 days)
  const requestsPerDay = useMemo(() => {
    const days: Record<string, number> = {};
    const labels: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      const key = d.toLocaleDateString("en", { weekday: "short" });
      days[key] = 0;
      labels.push(key);
    }
    allRequests.forEach((r) => {
      const d = new Date(r.createdAt).toLocaleDateString("en", { weekday: "short" });
      if (days[d] !== undefined) days[d]++;
    });
    return labels.map((name) => ({ name, requests: days[name] }));
  }, [allRequests]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    allRequests.forEach((r) => {
      counts[r.category] = (counts[r.category] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [allRequests]);

  // Avg response time (rough estimate from created → completed)
  const avgResponseMin = useMemo(() => {
    const completed = completedRequests.filter((r) => r.completedAt);
    if (completed.length === 0) return 0;
    const total = completed.reduce((acc, r) => {
      const created = r.createdAt;
      const done = new Date(r.completedAt!).getTime();
      return acc + (done - created) / 60000;
    }, 0);
    return Math.round(total / completed.length);
  }, [completedRequests]);

  // Volunteer leaderboard
  const leaderboard = useMemo(() => {
    return [...volunteers]
      .sort((a, b) => (b.completedTasks ?? 0) - (a.completedTasks ?? 0))
      .slice(0, 5);
  }, [volunteers]);

  const successRate = allRequests.length > 0 ? Math.round((completedRequests.length / allRequests.length) * 100) : 0;

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-black text-foreground flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-info" /> {t("ngo.analytics")}
      </h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Requests", value: allRequests.length, icon: Zap, color: "text-emergency" },
          { label: "Completed", value: completedRequests.length, icon: TrendingUp, color: "text-success" },
          { label: "Avg Response", value: `${avgResponseMin}m`, icon: Clock, color: "text-info" },
          { label: "Success Rate", value: `${successRate}%`, icon: Trophy, color: "text-warning" },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-border/30">
                <CardContent className="p-3 text-center">
                  <Icon className={`w-5 h-5 mx-auto mb-1 ${kpi.color} opacity-70`} />
                  <p className={`text-xl font-black ${kpi.color}`}>{kpi.value}</p>
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Requests Per Day Chart */}
      <Card className="border-border/30">
        <CardContent className="p-4">
          <p className="text-xs font-bold text-foreground mb-3">{t("ngo.requestsPerDay")}</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={requestsPerDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
              <Bar dataKey="requests" fill="hsl(var(--emergency))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <Card className="border-border/30">
          <CardContent className="p-4">
            <p className="text-xs font-bold text-foreground mb-3">Request Categories</p>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={categoryBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {categoryBreakdown.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* High-Need Areas */}
      {priorityZones.length > 0 && (
        <Card className="border-border/30">
          <CardContent className="p-4 space-y-2">
            <p className="text-xs font-bold text-foreground flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-emergency" /> {t("ngo.highNeedAreas")}</p>
            {priorityZones.slice(0, 5).map((zone, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5">
                <span className="text-[10px] font-bold text-muted-foreground w-5 text-right">#{i + 1}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="font-bold text-foreground">Zone {zone.label || i + 1}</span>
                    <span className="text-emergency font-bold">{zone.count} requests</span>
                  </div>
                  <Progress value={Math.min((zone.count / (allRequests.length || 1)) * 100 * 3, 100)} className="h-1.5" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Volunteer Performance Leaderboard */}
      <Card className="border-border/30">
        <CardContent className="p-4">
          <p className="text-xs font-bold text-foreground mb-3 flex items-center gap-1"><Users className="w-3.5 h-3.5 text-success" /> {t("ngo.volunteerPerformance")}</p>
          <div className="space-y-2">
            {leaderboard.map((vol, i) => (
              <motion.div key={vol.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                <div className="flex items-center gap-3 py-2 border-b border-border/10 last:border-0">
                  <span className="text-sm font-black text-muted-foreground w-6 text-center">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${vol.available ? "bg-success/10 text-success" : "bg-muted/20 text-muted-foreground"}`}>
                    {vol.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-foreground">{vol.name}</p>
                    <p className="text-[10px] text-muted-foreground">{vol.completedTasks} tasks · {(vol.skills || []).slice(0, 2).join(", ")}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-0.5 text-[10px] text-warning font-bold">
                      <Star className="w-3 h-3 fill-warning" /> {vol.trustScore?.toFixed(1)}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
