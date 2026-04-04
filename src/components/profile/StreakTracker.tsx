import { Flame } from "lucide-react";
import { motion } from "framer-motion";
import t from "@/utils/i18n";

interface StreakTrackerProps {
  streakDays: number;
}

export default function StreakTracker({ streakDays }: StreakTrackerProps) {
  if (streakDays <= 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl px-4 py-3"
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <Flame className="w-6 h-6 text-orange-500" />
      </motion.div>
      <div>
        <p className="text-sm font-bold text-foreground">
          {streakDays} {t("profile.streak")}
        </p>
        <p className="text-[10px] text-muted-foreground">Keep helping daily!</p>
      </div>
      <div className="flex gap-0.5 ml-auto">
        {Array.from({ length: Math.min(streakDays, 7) }).map((_, i) => (
          <motion.span
            key={i}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="text-sm"
          >
            🔥
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
}
