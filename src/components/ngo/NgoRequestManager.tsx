import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Radio, MapPin, Clock, Users, CheckCircle2, Filter, ChevronDown,
  MessageCircle, UserPlus, Zap, Bell, ChevronRight, AlertCircle,
} from "lucide-react";
import { useAppData } from "../../context/AppDataContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getCategoryMeta, REQUEST_CATEGORIES, URGENCY_OPTIONS, STATUS_COPY, STATUS_COLORS } from "../../data/system";
import { formatDistance, haversineDistance } from "../../utils/geo";
import AssignmentPipelineView from "./AssignmentPipelineView";
import t from "@/utils/i18n";

type TabType = "new" | "active" | "completed" | "all";

export default function NgoRequestManager() {
  const {
    requests, nearbyRequests, volunteers, ngos,
    currentUser, location, acceptRequest, assignVolunteer, completeRequest,
  } = useAppData();

  const [activeTab, setActiveTab] = useState<TabType>("new");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pipelineRequestId, setPipelineRequestId] = useState<string | null>(null);

  const ngo = useMemo(() => ngos.find((n) => n.userId === currentUser?.userId), [ngos, currentUser]);

  // ── Tabs ────────────────────────────────────────────────────────────────
  const newRequests = useMemo(
    () =>
      nearbyRequests.filter(
        (r) => r.status === "Created" || r.status === "Requested"
      ),
    [nearbyRequests]
  );

  const activeRequests = useMemo(
    () =>
      nearbyRequests.filter(
        (r) =>
          r.status !== "Completed" &&
          r.status !== "Cancelled" &&
          r.status !== "Created" &&
          r.status !== "Requested"
      ),
    [nearbyRequests]
  );

  const completedRequests = useMemo(
    () => nearbyRequests.filter((r) => r.status === "Completed" || r.status === "Cancelled"),
    [nearbyRequests]
  );

  const tabCounts: Record<TabType, number> = {
    new: newRequests.length,
    active: activeRequests.length,
    completed: completedRequests.length,
    all: nearbyRequests.length,
  };

  function getTabSource(): typeof nearbyRequests {
    switch (activeTab) {
      case "new": return newRequests;
      case "active": return activeRequests;
      case "completed": return completedRequests;
      default: return nearbyRequests;
    }
  }

  const filteredRequests = useMemo(() => {
    let source = getTabSource();
    if (categoryFilter !== "all") source = source.filter((r) => r.category === categoryFilter);
    if (priorityFilter !== "all") source = source.filter((r) => r.urgency === priorityFilter);
    return source;
  }, [nearbyRequests, activeTab, categoryFilter, priorityFilter]);

  const availableVolunteers = useMemo(() => volunteers.filter((v) => v.available), [volunteers]);

  const TABS: { id: TabType; label: string; pulse?: boolean }[] = [
    { id: "new", label: "New", pulse: newRequests.length > 0 },
    { id: "active", label: "Active" },
    { id: "completed", label: "Done" },
    { id: "all", label: "All" },
  ];

  // ── Pipeline overlay ────────────────────────────────────────────────────
  const pipelineRequest = pipelineRequestId
    ? requests.find((r) => r.id === pipelineRequestId) || null
    : null;

  if (pipelineRequest) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-xs"
            onClick={() => setPipelineRequestId(null)}
          >
            ← Back
          </Button>
          <p className="text-sm font-bold text-foreground truncate">
            {getCategoryMeta(pipelineRequest.category).emoji} {getCategoryMeta(pipelineRequest.category).label} — Pipeline
          </p>
        </div>
        <AssignmentPipelineView request={pipelineRequest} onClose={() => setPipelineRequestId(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-foreground flex items-center gap-2">
          <Radio className="w-5 h-5 text-emergency" /> {t("ngo.allRequests")}
        </h2>
        <Badge variant="outline" className="text-[10px]">{filteredRequests.length} results</Badge>
      </div>

      {/* Tabs */}
      <div className="flex bg-muted/30 rounded-xl p-1 gap-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex-1 text-[11px] font-bold py-1.5 px-2 rounded-lg transition-all ${
              activeTab === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {tabCounts[tab.id] > 0 && (
              <span
                className={`ml-1 text-[9px] font-black px-1 py-0.5 rounded-full inline-block ${
                  activeTab === tab.id ? "bg-emergency/10 text-emergency" : "bg-muted/50 text-muted-foreground"
                }`}
              >
                {tabCounts[tab.id]}
              </span>
            )}
            {/* Pulse dot for new requests */}
            {tab.pulse && activeTab !== tab.id && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emergency animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-border/30">
        <CardContent className="p-3 flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase">
            <Filter className="w-3 h-3" /> Filters:
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-7 w-auto text-[10px] font-bold">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {REQUEST_CATEGORIES.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.emoji} {c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-7 w-auto text-[10px] font-bold">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
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
            <Card>
              <CardContent className="p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-3 opacity-50">
                  {activeTab === "new" ? <Bell className="w-6 h-6 text-muted-foreground" /> : <Radio className="w-6 h-6 text-muted-foreground" />}
                </div>
                <p className="text-sm text-muted-foreground">
                  {activeTab === "new" ? "No new requests in your area." : "No requests match your filters."}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredRequests.map((req) => {
              const cat = getCategoryMeta(req.category);
              const dist = haversineDistance(location, req.location);
              const isExpanded = expandedId === req.id;
              const timeSince = Math.round((Date.now() - req.createdAt) / 60000);
              const assignedVol = volunteers.find((v) => v.id === req.assignedVolunteerId);

              // Is this NGO already participating?
              const ngoAlreadyParticipating = ngo
                ? (req.participatingNgoIds || []).includes(ngo.id)
                : false;
              // Is another NGO already the primary?
              const anotherNgoIsPrimary = !!req.ngoId && req.ngoId !== ngo?.id;
              const isShortage = req.status === "Awaiting more volunteers";

              return (
                <motion.div
                  key={req.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <Card
                    className={`border-border/30 overflow-hidden transition-all ${
                      activeTab === "new"
                        ? "hover:border-emergency/30 ring-1 ring-emergency/10"
                        : "hover:border-border/60"
                    }`}
                  >
                    <CardContent className="p-0">
                      {/* Urgency Strip */}
                      {activeTab === "new" && (
                        <div className={`h-1 w-full ${req.urgency === "critical" ? "bg-emergency animate-pulse" : req.urgency === "high" ? "bg-orange-400" : "bg-info"}`} />
                      )}

                      {/* Header Row */}
                      <div
                        className="p-4 cursor-pointer flex items-start justify-between"
                        onClick={() => setExpandedId(isExpanded ? null : req.id)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center text-xl">
                            {cat.emoji}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">
                              {cat.label} — {req.citizenName || "Citizen"}
                            </p>
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                              <span className="flex items-center gap-0.5">
                                <Clock className="w-3 h-3" /> {timeSince}m ago
                              </span>
                              {dist != null && (
                                <span className="flex items-center gap-0.5">
                                  <MapPin className="w-3 h-3" /> {formatDistance(dist)}
                                </span>
                              )}
                              {req.volunteersNeeded && (
                                <span className="flex items-center gap-0.5">
                                  <Users className="w-3 h-3" /> Needs {req.volunteersNeeded}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            variant="outline"
                            className={`text-[8px] uppercase font-black ${STATUS_COLORS[req.urgency] || ""}`}
                          >
                            {req.urgency}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-[8px] ${
                              isShortage
                                ? "border-warning/30 text-warning animate-pulse"
                                : STATUS_COLORS[req.status] || ""
                            }`}
                          >
                            {isShortage ? "⚠️ Shortage" : STATUS_COPY[req.status] || req.status}
                          </Badge>
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          />
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
                              <p className="text-sm text-muted-foreground">
                                {req.description || "No description provided."}
                              </p>

                              {/* Shortage info */}
                              {isShortage && (
                                <div className="flex items-start gap-2 bg-warning/5 border border-warning/20 rounded-lg p-2.5">
                                  <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-xs font-bold text-warning">Volunteer Shortage</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      This request still needs{" "}
                                      <strong>{req.remainingVolunteersNeeded || "more"}</strong> volunteer(s).
                                      Your NGO can contribute to fill the gap.
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Assigned Info */}
                              {assignedVol && (
                                <div className="flex items-center gap-2 bg-success/5 border border-success/20 rounded-lg p-2">
                                  <CheckCircle2 className="w-4 h-4 text-success" />
                                  <span className="text-xs font-bold text-foreground">
                                    Leader: {assignedVol.name}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    ⭐ {assignedVol.trustScore?.toFixed(1)}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground ml-auto">
                                    Team: {(req.assignedVolunteerIds || []).length}/{req.volunteersNeeded}
                                  </span>
                                </div>
                              )}

                              {/* Actions */}
                              <div className="flex flex-wrap gap-2">
                                {/* Accept / Help Fill */}
                                {!ngoAlreadyParticipating && (
                                  <>
                                    {(req.status === "Created" || req.status === "Requested") && (
                                      <Button
                                        size="sm"
                                        className="h-8 bg-emergency hover:bg-emergency/90 text-emergency-foreground rounded-lg font-bold"
                                        onClick={() => acceptRequest(req.id)}
                                      >
                                        <Zap className="w-3.5 h-3.5 mr-1" />
                                        Accept & Auto-Assign
                                      </Button>
                                    )}
                                    {isShortage && (
                                      <Button
                                        size="sm"
                                        className="h-8 bg-warning hover:bg-warning/90 text-warning-foreground rounded-lg font-bold"
                                        onClick={() => acceptRequest(req.id)}
                                      >
                                        <Users className="w-3.5 h-3.5 mr-1" />
                                        Help Fill {req.remainingVolunteersNeeded} Slot(s)
                                      </Button>
                                    )}
                                  </>
                                )}

                                {/* Already participating */}
                                {ngoAlreadyParticipating && (
                                  <Badge className="bg-success/10 text-success border-success/20 text-[10px]">
                                    <CheckCircle2 className="w-3 h-3 mr-1" /> Your NGO is participating
                                  </Badge>
                                )}

                                {/* View Pipeline */}
                                {req.status !== "Created" && req.status !== "Requested" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 rounded-lg text-[10px] font-bold"
                                    onClick={() => setPipelineRequestId(req.id)}
                                  >
                                    <ChevronRight className="w-3.5 h-3.5 mr-1" />
                                    View Assignment Pipeline
                                  </Button>
                                )}

                                {/* Manual volunteer override */}
                                {(ngoAlreadyParticipating || !anotherNgoIsPrimary) && !assignedVol && (
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
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 rounded-lg text-success"
                                    onClick={() => completeRequest(req.id)}
                                  >
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
