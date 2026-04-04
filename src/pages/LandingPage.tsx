import { useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppDataContext";
import { ROLE_OPTIONS } from "../data/system";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { AlertTriangle, Users, Building2, TrendingUp, ArrowRight, Zap } from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const } }),
};

const roleIcons: Record<string, any> = {
  citizen: AlertTriangle,
  volunteer: Users,
  ngo: Building2,
};

export default function LandingPage() {
  const navigate = useNavigate();
  const { activeRequests, volunteers, ngos, priorityZones } = useAppData();
  const topZone = priorityZones[0];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emergency/5 via-transparent to-accent/5" />
        <div className="relative max-w-5xl mx-auto px-4 pt-20 pb-16 text-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <Badge variant="outline" className="mb-6 border-emergency/30 text-emergency font-medium px-4 py-1.5">
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              Live Emergency Network
            </Badge>
          </motion.div>

          <motion.h1
            className="text-4xl md:text-6xl font-extrabold tracking-tight text-foreground leading-tight mb-6"
            variants={fadeUp} custom={1} initial="hidden" animate="visible"
          >
            Emergency help should move like a{" "}
            <span className="text-emergency">live network</span>, not a static website.
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10"
            variants={fadeUp} custom={2} initial="hidden" animate="visible"
          >
            Citizens report help needed, NGOs coordinate the response, and volunteers
            move in real time — from one shared map and request stream.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            variants={fadeUp} custom={3} initial="hidden" animate="visible"
          >
            <Button
              size="lg"
              className="bg-emergency hover:bg-emergency/90 text-emergency-foreground animate-pulse-emergency text-base px-8"
              onClick={() => navigate("/auth")}
            >
              <AlertTriangle className="w-5 h-5 mr-2" />
              Start emergency flow
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base px-8"
              onClick={() => navigate("/auth")}
            >
              Join the network
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Live Stats */}
      <section className="max-w-5xl mx-auto px-4 -mt-4 mb-16">
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
          initial="hidden" animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        >
          {[
            { label: "live requests", value: activeRequests.length, color: "text-emergency" },
            { label: "volunteers online", value: volunteers.length, color: "text-success" },
            { label: "NGOs connected", value: ngos.length, color: "text-info" },
            { label: "top zone priority", value: topZone?.priorityScore ?? 0, color: "text-warning" },
          ].map((stat) => (
            <motion.div key={stat.label} variants={fadeUp} custom={0}>
              <Card className="glass border-border/50">
                <CardContent className="p-4 text-center">
                  <p className={`text-2xl md:text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Priority Zone */}
      {topZone && (
        <section className="max-w-5xl mx-auto px-4 mb-16">
          <Card className="border-emergency/20 bg-emergency/5">
            <CardContent className="p-6">
              <Badge className="bg-emergency/10 text-emergency border-0 mb-3">Live allocation</Badge>
              <h2 className="text-xl font-bold text-foreground mb-2">{topZone.area || "Priority Zone"}</h2>
              <p className="text-muted-foreground">
                {topZone.activeRequests} active requests are pushing this area to the top of the queue.
              </p>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Roles */}
      <section className="max-w-5xl mx-auto px-4 pb-24">
        <div className="grid md:grid-cols-3 gap-4">
          {ROLE_OPTIONS.map((role, i) => {
            const Icon = roleIcons[role.id] || Users;
            return (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
              >
                <Card className="hover:shadow-lg transition-shadow cursor-pointer group h-full" onClick={() => navigate("/auth")}>
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-bold text-foreground mb-2">{role.shortLabel}</h3>
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
