import { useParams, Navigate, useNavigate } from "react-router-dom";
import { useAppData } from "@/context/AppDataContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Shield, Building2, MapPin, Heart, UserPlus, UserCheck, ChevronLeft } from "lucide-react";
import TrustStars from "@/components/profile/TrustStars";
import t from "@/utils/i18n";

export default function PublicProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { ngos, volunteers, currentUser, followingList, toggleFollow } = useAppData();

  if (!id) return <Navigate to="/network" replace />;

  const ngo = ngos.find(n => n.id === id);
  const volunteer = volunteers.find(v => v.id === id);
  
  const publicUser = ngo 
    ? { role: "ngo", id: ngo.id, name: ngo.ngoName, services: ngo.services, trustScore: ngo.trustScore, followersCount: ngo.followersCount, distanceKm: ngo.distanceKm } 
    : volunteer
      ? { role: "volunteer", id: volunteer.id, name: volunteer.name, services: volunteer.skills, trustScore: volunteer.trustScore, followersCount: volunteer.followersCount, distanceKm: volunteer.distanceKm }
      : null;

  if (!publicUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-muted/10 flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
          <User className="w-10 h-10 text-muted-foreground/30" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Profile Not Found</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            This user might be offline or their privacy settings restrict public viewing.
          </p>
        </div>
        <Button onClick={() => navigate(-1)} variant="outline" className="rounded-xl">
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-32 space-y-8">
      {/* Back nav */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      {/* Profile Header */}
      <div className="flex flex-col items-center text-center space-y-4 pt-4">
        <div className="relative group">
          <div className="w-28 h-28 rounded-full bg-muted/20 border-4 border-emergency/20 overflow-hidden shadow-2xl relative flex items-center justify-center">
             {publicUser.role === "ngo" ? <Building2 className="w-12 h-12 text-muted-foreground/30" /> : <User className="w-16 h-16 text-muted-foreground/30" />}
          </div>
          <Badge className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-emergency font-black px-4 shadow-lg uppercase tracking-widest text-[10px]">
             {publicUser.role}
          </Badge>
        </div>
        
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">{publicUser.name}</h1>
          <div className="flex items-center justify-center gap-2 mt-1">
             <TrustStars score={publicUser.trustScore} size="md" />
             <span className="text-xs font-bold text-muted-foreground uppercase opacity-60 tracking-wider">Verified {publicUser.role}</span>
          </div>
          <div className="mt-4 flex flex-col items-center gap-3">
             <Badge variant="secondary" className="text-[11px] py-1 px-3">
                <Heart className="w-3.5 h-3.5 mr-1 text-emergency"/> {publicUser.followersCount || 0} Followers
             </Badge>
             
             {currentUser?.role === "citizen" && (
                <Button 
                   size="sm" 
                   variant={followingList.includes(publicUser.id) ? "secondary" : "default"}
                   className={`h-9 px-6 rounded-full font-bold uppercase tracking-wider text-[10px] ${followingList.includes(publicUser.id) ? "shadow-inner border" : "shadow-lg shadow-primary/20"}`}
                   onClick={() => toggleFollow(publicUser.id, publicUser.role as any)}
                >
                   {followingList.includes(publicUser.id) ? (
                     <><UserCheck className="w-4 h-4 mr-1.5" /> Following</>
                   ) : (
                     <><UserPlus className="w-4 h-4 mr-1.5" /> Follow</>
                   )}
                </Button>
             )}
          </div>
        </div>
      </div>

      {/* General Information */}
      <div className="space-y-4 bg-muted/10 p-6 rounded-3xl border border-border/40">
         <h3 className="text-xs font-black text-foreground uppercase tracking-[0.2em] mb-4 text-center">Public Capabilities</h3>
         
         <div className="flex flex-wrap items-center justify-center gap-2">
            {publicUser.services?.map(skill => (
              <Badge key={skill} variant="outline" className="bg-card py-1.5 px-3 shadow-sm">{skill}</Badge>
            ))}
            {(!publicUser.services || publicUser.services.length === 0) && (
              <span className="text-xs text-muted-foreground italic">No specialized capabilities listed.</span>
            )}
         </div>

         {publicUser.distanceKm != null && (
            <div className="pt-6 mt-4 border-t border-border/40 flex justify-center">
              <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary" /> {publicUser.distanceKm.toFixed(1)} km away
              </div>
            </div>
         )}
      </div>
    </div>
  );
}
