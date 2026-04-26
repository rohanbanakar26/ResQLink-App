import { motion } from "framer-motion";
import { Trophy, Star, Zap, Shield, CheckCircle2, Heart, Lock } from "lucide-react";
import { useAppData } from "@/context/AppDataContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Navigate } from "react-router-dom";

// ── Level helpers (kept in sync with ProfilePage) ─────────────────────────
const POINTS_PER_LEVEL = 200;
function getLevelFromPoints(p: number) { return Math.floor(p / POINTS_PER_LEVEL) + 1; }
function getProgressPct(p: number) { return ((p % POINTS_PER_LEVEL) / POINTS_PER_LEVEL) * 100; }
function getPtsToNext(p: number) { return POINTS_PER_LEVEL - (p % POINTS_PER_LEVEL); }

const REWARD_TIERS = [
  { title: "First Responder",        requiredPts: 0,    icon: <Trophy className="text-warning" /> },
  { title: "Rescue Pro Badge",       requiredPts: 500,  icon: <Zap    className="text-emergency" /> },
  { title: "NGO Partner Token",      requiredPts: 2500, icon: <Shield className="text-info" /> },
  { title: "Life Saver Certificate", requiredPts: 5000, icon: <Heart  className="text-destructive" /> },
];

const BENEFITS = [
  { title: "Priority Dispatch",  desc: "Get notified of critical incidents 30s before others.", requiredPts: 500  },
  { title: "Verification Badge", desc: "Show a verified checkmark on your public profile.",     requiredPts: 1000 },
  { title: "Team Leader Access", desc: "Ability to lead teams on complex rescue missions.",     requiredPts: 2000 },
];

export default function RewardsPage() {
  const { currentUser, isAuthenticated } = useAppData();

  if (!isAuthenticated) return <Navigate to="/auth" replace />;

  const pts    = currentUser?.points ?? 0;
  const level  = getLevelFromPoints(pts);
  const pct    = getProgressPct(pts);
  const toNext = getPtsToNext(pts);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24 space-y-8">

      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-foreground tracking-tight">
          RES<span className="text-emergency">Q</span>REWARDS
        </h1>
        <p className="text-muted-foreground text-sm font-medium">
          Turn your impact into recognition and benefits.
        </p>
      </div>

      {/* Points / Level Card */}
      <Card className="bg-gradient-to-br from-emergency to-emergency/80 border-none shadow-2xl shadow-emergency/20 text-white overflow-hidden relative">
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <CardContent className="p-8 space-y-6 relative z-10">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-widest opacity-80 mb-1">Available Balance</p>
              <h2 className="text-5xl font-black">
                {pts.toLocaleString()} <span className="text-xl opacity-60">PTS</span>
              </h2>
            </div>
            <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl border border-white/20">
              <Trophy className="w-8 h-8 text-warning fill-warning" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold uppercase tracking-widest">
              <span>Level {level} Protector</span>
              <span>{toNext} pts to Level {level + 1}</span>
            </div>
            <Progress value={pct} className="h-3 bg-white/20" />
          </div>
        </CardContent>
      </Card>

      {/* Tiers / Badges */}
      <div className="space-y-6">
        <h3 className="text-lg font-black text-foreground flex items-center gap-2">
          <Star className="w-5 h-5 text-warning fill-warning" /> EARNED RECOGNITION
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {REWARD_TIERS.map((r, i) => {
            const unlocked = pts >= r.requiredPts;
            return (
              <motion.div
                key={i}
                whileHover={{ y: -5 }}
                className={`relative p-5 rounded-3xl border ${
                  unlocked
                    ? "bg-card border-border/50 shadow-sm"
                    : "bg-muted/5 border-border/30 opacity-60"
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-muted/20 flex items-center justify-center mb-4 mx-auto">
                  {r.icon}
                </div>
                <p className="text-[10px] font-black text-center uppercase tracking-tighter leading-tight">
                  {r.title}
                </p>
                <p className="text-[9px] text-center text-muted-foreground mt-1">
                  {r.requiredPts === 0 ? "Always unlocked" : `${r.requiredPts.toLocaleString()} pts`}
                </p>
                {!unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[1px] rounded-3xl">
                    <span className="text-[8px] font-black uppercase tracking-widest bg-muted px-2 py-1 rounded-full flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> Locked
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Benefits */}
      <div className="space-y-4">
        <h3 className="text-lg font-black text-foreground">AVAILABLE BENEFITS</h3>
        <div className="space-y-3">
          {BENEFITS.map((b, i) => {
            const canUnlock = pts >= b.requiredPts;
            return (
              <Card
                key={i}
                className={`border-border/50 overflow-hidden transition-colors ${
                  canUnlock ? "hover:border-success/40" : "opacity-70"
                }`}
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        canUnlock ? "bg-success/10" : "bg-muted/20"
                      }`}
                    >
                      {canUnlock
                        ? <CheckCircle2 className="w-5 h-5 text-success" />
                        : <Lock        className="w-5 h-5 text-muted-foreground" />
                      }
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{b.title}</h4>
                      <p className="text-[10px] text-muted-foreground">{b.desc}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    disabled={!canUnlock}
                    className={`rounded-full font-bold text-[10px] ${
                      canUnlock
                        ? "bg-emergency text-white hover:bg-emergency/90"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    }`}
                  >
                    {canUnlock ? "Unlock" : `${b.requiredPts.toLocaleString()} PTS`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="pt-8 text-center">
        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.3em] opacity-40">
          ResQLink Social Impact Ledger v1.2
        </p>
      </div>
    </div>
  );
}
