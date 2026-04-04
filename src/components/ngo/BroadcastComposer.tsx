import { useState } from "react";
import { Megaphone, Send, CheckCircle2, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import t from "@/utils/i18n";

interface BroadcastComposerProps {
  ngoId: string;
}

export default function BroadcastComposer({ ngoId }: BroadcastComposerProps) {
  const [message, setMessage] = useState("");
  const [targetType, setTargetType] = useState("all");
  const [targetArea, setTargetArea] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || !ngoId) return;
    setSending(true);
    try {
      await addDoc(collection(db, "broadcast_messages"), {
        ngo_id: ngoId,
        message: message.trim(),
        target_type: targetType,
        target_area: targetArea || null,
        created_at: serverTimestamp()
      });
      setSent(true);
      setMessage("");
      setTimeout(() => setSent(false), 3000);
    } catch (e) {
      console.error("Error sending broadcast:", e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-warning/5 border-warning/20">
        <CardContent className="p-3 text-xs text-muted-foreground">
          <strong className="text-foreground">📢 Broadcast</strong> — Send a message to all available volunteers.
          Use for urgent area alerts, help requests, or coordination updates.
        </CardContent>
      </Card>

      <Card className="border-border/30">
        <CardContent className="p-4 space-y-3">
          <div>
            <p className="text-[10px] font-bold text-foreground mb-1 uppercase tracking-wider">Target Audience</p>
            <Select value={targetType} onValueChange={setTargetType}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">🌍 All Volunteers</SelectItem>
                <SelectItem value="area">📍 Area-Specific</SelectItem>
                <SelectItem value="team">👥 Active Teams Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {targetType === "area" && (
            <div>
              <p className="text-[10px] font-bold text-foreground mb-1 uppercase tracking-wider">Target Area</p>
              <input
                type="text"
                placeholder="e.g. Koramangala, South Bangalore"
                value={targetArea}
                onChange={(e) => setTargetArea(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold text-foreground mb-1 uppercase tracking-wider">Message</p>
            <Textarea
              placeholder={t("ngo.broadcastPlaceholder")}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="text-sm"
            />
          </div>

          <Button
            className="w-full h-11 rounded-xl bg-warning hover:bg-warning/90 text-warning-foreground font-bold"
            onClick={handleSend}
            disabled={!message.trim() || sending}
          >
            {sending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
            ) : sent ? (
              <><CheckCircle2 className="w-4 h-4 mr-2" /> Broadcast Sent!</>
            ) : (
              <><Megaphone className="w-4 h-4 mr-2" /> {t("ngo.sendBroadcast")}</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
