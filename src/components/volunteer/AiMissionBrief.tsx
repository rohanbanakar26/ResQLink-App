import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, CheckCircle2, Info } from "lucide-react";
import { motion } from "framer-motion";

interface AiMissionBriefProps {
  brief: string;
  reason: string;
  steps: string[];
}

export default function AiMissionBrief({ brief, reason, steps }: AiMissionBriefProps) {
  if (!brief && !reason && (!steps || steps.length === 0)) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <Card className="border-primary/20 bg-primary/5 overflow-hidden">
        <div className="bg-primary/10 px-4 py-2 flex items-center justify-between border-b border-primary/20">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">AI Smart Dispatch Info</span>
          </div>
          <Badge variant="outline" className="bg-background/50 text-[10px] h-5 border-primary/20 text-primary">
            Powered by Gemini
          </Badge>
        </div>
        <CardContent className="p-4 space-y-4">
          {/* Briefing Text */}
          <div className="space-y-1">
            <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
               Mission Brief
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed italic">
              "{brief || "Coordinating local response teams for immediate action."}"
            </p>
          </div>

          {/* Reasoning */}
          <div className="p-3 rounded-xl bg-background/50 border border-primary/10 flex gap-3">
             <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Info className="w-4 h-4 text-primary" />
             </div>
             <div>
                <p className="text-[10px] font-bold text-primary uppercase mb-0.5">Selection Rationale</p>
                <p className="text-xs text-foreground font-medium leading-tight">
                   {reason || "Your proximity and high trust score make you the ideal lead for this response."}
                </p>
             </div>
          </div>

          {/* Next Steps */}
          {steps && steps.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">AI Suggested Action List</p>
              <div className="grid gap-2">
                {steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 bg-card p-3 rounded-xl border border-border/50 group hover:border-primary/30 transition-all">
                    <div className="w-5 h-5 rounded-lg bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary transition-all flex-shrink-0">
                      {idx + 1}
                    </div>
                    <p className="text-xs text-foreground font-medium">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <div className="flex items-center justify-center gap-2 py-2">
         <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-border"></div>
         <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.2em] opacity-50 px-2 text-center">
            ResQLink AI Intelligence Layer
         </p>
         <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-border"></div>
      </div>
    </motion.div>
  );
}
