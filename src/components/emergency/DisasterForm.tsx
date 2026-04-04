import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DISASTER_TYPES, PEOPLE_AFFECTED_OPTIONS, VOLUNTEERS_NEEDED_OPTIONS } from "@/data/system";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface DisasterFormProps {
  data: Record<string, any>;
  onChange: (field: string, value: any) => void;
}

export default function DisasterForm({ data, onChange }: DisasterFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Type of disaster</label>
        <Select value={data.disaster_type || ""} onValueChange={(v) => onChange("disaster_type", v)}>
          <SelectTrigger><SelectValue placeholder="Select disaster type" /></SelectTrigger>
          <SelectContent>
            {DISASTER_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">Severity level</label>
        <div className="flex gap-2">
          {(["high", "medium", "low"] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => onChange("severity_level", level)}
              className={`flex-1 rounded-lg py-2.5 px-3 text-xs font-medium border transition-all ${
                data.severity_level === level
                  ? level === "high"
                    ? "border-emergency bg-emergency/10 text-emergency"
                    : level === "medium"
                    ? "border-warning bg-warning/10 text-warning"
                    : "border-success bg-success/10 text-success"
                  : "border-border bg-card text-muted-foreground hover:border-border/80"
              }`}
            >
              {level === "high" ? "🔴 High" : level === "medium" ? "🟡 Medium" : "🟢 Low"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">People affected</label>
        <Select value={data.people_affected || ""} onValueChange={(v) => onChange("people_affected", v)}>
          <SelectTrigger><SelectValue placeholder="How many people affected?" /></SelectTrigger>
          <SelectContent>
            {PEOPLE_AFFECTED_OPTIONS.map((o) => (
              <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-3 rounded-lg border border-border p-3 bg-card">
        <Switch
          checked={data.immediate_danger || false}
          onCheckedChange={(v) => onChange("immediate_danger", v)}
          id="immediate-danger"
        />
        <Label htmlFor="immediate-danger" className="text-sm cursor-pointer">
          Immediate danger to life? (Yes/No)
        </Label>
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
