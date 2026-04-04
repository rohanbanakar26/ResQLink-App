import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { FileSearch, CheckCircle2, XCircle, RotateCcw, Eye, Star, Image } from "lucide-react";
import { useAppData } from "../../context/AppDataContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getCategoryMeta } from "../../data/system";
import t from "@/utils/i18n";

export default function NgoTaskReview() {
  const { requests, volunteers } = useAppData();
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  // Requests with completion proofs that haven't been NGO-reviewed yet
  const reviewable = useMemo(() => {
    return requests.filter(
      (r) =>
        r.completionProofUrls.length > 0 &&
        (r.status === "In Progress" || r.status === "In progress" || r.status === "Completed"),
    );
  }, [requests]);

  const handleReview = async (requestId: string, approved: boolean) => {
    setProcessing(requestId);
    try {
      await updateDoc(doc(db, "emergency_requests", requestId), {
        ngo_reviewed: approved,
        ngo_review_notes: reviewNotes[requestId] || "",
        status: approved ? "Completed" : "In Progress", // If not approved, keep it in progress or another status
        completed_at: approved ? new Date().toISOString() : null,
        updated_at: serverTimestamp()
      });
    } catch (e) {
      console.error("Error reviewing task:", e);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-foreground flex items-center gap-2">
          <FileSearch className="w-5 h-5 text-accent" /> {t("ngo.taskReview")}
        </h2>
        <Badge variant="outline" className="text-[10px]">{reviewable.length} pending review</Badge>
      </div>

      <Card className="bg-accent/5 border-accent/20">
        <CardContent className="p-3 text-xs text-muted-foreground">
          <strong className="text-foreground">Review Flow:</strong> Volunteers submit proof → Team leader validates → <span className="text-accent font-bold">You review</span> → Citizen confirms.
        </CardContent>
      </Card>

      {reviewable.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-10 h-10 text-success/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No tasks pending review. All caught up!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviewable.map((req) => {
            const cat = getCategoryMeta(req.category);
            const assignedVol = volunteers.find((v) => v.id === req.assignedVolunteerId);

            return (
              <motion.div key={req.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-border/30 overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{cat.emoji}</span>
                        <div>
                          <p className="text-sm font-bold text-foreground">{cat.label}</p>
                          <p className="text-[10px] text-muted-foreground">By: {req.citizenName || "Citizen"} · Volunteer: {assignedVol?.name || "—"}</p>
                        </div>
                      </div>
                      {req.rating && (
                        <div className="flex items-center gap-0.5 text-warning">
                          <Star className="w-3.5 h-3.5 fill-warning" />
                          <span className="text-xs font-bold">{req.rating}</span>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">{req.description || "No description."}</p>

                    {req.completionProofUrls.length > 0 && (
                      <div>
                        <p className="text-[10px] font-bold text-foreground mb-2 flex items-center gap-1"><Image className="w-3 h-3" /> Completion Proof ({req.completionProofUrls.length})</p>
                        <div className="grid grid-cols-3 gap-2">
                          {req.completionProofUrls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block aspect-square rounded-lg overflow-hidden border border-border/30 bg-muted/10 hover:opacity-80 transition-opacity">
                              <img src={url} alt={`Proof ${i + 1}`} className="w-full h-full object-cover" />
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-[10px] font-bold text-foreground mb-1">{t("ngo.reviewNotes")}</p>
                      <Textarea
                        placeholder="Add optional review notes..."
                        value={reviewNotes[req.id] || ""}
                        onChange={(e) => setReviewNotes((prev) => ({ ...prev, [req.id]: e.target.value }))}
                        rows={2}
                        className="text-xs"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1 h-10 rounded-xl bg-success hover:bg-success/90 text-white font-bold"
                        onClick={() => handleReview(req.id, true)}
                        disabled={processing === req.id}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" /> {t("ngo.approve")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-10 rounded-xl text-destructive border-destructive/30 font-bold"
                        onClick={() => handleReview(req.id, false)}
                        disabled={processing === req.id}
                      >
                        <XCircle className="w-4 h-4 mr-1" /> {t("ngo.reject")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
