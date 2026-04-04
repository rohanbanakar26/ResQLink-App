import { Star } from "lucide-react";

interface TrustStarsProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showNumber?: boolean;
}

export default function TrustStars({ score, size = "md", showNumber = true }: TrustStarsProps) {
  const starSizes = { sm: "w-3 h-3", md: "w-4 h-4", lg: "w-5 h-5" };
  const textSizes = { sm: "text-[10px]", md: "text-xs", lg: "text-sm" };
  const starClass = starSizes[size];
  const normalizedScore = Math.min(5, Math.max(0, score));
  const fullStars = Math.floor(normalizedScore);
  const hasHalf = normalizedScore - fullStars >= 0.3;

  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={`${starClass} ${
              i <= fullStars
                ? "fill-warning text-warning"
                : i === fullStars + 1 && hasHalf
                ? "fill-warning/40 text-warning"
                : "text-muted-foreground/20"
            }`}
          />
        ))}
      </div>
      {showNumber && (
        <span className={`${textSizes[size]} text-muted-foreground font-medium ml-0.5`}>
          {normalizedScore.toFixed(1)}
        </span>
      )}
    </div>
  );
}
