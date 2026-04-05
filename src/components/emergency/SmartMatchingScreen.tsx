import { motion, AnimatePresence } from "framer-motion";
import { Loader2, MapPin, Users, CheckCircle2, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import t from "@/utils/i18n";

interface SmartMatchingScreenProps {
  onComplete: () => void;
}

const stages = [
  { key: "scanning", icon: MapPin, duration: 2000 },
  { key: "analyzing", icon: Sparkles, duration: 2500 },
  { key: "finding", icon: Users, duration: 2500 },
  { key: "assigning", icon: CheckCircle2, duration: 1500 },
] as const;

export default function SmartMatchingScreen({ onComplete }: SmartMatchingScreenProps) {
  const [stageIndex, setStageIndex] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let totalDelay = 0;
    const timers: NodeJS.Timeout[] = [];

    stages.forEach((stage, idx) => {
      totalDelay += stage.duration;
      timers.push(setTimeout(() => {
        if (idx < stages.length - 1) {
          setStageIndex(idx + 1);
        } else {
          setDone(true);
          setTimeout(onComplete, 1000);
        }
      }, totalDelay));
    });

    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  const currentStage = stages[stageIndex];
  const Icon = currentStage.icon;

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl flex flex-col items-center justify-center p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="relative mb-8">
        <motion.div
          className="absolute inset-0 rounded-full bg-emergency/20"
          animate={{
            scale: [1, 2.5, 1],
            opacity: [0.6, 0, 0.6],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{ width: 80, height: 80, margin: "auto", top: -10, left: -10 }}
        />
        <motion.div
          className="relative w-16 h-16 rounded-full bg-emergency flex items-center justify-center shadow-lg shadow-emergency/20"
          animate={done ? { scale: [1, 1.2, 1] } : { rotate: [0, 360] }}
          transition={done ? { duration: 0.5 } : { duration: 3, repeat: Infinity, ease: "linear" }}
        >
          {done ? (
            <CheckCircle2 className="w-8 h-8 text-white" />
          ) : (
            <Icon className="w-8 h-8 text-white" />
          )}
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={done ? "done" : currentStage.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="text-center"
        >
          <h2 className="text-xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
            {currentStage.key === "analyzing" && <Sparkles className="w-5 h-5 text-warning animate-pulse" />}
            {done ? "Help is on the way! ✓" : 
              currentStage.key === "scanning" ? "Scanning Location Map..." :
              currentStage.key === "analyzing" ? "Gemini AI Analyzing Request..." :
              currentStage.key === "finding" ? "Finding Best Qualified Help..." :
              "Assigning Your Response Team..."
            }
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            {done ? "A verified team has been dispatched to your location." : 
              currentStage.key === "analyzing" ? "Our AI is matching your needs with volunteer skills." :
              "Please stay calm. We are coordinating the fastest response."
            }
          </p>
        </motion.div>
      </AnimatePresence>

      <div className="flex gap-3 mt-8">
        {stages.map((_, idx) => (
          <motion.div
            key={idx}
            className={`w-2.5 h-2.5 rounded-full ${
              idx <= stageIndex ? "bg-emergency" : "bg-muted"
            }`}
            animate={idx === stageIndex && !done ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        ))}
      </div>
    </motion.div>
  );
}
