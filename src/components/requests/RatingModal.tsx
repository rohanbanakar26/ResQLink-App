import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import t from "@/utils/i18n";

interface RatingModalProps {
  open: boolean;
  onSubmit: (rating: number, feedback: string) => Promise<void>;
  onClose: () => void;
}

export default function RatingModal({ open, onSubmit, onClose }: RatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    await onSubmit(rating, feedback);
    setSubmitted(true);
    setSubmitting(false);
    setTimeout(onClose, 2000);
  };

  if (!open) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-sm"
      >
        <Card className="border-border shadow-2xl">
          <CardContent className="p-6 space-y-5">
            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div
                  key="thanks"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-4"
                >
                  <motion.div
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 0.5 }}
                    className="text-5xl mb-4"
                  >
                    ⭐
                  </motion.div>
                  <h3 className="text-lg font-bold text-foreground">{t("rating.thankYou")}</h3>
                  <p className="text-sm text-muted-foreground mt-1">Your feedback helps improve the community</p>
                </motion.div>
              ) : (
                <motion.div key="form" className="space-y-5">
                  <div className="text-center">
                    <h3 className="text-lg font-bold text-foreground">{t("rating.title")}</h3>
                    <p className="text-xs text-muted-foreground mt-1">How was your experience?</p>
                  </div>

                  {/* Star rating */}
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <motion.button
                        key={star}
                        onMouseEnter={() => setHoveredStar(star)}
                        onMouseLeave={() => setHoveredStar(0)}
                        onClick={() => setRating(star)}
                        whileTap={{ scale: 1.3 }}
                        className="p-1"
                      >
                        <Star
                          className={`w-9 h-9 transition-colors ${
                            star <= (hoveredStar || rating)
                              ? "fill-warning text-warning"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      </motion.button>
                    ))}
                  </div>

                  {rating > 0 && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center text-sm text-muted-foreground"
                    >
                      {rating === 1 ? "Poor" : rating === 2 ? "Fair" : rating === 3 ? "Good" : rating === 4 ? "Very Good" : "Excellent!"}
                    </motion.p>
                  )}

                  {/* Feedback */}
                  <Textarea
                    placeholder={t("rating.feedback")}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={3}
                    className="text-sm"
                  />

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={onClose}>
                      {t("general.cancel")}
                    </Button>
                    <Button
                      className="flex-1 bg-emergency hover:bg-emergency/90 text-emergency-foreground"
                      onClick={handleSubmit}
                      disabled={rating === 0 || submitting}
                    >
                      {submitting ? "..." : t("rating.submit")}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
