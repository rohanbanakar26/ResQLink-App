import { getLanguage } from "@/utils/i18n";
import { BADGES } from "@/utils/badges";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import t from "@/utils/i18n";

interface BadgeGridProps {
  earnedBadgeIds: string[];
}

export default function BadgeGrid({ earnedBadgeIds }: BadgeGridProps) {
  const lang = getLanguage();

  return (
    <div>
      <h3 className="text-sm font-medium text-foreground mb-3">{t("profile.badges")}</h3>
      <div className="grid grid-cols-4 gap-2">
        {BADGES.map((badge, i) => {
          const earned = earnedBadgeIds.includes(badge.id);
          return (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className={`${earned ? "border-warning/30 bg-warning/5" : "border-border/50 opacity-40"} transition-all`}>
                <CardContent className="p-2 text-center">
                  <span className="text-2xl block mb-1">{badge.emoji}</span>
                  <p className="text-[9px] font-medium text-foreground leading-tight">
                    {lang === "hi" ? badge.nameHi : badge.name}
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
