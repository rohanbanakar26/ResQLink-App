import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio, MapPin, Clock, Users, CheckCircle2, Filter, ChevronDown, MessageCircle, UserPlus, Zap } from "lucide-react";
import { useAppData } from "../../context/AppDataContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCategoryMeta, REQUEST_CATEGORIES, URGENCY_OPTIONS, STATUS_COPY, STATUS_COLORS } from "../../data/system";
import { formatDistance, haversineDistance } from "../../utils/geo";
import t from "@/utils/i18n";

export default function NgoRequestManager() {
  const { requests, nearbyRequests, volunteers, ngos, currentUser, location, acceptRequest, assignVolunteer, completeRequest } = useAppData();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const ngo = useMemo(() => ngos.find((n) => n.userId === currentUser?.userId), [ngos, currentUser]);

  const filteredRequests = useMemo(() => {
    let source = nearbyRequests;
    if (statusFilter === "active") source = source.filter((r) => r.status !== "Completed" && r.status !== "Cancelled");
    else if (statusFilter === "completed") source = source.filter((r) => r.status === "Completed");
    else if (statusFilter === "pending") source = source.filter((r) => r.status === "Created" || r.status === "Requested");
    if (categoryFilter !== "all") source = source.filter((r) => r.category === categoryFilter);
    if (priorityFilter !== "all") source = source.filter((r) => r.urgency === priorityFilter);
    return source;
  }, [nearbyRequests, categoryFilter, priorityFilter, statusFilter]);

  const availableVolunteers = useMemo(() => volunteers.filter((v) => v.available), [volunteers]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-foreground flex items-center gap-2">
          <Radio className="w-5 h-5 text-emergency" /> {t("ngo.allRequests")}
        </h2>
        <Badge variant="outline" className="text-[10px]">{filteredRequests.length} results</Badge>
      </div>

      {/* Filters */}
      <Card className="border-border/30">
        <CardContent className="p-3 flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
            <Filter className="w-3 h-3" /> Filters:
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-7 w-auto text-[10px] font-bold"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-7 w-auto text-[10px] font-bold"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {REQUEST_CATEGORIES.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.emoji} {c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-7 w-auto text-[10px] font-bold"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              {URGENCY_OPTIONS.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Request Cards */}
      <div className="space-y-3">
        <AnimatePresence>
          {filteredRequests.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No requests match your filters.</CardContent></Card>
          ) : (
            filteredRequests.map((req) => {
              const cat = getCategoryMeta(req.category);
              const dist = haversineDistance(location, req.location);
              const isExpanded = expandedId === req.id;
              const assignedVol = volunteers.find((v) => v.id === req.assignedVolunteerId);
              const timeSince = Math.round((Date.now() - req.createdAt) / 60000);

              return (
                <motion.div key={req.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  <Card className="border-border/30 overflow-hidden hover:border-emergency/20 transition-all">
                    <CardContent className="p-0">
                      {/* Header */}
                      <div
                        className="p-4 cursor-pointer flex items-start justify-between"
                        onClick={() => setExpandedId(isExpanded ? null : req.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center text-xl">{cat.emoji}</div>
                          <div>
                            <p className="text-sm font-bold text-foreground">{cat.label} — {req.citizenName || "Citizen"}</p>
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                              <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {timeSince}m ago</span>
                              {dist != null && <span className="flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {formatDistance(dist)}</span>}
                              {req.volunteersNeeded && <span className="flex items-center gap-0.5"><Users className="w-3 h-3" /> Needs {req.volunteersNeeded}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge variant="outline" className={`text-[8px] uppercase font-black ${STATUS_COLORS[req.urgency] || ""}`}>
                            {req.urgency}
                          </Badge>
                          <Badge variant="outline" className={`text-[8px] ${STATUS_COLORS[req.status] || ""}`}>
                            {STATUS_COPY[req.status] || req.status}
                          </Badge>
                          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 space-y-3 border-t border-border/20 pt-3">
                              <p className="text-sm text-muted-foreground">{req.description || "No description provided."}</p>

                              {/* Assigned Info */}
                              {assignedVol && (
                                <div className="flex items-center gap-2 bg-success/5 border border-success/20 rounded-lg p-2">
                                  <CheckCircle2 className="w-4 h-4 text-success" />
                                  <span className="text-xs font-bold text-foreground">Assigned: {assignedVol.name}</span>
                                  <span className="text-[10px] text-muted-foreground">⭐ {assignedVol.trustScore?.toFixed(1)}</span>
                                </div>
                              )}

                              {/* Actions */}
                              <div className="flex flex-wrap gap-2">
                                {(req.status === "Created" || req.status === "Requested") && (
                                  <Button size="sm" className="h-8 bg-emergency hover:bg-emergency/90 text-emergency-foreground rounded-lg" onClick={() => acceptRequest(req.id)}>
                                    <Zap className="w-3.5 h-3.5 mr-1" /> Accept Request
                                  </Button>
                                )}
                                {!assignedVol && (
                                  <Select onValueChange={(v) => assignVolunteer(req.id, v)}>
                                    <SelectTrigger className="h-8 w-auto text-xs rounded-lg">
                                      <UserPlus className="w-3 h-3 mr-1" />
                                      <SelectValue placeholder={t("ngo.assignManually")} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableVolunteers.map((v) => (
                                        <SelectItem key={v.id} value={v.id}>
                                          {v.name} · ⭐{v.trustScore?.toFixed(1)} · {v.completedTasks} tasks
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                                {req.status !== "Completed" && (
                                  <Button size="sm" variant="outline" className="h-8 rounded-lg text-success" onClick={() => completeRequest(req.id)}>
                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Complete
                                  </Button>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
