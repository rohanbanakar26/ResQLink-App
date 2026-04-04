import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import t from "@/utils/i18n";

interface ReportMisuseModalProps {
  open: boolean;
  requestId: string;
  onSubmit: (reason: string) => Promise<void>;
  onClose: () => void;
}

const REASONS = [
  { en: "Fake emergency", hi: "नकली आपातकाल" },
  { en: "Inappropriate content", hi: "अनुचित सामग्री" },
  { en: "Spam or repeated requests", hi: "स्पैम या बार-बार अनुरोध" },
  { en: "Harassment", hi: "उत्पीड़न" },
  { en: "Other", hi: "अन्य" },
];

export default function ReportMisuseModal({ open, requestId, onSubmit, onClose }: ReportMisuseModalProps) {
  const [selectedReason, setSelectedReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) return;
    setSubmitting(true);
    await onSubmit(`${selectedReason}: ${details}`.trim());
    setSubmitted(true);
    setSubmitting(false);
    setTimeout(onClose, 2000);
  };

  if (!open) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="w-full max-w-sm"
      >
        <Card className="border-destructive/20 shadow-2xl">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <h3 className="font-bold text-foreground">{t("safety.reportMisuse")}</h3>
              </div>
              <button onClick={onClose} className="text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {submitted ? (
              <div className="text-center py-4">
                <p className="text-sm text-success font-medium">Report submitted. Thank you for keeping the community safe.</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {REASONS.map((reason) => (
                    <button
                      key={reason.en}
                      onClick={() => setSelectedReason(reason.en)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-all ${
                        selectedReason === reason.en
                          ? "border-destructive bg-destructive/10 text-destructive"
                          : "border-border bg-card text-muted-foreground hover:border-destructive/30"
                      }`}
                    >
                      {reason.en}
                    </button>
                  ))}
                </div>

                <Textarea
                  placeholder="Additional details (optional)"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={2}
                  className="text-sm"
                />

                <Button
                  className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  onClick={handleSubmit}
                  disabled={!selectedReason || submitting}
                >
                  {submitting ? "Submitting..." : "Submit Report"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
