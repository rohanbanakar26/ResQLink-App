import { useMemo, useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppDataContext";
import { getCategoryMeta, STATUS_COPY } from "../data/system";
import { formatDistance, haversineDistance, getDirectionsUrl } from "../utils/geo";
import { db } from "@/lib/firebase";
import { doc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Navigation, CheckCircle2, Play, UserCheck, Clock, MessageCircle, Phone, Car, Flag, TrendingUp, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CompletionFlow from "@/components/requests/CompletionFlow";
import RatingModal from "@/components/requests/RatingModal";
import ReportMisuseModal from "@/components/safety/ReportMisuseModal";
import t from "@/utils/i18n";

export default function RequestsPage() {
  const navigate = useNavigate();
  const {
    currentUser, isAuthenticated, location, requests, nearbyRequests,
    myRequests, volunteers, acceptRequest, assignVolunteer, volunteerAdvance, completeRequest,
    rejectTask, citizenFinalize, myAssignedRequests, rateTask
  } = useAppData();
  const [ratingRequest, setRatingRequest] = useState<string | null>(null);
  const [reportRequest, setReportRequest] = useState<string | null>(null);
  const [declinedRequests, setDeclinedRequests] = useState<Set<string>>(new Set());

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  const role = currentUser?.role ?? "citizen";
  const userId = currentUser?.userId;

  const activeRequests = useMemo(() => {
    const source = role === "citizen" || role === "ngo" ? myRequests : myAssignedRequests;
    return source.filter((r: any) => !declinedRequests.has(r.id) && r.status !== "Completed" && r.status !== "Cancelled");
  }, [role, myRequests, myAssignedRequests, declinedRequests]);

  const completedRequests = useMemo(() => {
    const source = role === "citizen" || role === "ngo" ? myRequests : myAssignedRequests;
    return source.filter((r: any) => r.status === "Completed");
  }, [role, myRequests, myAssignedRequests]);

  const cancelledRequests = useMemo(() => {
    const source = role === "citizen" || role === "ngo" ? myRequests : myAssignedRequests;
    return source.filter((r: any) => r.status === "Cancelled");
  }, [role, myRequests, myAssignedRequests]);

  const totalPeopleHelped = completedRequests.length * 5; 
  const successRate = myRequests.length > 0
    ? Math.round((completedRequests.length / myRequests.length) * 100)
    : 0;

  // 10-Minute Escalation Heartbeat
  useEffect(() => {
    if (role !== "citizen") return;

    const interval = setInterval(() => {
      activeRequests.forEach((req) => {
        if (req.status === "Created" && req.createdAt) {
          // If request is older than 10 mins and NGO hasn't accepted, force global escalation
          const ageMs = Date.now() - new Date(req.createdAt).getTime();
          if (ageMs > 10 * 60 * 1000) {
            console.log(`Request ${req.id} escalated to global!`);
            // The context method now accepts a boolean flag to ignore NGO requirement
            // @ts-ignore
            if (useAppData().autoAssignVolunteers) {
               // @ts-ignore
               useAppData().autoAssignVolunteers(req.id, true);
            }
          }
        }
      });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [activeRequests, role]);

  const handleUploadProofs = async (requestId: string, urls: string[]) => {
    await updateDoc(doc(db, "emergency_requests", requestId), {
      completion_proof_urls: urls,
      updated_at: serverTimestamp()
    });
  };

  const handleReport = async (requestId: string, reason: string) => {
    if (!userId) return;
    await addDoc(collection(db, "request_reports"), {
      request_id: requestId,
      reporter_id: userId,
      reason,
      created_at: serverTimestamp()
    });
  };

  const renderRequestCard = (req: any) => {
    const cat = getCategoryMeta(req.category);
    const dist = haversineDistance(location, req.location);
    const isCitizen = role === "citizen" && req.userId === userId;
    const isVolunteer = role === "volunteer";
    const assignedVol = volunteers.find((v) => v.id === req.assignedVolunteerId);

    return (
      <motion.div
        key={req.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        layout
      >
        <Card className="border-border/50 overflow-hidden">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{cat.emoji}</span>
                <div>
                  <p className="font-semibold text-sm text-foreground">{cat.label}</p>
                  <p className="text-xs text-muted-foreground">{req.citizenName}</p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={
                  req.status === "Completed" ? "border-success/50 text-success" :
                  req.urgency === "critical" ? "border-emergency/50 text-emergency" :
                  "border-warning/50 text-warning"
                }
              >
                {STATUS_COPY[req.status] || req.status}
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground">{req.description || "No additional details."}</p>

            {isCitizen && req.eta && req.status !== "Completed" && (
              <Card className="border-info/20 bg-info/5">
                <CardContent className="p-3 flex items-center gap-3">
                  <Car className="w-5 h-5 text-info" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      🚗 {t("requests.helpOnWay")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ~{req.eta} {t("requests.etaMinutes")}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {dist != null && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {formatDistance(dist)}
                </span>
              )}
              {req.volunteerName && (
                <span className="flex items-center gap-1">
                  <UserCheck className="w-3 h-3" /> {req.volunteerName}
                </span>
              )}
              {req.ngoName && (
                <span className="flex items-center gap-1">
                  <Navigation className="w-3 h-3" /> {req.ngoName}
                </span>
              )}
              {req.eta && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> ~{req.eta} min
                </span>
              )}
              {req.teamLeaderVolunteerId === userId && (
                 <Badge variant="secondary" className="text-[9px] bg-accent/10 text-accent border-accent/20">TEAM LEADER</Badge>
              )}
            </div>

            {(req.status === "Completed" || req.status === "In Progress" || req.status === "In progress" || req.status === "Verification Pending") && (
              <CompletionFlow
                requestId={req.id}
                isVolunteer={isVolunteer && req.teamLeaderVolunteerId === userId}
                isCitizen={isCitizen}
                completionProofs={req.completionProofUrls || []}
                citizenApproved={req.citizenApproved ?? null}
                hasRated={role === "citizen" ? !!req.ratingByCitizen : !!req.ratingByVolunteer}
                onUploadProofs={async (urls) => {
                  await handleUploadProofs(req.id, urls);
                  if (req.status !== "Verification Pending") {
                    await volunteerAdvance(req.id, "Verification Pending");
                  }
                }}
                onCitizenApprove={() => citizenFinalize(req.id, true)}
                onCitizenReject={() => citizenFinalize(req.id, false, "Citizen rejected completion")}
                onRate={() => setRatingRequest(req.id)}
              />
            )}

            {isCitizen && req.status !== "Completed" && (
              <div className="flex flex-wrap gap-2 pt-1">
                {req.status === "Verification Pending" ? (
                   <>
                      <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => citizenFinalize(req.id, true)}>
                         <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Approve Completion
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => citizenFinalize(req.id, false, "Fake completion reported")}>
                         <Flag className="w-3.5 h-3.5 mr-1" /> Report Fake
                      </Button>
                   </>
                ) : (
                  <>
                    {req.assignedVolunteerId && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/requests/${req.id}/chat/ngo-citizen`)}>
                          <MessageCircle className="w-3.5 h-3.5 mr-1" /> Chat with NGO
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/requests/${req.id}/chat/citizen-leader`)}>
                          <MessageCircle className="w-3.5 h-3.5 mr-1" /> Chat with Loader
                        </Button>
                        <Button size="sm" variant="outline" className="text-success" onClick={() => {
                          const vol = volunteers.find((v) => v.id === req.assignedVolunteerId);
                          if (vol?.phone) window.open(`tel:${vol.phone}`, "_self");
                        }}>
                          <Phone className="w-3.5 h-3.5 mr-1" /> {t("chat.call")}
                        </Button>
                      </>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive ml-auto" onClick={() => setReportRequest(req.id)}>
                      <Flag className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </div>
            )}

            {role === "ngo" && req.status !== "Completed" && (
              <div className="flex flex-wrap gap-2 pt-1">
                {req.status === "Created" ? (
                  <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => acceptRequest(req.id)}>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Accept Mission
                  </Button>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/requests/${req.id}/chat/ngo-citizen`)}>
                      <MessageCircle className="w-3.5 h-3.5 mr-1" /> Chat with Citizen
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/requests/${req.id}/chat/team`)}>
                      <MessageCircle className="w-3.5 h-3.5 mr-1" /> Chat with Field Team
                    </Button>
                  </>
                )}
              </div>
            )}

            {role === "volunteer" && req.status !== "Completed" && (
              <div className="flex flex-wrap gap-2 pt-1">
                {req.status === "Volunteer assigned" || req.status === "Assigned" || req.status === "In Progress" || req.status === "In progress" ? (
                   <>
                    {(req.status === "Volunteer assigned" || req.status === "Assigned") && (
                      <Button size="sm" className="bg-success hover:bg-success/90" onClick={() => volunteerAdvance(req.id, "In Progress")}>
                        <Play className="w-3.5 h-3.5 mr-1" /> Accept Task
                      </Button>
                    )}
                    {(req.status === "Volunteer assigned" || req.status === "Assigned") && (
                      <Button size="sm" variant="outline" className="text-destructive border-destructive/20" onClick={() => {
                        setDeclinedRequests(prev => new Set(prev).add(req.id));
                        rejectTask(req.id);
                      }}>
                        <AnimatePresence>
                          <X className="w-3.5 h-3.5 mr-1" /> Reject
                        </AnimatePresence>
                      </Button>
                    )}
                    {req.location && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={getDirectionsUrl(req.location)} target="_blank" rel="noopener noreferrer">
                          <Navigation className="w-3.5 h-3.5 mr-1" /> {t("requests.navigate")}
                        </a>
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => navigate(`/requests/${req.id}/chat/team`)}>
                      <MessageCircle className="w-3.5 h-3.5 mr-1" /> Team Group Chat
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/requests/${req.id}/chat/citizen-leader`)}>
                      <MessageCircle className="w-3.5 h-3.5 mr-1" /> Chat with Citizen
                    </Button>
                    {req.teamLeaderVolunteerId === userId && (
                      <Button size="sm" variant="outline" className="text-success" onClick={() => volunteerAdvance(req.id, "Verification Pending")}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Submit Completion
                      </Button>
                    )}
                   </>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("requests.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {role === "citizen" ? t("requests.trackRequest") : `${activeRequests.length} active requests nearby`}
        </p>
      </div>

      {role === "citizen" && myRequests.length > 0 && (
        <Card className="border-success/20 bg-success/5">
          <CardContent className="p-3 flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-success" />
            <div>
              <p className="text-sm font-medium text-foreground">
                {t("profile.impact", { count: totalPeopleHelped })}
              </p>
              <p className="text-xs text-muted-foreground">
                {completedRequests.length} resolved · {successRate}% success rate
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">
            {t("requests.active")} ({activeRequests.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            {t("requests.completed")} ({completedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            {t("requests.cancelled")} ({cancelledRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-3 mt-4">
          {activeRequests.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">{t("requests.noRequests")}</CardContent></Card>
          ) : (
            activeRequests.map(renderRequestCard)
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3 mt-4">
          {completedRequests.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">{t("requests.noRequests")}</CardContent></Card>
          ) : (
            completedRequests.map(renderRequestCard)
          )}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-3 mt-4">
          {cancelledRequests.length === 0 ? (
            <Card><CardContent className="p-8 text-center text-muted-foreground">{t("requests.noRequests")}</CardContent></Card>
          ) : (
            cancelledRequests.map(renderRequestCard)
          )}
        </TabsContent>
      </Tabs>

      <RatingModal
        open={ratingRequest !== null}
        role={role as any}
        onSubmit={async (rating, feedback) => {
          if (ratingRequest) {
            await rateTask(ratingRequest, rating, feedback, role);
            setRatingRequest(null);
          }
        }}
        onClose={() => setRatingRequest(null)}
      />

      <ReportMisuseModal
        open={reportRequest !== null}
        requestId={reportRequest || ""}
        onSubmit={async (reason) => {
          if (reportRequest) await handleReport(reportRequest, reason);
        }}
        onClose={() => setReportRequest(null)}
      />
    </div>
  );
}
