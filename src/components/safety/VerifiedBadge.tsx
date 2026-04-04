import { ShieldCheck } from "lucide-react";

interface VerifiedBadgeProps {
  type: "ngo" | "volunteer";
  size?: "sm" | "md";
}

export default function VerifiedBadge({ type, size = "sm" }: VerifiedBadgeProps) {
  const sizes = { sm: "w-3.5 h-3.5", md: "w-4.5 h-4.5" };
  const textSizes = { sm: "text-[10px]", md: "text-xs" };

  return (
    <span className="inline-flex items-center gap-0.5 text-info">
      <ShieldCheck className={sizes[size]} />
      <span className={`${textSizes[size]} font-medium`}>
        {type === "ngo" ? "Verified NGO" : "Verified"}
      </span>
    </span>
  );
}
