import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PEOPLE_AFFECTED_OPTIONS, VOLUNTEERS_NEEDED_OPTIONS, FOOD_TYPE_OPTIONS } from "@/data/system";
import { Input } from "@/components/ui/input";

interface FoodFormProps {
  data: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

export default function FoodForm({ data, onChange }: FoodFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">People affected</label>
        <Select value={data.people_affected || ""} onValueChange={(v) => onChange("people_affected", v)}>
          <SelectTrigger><SelectValue placeholder="How many people need food?" /></SelectTrigger>
          <SelectContent>
            {PEOPLE_AFFECTED_OPTIONS.map((o) => (
              <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Type of food needed</label>
        <Select value={data.food_type_needed || ""} onValueChange={(v) => onChange("food_type_needed", v)}>
          <SelectTrigger><SelectValue placeholder="Select food type" /></SelectTrigger>
          <SelectContent>
            {FOOD_TYPE_OPTIONS.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Volunteers needed</label>
        <Select value={data.volunteers_needed || ""} onValueChange={(v) => onChange("volunteers_needed", v)}>
          <SelectTrigger><SelectValue placeholder="How many volunteers?" /></SelectTrigger>
          <SelectContent>
            {VOLUNTEERS_NEEDED_OPTIONS.map((o) => (
              <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Nearby landmark</label>
        <Input
          placeholder="Near school / temple / hospital..."
          value={data.landmark || ""}
          onChange={(e) => onChange("landmark", e.target.value)}
        />
      </div>
    </div>
  );
}
