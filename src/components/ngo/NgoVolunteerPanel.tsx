import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Users, Star, MapPin, Shield, Crown, Ban, Search, CheckCircle2, Zap, UserPlus } from "lucide-react";
import { useAppData } from "../../context/AppDataContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDistance, haversineDistance } from "../../utils/geo";
import t from "@/utils/i18n";

export default function NgoVolunteerPanel() {
  const { volunteers, activeRequests, location, assignVolunteer } = useAppData();
  const [search, setSearch] = useState("");
  const [filterAvail, setFilterAvail] = useState("all");
  const [assigningVolId, setAssigningVolId] = useState<string | null>(null);

  const unassignedRequests = useMemo(() => activeRequests.filter((r) => !r.assignedVolunteerId), [activeRequests]);

  const filteredVolunteers = useMemo(() => {
    let list = volunteers.map((v) => ({
      ...v,
      distanceKm: haversineDistance(location, v.location),
    }));
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((v) => v.name.toLowerCase().includes(q) || v.skills.some((s) => s.toLowerCase().includes(q)));
    }
    if (filterAvail === "online") list = list.filter((v) => v.available);
    if (filterAvail === "busy") list = list.filter((v) => !v.available);
    return list.sort((a, b) => (b.trustScore ?? 0) - (a.trustScore ?? 0));
  }, [volunteers, search, filterAvail, location]);

  const onlineCount = volunteers.filter((v) => v.available).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-foreground flex items-center gap-2">
          <Users className="w-5 h-5 text-success" /> {t("ngo.volunteers")}
        </h2>
        <Badge variant="outline" className="text-[10px] border-success/30 text-success">{onlineCount} online</Badge>
      </div>

      {/* Search & Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or skill..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 text-xs rounded-lg"
          />
        </div>
        <Select value={filterAvail} onValueChange={setFilterAvail}>
          <SelectTrigger className="h-9 w-auto text-[10px] font-bold"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="online">🟢 Online</SelectItem>
            <SelectItem value="busy">🔴 Busy</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Volunteer List */}
      <div className="space-y-2">
        {filteredVolunteers.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No volunteers match your search.</CardContent></Card>
        ) : (
          filteredVolunteers.map((vol) => (
            <motion.div key={vol.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
              <Card className={`border-border/30 overflow-hidden transition-all ${vol.available ? "hover:border-success/30" : "opacity-70"}`}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${vol.available ? "bg-success/10 text-success border border-success/20" : "bg-muted/20 text-muted-foreground border border-border"}`}>
                        {vol.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold text-foreground">{vol.name}</p>
                          <span className={`w-2 h-2 rounded-full ${vol.available ? "bg-success" : "bg-muted-foreground"}`} />
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-0.5"><Star className="w-3 h-3 text-warning" /> {vol.trustScore?.toFixed(1)}</span>
                          <span>{vol.completedTasks} tasks</span>
                          {vol.distanceKm != null && (
                            <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {formatDistance(vol.distanceKm)}</span>
                          )}
                        </div>
                        {vol.skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {vol.skills.slice(0, 4).map((s) => (
                              <Badge key={s} variant="secondary" className="text-[8px] px-1.5 py-0">{s}</Badge>
                            ))}
                          </div>
                        )}
                        {vol.currentTaskId && (
                          <p className="text-[10px] text-info font-bold mt-1 flex items-center gap-0.5">
                            <Zap className="w-3 h-3" /> On active task
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {assigningVolId === vol.id ? (
                        <Select onValueChange={(rId) => { assignVolunteer(rId, vol.id); setAssigningVolId(null); }}>
                          <SelectTrigger className="h-7 w-auto text-[9px] font-bold"><SelectValue placeholder="Pick request" /></SelectTrigger>
                          <SelectContent>
                            {unassignedRequests.map((r) => (
                              <SelectItem key={r.id} value={r.id}>{r.category} — {r.citizenName || "Citizen"}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Button size="sm" variant="outline" className="h-7 rounded-lg text-[9px] font-bold" onClick={() => setAssigningVolId(vol.id)} disabled={!vol.available}>
                          <UserPlus className="w-3 h-3 mr-1" /> Assign
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
