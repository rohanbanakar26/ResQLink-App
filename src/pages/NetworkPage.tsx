import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAppData } from "../context/AppDataContext";
import { REQUEST_CATEGORIES } from "../data/system";
import { formatDistance, haversineDistance } from "../utils/geo";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Building2, Star, MapPin } from "lucide-react";

export default function NetworkPage() {
  const { ngos, volunteers, location, isAuthenticated } = useAppData();
  const [mode, setMode] = useState<"ngos" | "volunteers">("ngos");
  const [distanceLimit, setDistanceLimit] = useState(25);
  const [category, setCategory] = useState("all");

  const rows = mode === "ngos" ? ngos : volunteers;

  const filteredRows = useMemo(() => {
    return rows
      .map((item: any) => ({
        ...item,
        distanceKm: haversineDistance(location, item.location),
      }))
      .filter((item: any) => item.distanceKm == null || item.distanceKm <= distanceLimit)
      .filter((item: any) => {
        if (category === "all") return true;
        const haystack = [...(item.skills ?? []), ...(item.services ?? [])]
          .join(" ").toLowerCase();
        return haystack.includes(category);
      })
      .sort((a: any, b: any) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
  }, [rows, location, distanceLimit, category]);

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-6">
      <div>
        <Badge variant="outline" className="border-info/30 text-info mb-3">
          <Users className="w-3.5 h-3.5 mr-1" /> Smart discovery
        </Badge>
        <h1 className="text-2xl font-bold text-foreground">Network</h1>
        <p className="text-sm text-muted-foreground">Recommended near you, filtered by distance and category.</p>
      </div>

      {/* Toggle */}
      <div className="flex gap-2">
        <Button
          variant={mode === "ngos" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("ngos")}
          className={mode === "ngos" ? "bg-emergency hover:bg-emergency/90 text-emergency-foreground" : ""}
        >
          <Building2 className="w-4 h-4 mr-1" /> NGOs
        </Button>
        <Button
          variant={mode === "volunteers" ? "default" : "outline"}
          size="sm"
          onClick={() => setMode("volunteers")}
          className={mode === "volunteers" ? "bg-emergency hover:bg-emergency/90 text-emergency-foreground" : ""}
        >
          <Users className="w-4 h-4 mr-1" /> Volunteers
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <p className="text-xs font-medium text-foreground mb-2">Distance: {distanceLimit} km</p>
            <Slider
              value={[distanceLimit]}
              onValueChange={(v) => setDistanceLimit(v[0])}
              min={1}
              max={50}
              step={1}
            />
          </div>
          <div>
            <p className="text-xs font-medium text-foreground mb-2">Category</p>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {REQUEST_CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.emoji} {c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {filteredRows.length === 0 && (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No results match your filters.</CardContent></Card>
      )}

      <div className="space-y-3">
        {filteredRows.map((item: any) => (
          <Card key={item.id} className="border-border/50 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-foreground text-sm">{item.name || item.ngoName}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {(item.skills || item.services || []).slice(0, 3).map((s: string) => (
                      <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="w-3 h-3 text-warning" />
                    {item.trustScore?.toFixed(1)}
                  </div>
                  {item.distanceKm != null && (
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-0.5">
                      <MapPin className="w-3 h-3" /> {formatDistance(item.distanceKm)}
                    </p>
                  )}
                </div>
              </div>
              {mode === "volunteers" && (
                <p className="text-xs text-muted-foreground mt-2">
                  {item.completedTasks} tasks completed · {item.available ? "🟢 Available" : "🔴 Busy"}
                </p>
              )}
              {mode === "ngos" && (
                <p className="text-xs text-muted-foreground mt-2">
                  Capacity: {item.capacity}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
