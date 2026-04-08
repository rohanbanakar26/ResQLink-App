import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, MapPin, Zap, ShieldCheck, Clock, AlertTriangle, X, LayoutDashboard } from "lucide-react";
import { useAppData } from "../../context/AppDataContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getCategoryMeta, STATUS_COLORS } from "../../data/system";
import TaskDetailView from "./TaskDetailView";

export default function VolunteerDashboard() {
  const { isAvailable, isToggling, toggleAvailable, nearbyRequests, activeRequests } = useAppData();
  const [filter, setFilter] = useState("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [declinedRequests, setDeclinedRequests] = useState<Set<string>>(new Set());

  const eligibleRequests = nearbyRequests.filter((r) => !declinedRequests.has(r.id) && r.status === "Waiting for volunteers");

  if (selectedTaskId) {
    return <TaskDetailView requestId={selectedTaskId} onBack={() => setSelectedTaskId(null)} />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24 space-y-6">
      {/* Top Bar / Header */}
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
                {isToggling ? "SYNCING..." : (isAvailable ? "AVAILABLE" : "OFFLINE")}
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

      {/* Stats Quick View */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-card border-border/50 shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Active</p>
            <p className="text-xl font-bold text-foreground">{activeRequests.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50 shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Nearby</p>
            <p className="text-xl font-bold text-foreground">{eligibleRequests.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border/50 shadow-sm">
          <CardContent className="p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1">Points</p>
            <p className="text-xl font-bold text-success-foreground">1,240</p>
          </CardContent>
        </Card>
      </div>

      {/* Availability Notice */}
      {!isAvailable && (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-warning/10 border border-warning/30 p-4 rounded-xl flex items-center gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0" />
            <p className="text-sm text-warning-foreground font-medium">
              You are currently offline. Toggle 'Available' to receive nearby emergency alerts.
            </p>
          </motion.div>
      )}

      {/* Section Header */}
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

      {/* Task Feed */}
      <div className="space-y-4">
        <AnimatePresence>
          {eligibleRequests.length > 0 ? (
            eligibleRequests
              .filter(r => filter === "all" || r.urgency === filter)
              .map((req) => (
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
                            <Clock className="w-3 h-3" /> Reported {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <Badge className={`${STATUS_COLORS[req.urgency] || "bg-info"} text-[10px] px-2 py-0.5 uppercase font-black tracking-widest`}>
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
                            setDeclinedRequests(prev => new Set(prev).add(req.id));
                          }}
                        >
                           <X className="w-4 h-4 mr-2 text-muted-foreground group-hover:text-destructive transition-colors" />
                           Decline
                        </Button>
                        <Button 
                          className="h-11 rounded-xl bg-emergency hover:bg-emergency/90 text-emergency-foreground font-bold shadow-lg shadow-emergency/20 group"
                          onClick={(e) => { e.stopPropagation(); setSelectedTaskId(req.id); }}
                        >
                           <CheckCircle2 className="w-4 h-4 mr-2 group-hover:scale-125 transition-transform" />
                           Accept Task
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
                No missions found in your immediate area. We'll alert you the moment someone needs help.
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
