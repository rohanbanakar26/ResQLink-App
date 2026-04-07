import { useMemo, useState, useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAppData } from "@/context/AppDataContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { User, Shield, Trophy, Settings, LogOut, ChevronRight, Zap, ArrowRight, Star, Loader2, Heart, UserCheck, Building2 } from "lucide-react";
import { motion } from "framer-motion";
import BadgeGrid from "@/components/profile/BadgeGrid";
import StreakTracker from "@/components/profile/StreakTracker";
import TrustStars from "@/components/profile/TrustStars";
import t from "@/utils/i18n";

export default function ProfilePage() {
  const { currentUser, logout, isAvailable, isAuthenticated, loading, followingList, ngos, volunteers } = useAppData();
  
  const followersCount = useMemo(() => {
    if (currentUser?.role === "ngo") return ngos.find(n => n.userId === currentUser.userId)?.followersCount || 0;
    if (currentUser?.role === "volunteer") return volunteers.find(v => v.userId === currentUser.userId)?.followersCount || 0;
    return 0;
  }, [currentUser, ngos, volunteers]);

  const [followerDetails, setFollowerDetails] = useState<{ id: string; name: string; role: string; type?: string }[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!dialogOpen) return;
    
    if (currentUser?.role === "citizen") {
      const combined = [
        ...ngos.filter(n => followingList.includes(n.id)).map(n => ({ id: n.id, name: n.ngoName, role: "ngo", type: "ngo" })),
        ...volunteers.filter(v => followingList.includes(v.id)).map(v => ({ id: v.id, name: v.name, role: "volunteer", type: "volunteer" }))
      ];
      setFollowerDetails(combined);
      return;
    }

    const fetchFollowers = async () => {
      setLoadingFollowers(true);
      try {
        let myId = "";
        if (currentUser?.role === "ngo") myId = ngos.find(n => n.userId === currentUser.userId)?.id || "";
        if (currentUser?.role === "volunteer") myId = volunteers.find(v => v.userId === currentUser.userId)?.id || "";
        
        if (!myId) {
          setLoadingFollowers(false);
          return;
        }

        const q = query(collection(db, "user_follows"), where("target_id", "==", myId));
        const snap = await getDocs(q);
        const userIds = snap.docs.map(d => d.data().user_id);
        
        const details = [];
        for (const uid of userIds) {
          const pRef = doc(db, "profiles", uid);
          const pSnap = await getDoc(pRef);
          if (pSnap.exists()) {
             details.push({ id: uid, name: pSnap.data().full_name || pSnap.data().email?.split("@")[0] || "Citizen", role: pSnap.data().role || "citizen", type: pSnap.data().role });
          }
        }
        setFollowerDetails(details);
      } catch (e) {
        console.error("Error fetching followers:", e);
      }
      setLoadingFollowers(false);
    };

    fetchFollowers();
  }, [dialogOpen, currentUser, followingList, ngos, volunteers]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 text-emergency animate-spin" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse tracking-widest uppercase">
          Loading Security Profile...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-muted/10 flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
          <User className="w-10 h-10 text-muted-foreground/30" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Profile Not Found</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            We couldn't synchronize your secure profile. Please try signing out and registering a new account.
          </p>
        </div>
        <Button onClick={logout} variant="outline" className="rounded-xl">
          <LogOut className="w-4 h-4 mr-2" /> Sign Out
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-32 space-y-8">
      {/* Profile Header */}
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="relative group">
          <div className="w-28 h-28 rounded-full bg-muted/20 border-4 border-emergency/20 overflow-hidden shadow-2xl relative flex items-center justify-center">
             <User className="w-16 h-16 text-muted-foreground/30" />
             {currentUser.role === "volunteer" && isAvailable && (
                <div className="absolute inset-0 border-4 border-success animate-pulse rounded-full" />
             )}
          </div>
          <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-emergency font-black px-4 shadow-lg uppercase tracking-widest text-[10px]">
             {currentUser.role}
          </Badge>
        </div>
        
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">{currentUser.name}</h1>
          <div className="flex items-center justify-center gap-2 mt-1">
             <TrustStars score={4.8} size="md" />
             <span className="text-xs font-bold text-muted-foreground uppercase opacity-60 tracking-wider">Level 12 Protector</span>
          </div>
          <div className="mt-3 flex justify-center items-center gap-2">
             <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
               <DialogTrigger asChild>
                 <div className="inline-block cursor-pointer">
                   {currentUser.role === "citizen" ? (
                     <Badge variant="outline" className="text-xs py-1 hover:bg-muted transition-colors"><UserCheck className="w-3.5 h-3.5 mr-1 text-emergency"/> {followingList.length} Following</Badge>
                   ) : (
                     <Badge variant="secondary" className="text-xs py-1 hover:bg-secondary/80 transition-colors"><Heart className="w-3.5 h-3.5 mr-1 text-emergency"/> {followersCount} Followers</Badge> 
                   )}
                 </div>
               </DialogTrigger>
               <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-md">
                 <DialogHeader>
                   <DialogTitle className="text-xl font-black uppercase tracking-wider">{currentUser.role === "citizen" ? "Following" : "Followers"}</DialogTitle>
                 </DialogHeader>
                 <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 mt-2">
                    {loadingFollowers ? (
                      <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                    ) : followerDetails.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground font-bold">
                        {currentUser.role === "citizen" ? "You are not following anyone yet." : "No followers yet."}
                      </p>
                    ) : (
                      followerDetails.map((f, i) => (
                        <motion.div key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                          <Card className="border-border/40 shadow-sm bg-card hover:bg-muted/30 transition-colors">
                            <CardContent className="p-3 flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-emergency/10 flex items-center justify-center text-emergency border border-emergency/20">
                                {f.role === "ngo" ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-black text-foreground tracking-tight">{f.name}</p>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{f.role}</p>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))
                    )}
                 </div>
               </DialogContent>
             </Dialog>
          </div>
        </div>
      </div>

      {/* Stats Quick View */}
      <div className="grid grid-cols-2 gap-4">
         <Link to="/rewards" className="block group">
            <Card className="bg-gradient-to-br from-warning/10 to-warning/20 border-warning/20 group-hover:border-warning/40 transition-all shadow-xl shadow-warning/5 overflow-hidden relative h-full">
               <CardContent className="p-5">
                  <Trophy className="w-8 h-8 text-warning mb-2 group-hover:scale-125 transition-transform" />
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Impact Points</p>
                  <p className="text-2xl font-black text-foreground">{currentUser.points.toLocaleString()} <span className="text-[10px] text-success">+50 today</span></p>
                  <ChevronRight className="absolute top-4 right-4 w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
               </CardContent>
            </Card>
         </Link>
         <Card className="bg-gradient-to-br from-emergency/10 to-emergency/20 border-emergency/20 shadow-xl shadow-emergency/5 relative overflow-hidden h-full">
            <CardContent className="p-5">
               <Shield className="w-8 h-8 text-emergency mb-2" />
               <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Trust Store</p>
               <p className="text-2xl font-black text-foreground">98 <span className="text-[10px] text-muted-foreground">/ 100</span></p>
               <Zap className="absolute top-4 right-4 w-5 h-5 text-warning fill-warning opacity-50" />
            </CardContent>
         </Card>
      </div>

      {/* Badges Section */}
      <div className="space-y-4">
         <div className="flex justify-between items-center px-1">
            <h3 className="text-sm font-black text-foreground uppercase tracking-[0.2em]">Honorary Badges</h3>
            <Link to="/rewards" className="text-[10px] font-bold text-emergency hover:underline uppercase tracking-widest">See all</Link>
         </div>
         <Card className="bg-card border-border/50 shadow-sm rounded-3xl overflow-hidden">
            <CardContent className="p-6">
                <BadgeGrid earnedBadgeIds={currentUser.earnedBadgeIds} />
            </CardContent>
         </Card>
      </div>

      {/* Streak Tracker */}
      <div className="space-y-4">
         <h3 className="text-sm font-black text-foreground uppercase tracking-[0.2em] px-1">Engagement Activity</h3>
         <StreakTracker streakDays={currentUser.streakDays} />
      </div>

      {/* Settings / Actions */}
      <div className="space-y-3 pt-6">
         <Link to="/settings">
            <Button variant="outline" className="w-full h-14 rounded-2xl border-border/50 bg-card hover:bg-muted/50 transition-all justify-between px-6 group shadow-sm">
               <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-xl bg-muted/40 flex items-center justify-center">
                     <Settings className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="font-bold text-sm">System Settings</span>
               </div>
               <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </Button>
         </Link>
         <Button 
           variant="ghost" 
           onClick={logout}
           className="w-full h-14 rounded-2xl text-destructive hover:text-destructive hover:bg-destructive/10 transition-all justify-between px-6 font-bold group"
         >
            <div className="flex items-center gap-4">
               <div className="w-8 h-8 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <LogOut className="w-4 h-4" />
               </div>
               <span>Sign Out Securely</span>
            </div>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
         </Button>
      </div>

      <div className="text-center">
         <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.25em] opacity-40">
            ResQLink Humanitarian ID: #{currentUser.userId.slice(0, 8).toUpperCase()}
         </p>
      </div>
    </div>
  );
}
