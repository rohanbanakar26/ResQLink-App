import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SANITIZATION_TYPES, VOLUNTEERS_NEEDED_OPTIONS, AREA_SIZE_OPTIONS } from "@/data/system";
import { Input } from "@/components/ui/input";

interface SanitationFormProps {
  data: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

export default function SanitationForm({ data, onChange }: SanitationFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Type of issue</label>
        <Select value={data.sanitization_type || ""} onValueChange={(v) => onChange("sanitization_type", v)}>
          <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
          <SelectContent>
            {SANITIZATION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Area size</label>
        <Select value={data.area_size || ""} onValueChange={(v) => onChange("area_size", v)}>
          <SelectTrigger><SelectValue placeholder="How large is the affected area?" /></SelectTrigger>
          <SelectContent>
            {AREA_SIZE_OPTIONS.map((o) => (
              <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
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

      <p className="text-xs text-emergency font-medium">📸 Photo/video proof is required for sanitation reports</p>
    </div>
  );
}
