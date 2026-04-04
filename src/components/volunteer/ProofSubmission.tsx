import { useState } from "react";
import { motion } from "framer-motion";
import { Camera, CheckCircle2, Shield, X, Image as ImageIcon, Send, Star } from "lucide-react";
import { useAppData } from "../../context/AppDataContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface ProofSubmissionProps {
  requestId: string;
  onComplete: () => void;
  onCancel: () => void;
}

export default function ProofSubmission({ requestId, onComplete, onCancel }: ProofSubmissionProps) {
  const { requests, currentUser, completeRequest } = useAppData();
  const [photo, setPhoto] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const request = requests.find(r => r.id === requestId);

  const handleSubmit = async () => {
    setSubmitting(true);
    // Simulate API call
    await completeRequest(requestId);
    await new Promise(r => setTimeout(r, 1000));
    setSubmitting(false);
    setShowSuccess(true);
    setTimeout(() => {
       onComplete();
    }, 3000);
  };

  if (showSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6 text-center"
      >
        <div className="w-24 h-24 rounded-full bg-success/20 flex items-center justify-center mb-6">
           <CheckCircle2 className="w-12 h-12 text-success" />
        </div>
        <h2 className="text-3xl font-black text-foreground mb-2">MISSION ACCOMPLISHED</h2>
        <p className="text-muted-foreground mb-8">
           Your proof has been submitted for verification. 
           You've earned <span className="text-success font-bold">+50 Trust Points</span>.
        </p>
        <div className="flex items-center gap-2 bg-warning/10 px-4 py-2 rounded-full border border-warning/20">
           <Star className="w-5 h-5 text-warning fill-warning" />
           <span className="font-black text-warning">RANK UP: PROTECTOR II</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="fixed inset-x-0 bottom-0 top-0 z-[80] bg-background flex flex-col md:max-w-md md:mx-auto md:shadow-2xl"
    >
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
         <h2 className="text-lg font-black text-foreground flex items-center gap-2">
            <Shield className="w-5 h-5 text-emergency" /> Resolution Proof
         </h2>
         <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-full">
            <X className="w-5 h-5" />
         </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
         <div className="space-y-2">
            <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">Incident Reference</label>
            <div className="bg-muted/30 p-3 rounded-xl border border-border/50">
               <p className="text-sm font-bold text-foreground truncate">{request?.description}</p>
               <Badge variant="outline" className="mt-2 text-[8px] border-emergency text-emergency uppercase">{request?.category}</Badge>
            </div>
         </div>

         <div className="space-y-4">
            <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">Visual Evidence</label>
            {photo ? (
               <div className="relative aspect-square rounded-3xl overflow-hidden border-2 border-dashed border-border group">
                  <img src={photo} alt="Proof" className="w-full h-full object-cover" />
                  <button onClick={() => setPhoto(null)} className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-black/80 transition-colors">
                     <X className="w-4 h-4" />
                  </button>
               </div>
            ) : (
               <div 
                  className="aspect-square rounded-3xl border-2 border-dashed border-border flex flex-col items-center justify-center p-8 bg-muted/10 hover:bg-muted/20 transition-colors cursor-pointer group"
                  onClick={() => setPhoto("https://images.unsplash.com/photo-1594142465967-33491ba63920?q=80&w=1000&auto=format&fit=crop")} // Mock upload
               >
                  <div className="w-16 h-16 rounded-full bg-emergency/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                     <Camera className="w-8 h-8 text-emergency" />
                  </div>
                  <p className="text-sm font-bold text-foreground">Upload Photo</p>
                  <p className="text-xs text-muted-foreground text-center mt-2">Take a photo of the resolution or area to verify completion.</p>
               </div>
            )}
         </div>

         <div className="space-y-2">
            <label className="text-xs font-black text-muted-foreground uppercase tracking-widest">Resolution Notes</label>
            <Textarea 
               placeholder="Briefly describe what was done..." 
               className="min-h-[120px] rounded-2xl bg-muted/20 border-none focus:ring-2 focus:ring-emergency/20"
               value={description}
               onChange={(e) => setDescription(e.target.value)}
            />
         </div>
      </div>

      <div className="p-6 border-t border-border/50">
         <Button 
            disabled={!photo || !description.trim() || submitting}
            onClick={handleSubmit}
            className="w-full h-14 rounded-2xl bg-emergency hover:bg-emergency/90 text-white font-black text-lg shadow-xl shadow-emergency/20 group"
         >
            {submitting ? (
               <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  SUBMITTING...
               </div>
            ) : (
               <>
                  <Send className="w-5 h-5 mr-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  FINISH MISSION
               </>
            )}
         </Button>
      </div>
    </motion.div>
  );
}
