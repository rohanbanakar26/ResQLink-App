import { useState, useEffect, useRef } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { useAppData } from "@/context/AppDataContext";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, Phone, MessageCircle, User, Shield, Zap, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import TrustStars from "@/components/profile/TrustStars";
import t from "@/utils/i18n";

interface Message {
  id: string;
  requestId: string;
  senderId: string;
  content: string;
  messageType: string;
  createdAt: number;
}

const CITIZEN_QUICK_MESSAGES = [
  { key: "thankYou", text: "Thank you!" },
  { key: "whereAreYou", text: "Where are you reached?" },
  { key: "stayingSafe", text: "I'm staying safe." },
];

const VOLUNTEER_QUICK_MESSAGES = [
  { key: "onMyWay", text: "On my way! 🚗" },
  { key: "iReached", text: "I have reached the spot. 📍" },
  { key: "needSupport", text: "Requesting additional backup! 🆘" },
  { key: "secure", text: "Spot is secured. ✅" },
];

export default function ChatPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, requests, volunteers } = useAppData();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userId = currentUser?.userId;

  const request = requests.find((r) => r.id === requestId);
  const leader = volunteers.find((v) => v.id === request?.teamLeaderVolunteerId);
  const isLeader = currentUser?.role === "volunteer" && leader?.userId === currentUser?.userId;

  // Determine who the citizen is chatting with
  const otherPartyName = currentUser?.role === "citizen"
    ? (leader?.name || "Team Leader")
    : (request?.citizenName || "Citizen");

  const otherPartyTrustScore = currentUser?.role === "citizen"
    ? (leader?.trustScore ?? 4.5)
    : 4.5;

  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (!requestId || !request) return <Navigate to="/requests" replace />;

  const quickMessages = currentUser?.role === "volunteer" ? VOLUNTEER_QUICK_MESSAGES : CITIZEN_QUICK_MESSAGES;

  // Fetch messages using real-time listener
  useEffect(() => {
    if (!requestId) return;

    const messagesRef = collection(db, "emergency_requests", requestId, "messages");
    const q = query(messagesRef, orderBy("created_at", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => {
        const m = d.data();
        return {
          id: d.id,
          requestId: requestId,
          senderId: m.sender_id,
          content: m.content,
          messageType: m.message_type,
          createdAt: m.created_at?.toMillis?.() || Date.now(),
        };
      }));
    });

    return () => unsubscribe();
  }, [requestId]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (content: string, type: string = "text") => {
    if (!content.trim() || !userId || !requestId) return;
    setSending(true);
    try {
      const messagesRef = collection(db, "emergency_requests", requestId, "messages");
      await addDoc(messagesRef, {
        sender_id: userId,
        content: content.trim(),
        message_type: type,
        created_at: serverTimestamp(),
      });
      setInput("");
    } catch (e) {
      console.error("Error sending message:", e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Chat Header */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="flex items-center gap-3 max-w-2xl mx-auto px-4 h-16">
          <button onClick={() => navigate(-1)} className="text-muted-foreground p-1 hover:bg-muted rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-emergency/10 flex items-center justify-center border border-emergency/20">
              <User className="w-5 h-5 text-emergency" />
            </div>
            {currentUser?.role === "citizen" && leader && (
              <div className="absolute -bottom-1 -right-1 bg-success rounded-full p-0.5 border-2 border-card">
                 <Shield className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-bold text-foreground truncate">{otherPartyName}</p>
              {currentUser?.role === "citizen" && leader && (
                <Badge variant="outline" className="text-[8px] h-4 border-success/30 text-success bg-success/5 uppercase font-black tracking-tighter">Leader</Badge>
              )}
            </div>
            <TrustStars score={otherPartyTrustScore} size="sm" />
          </div>
          <Button variant="ghost" size="sm" className="text-success rounded-full h-10 w-10 p-0 hover:bg-success/10" onClick={() => window.open(`tel:${leader?.email || "911"}`, "_self")}>
            <Phone className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Team Ribbon for Volunteers */}
      {currentUser?.role === "volunteer" && (
        <div className="bg-primary/5 border-b border-primary/10 px-4 py-2">
           <div className="max-w-2xl mx-auto flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-primary/70">
              <div className="flex items-center gap-2">
                 <Users className="w-3 h-3" /> Team Communications
              </div>
              {isLeader ? (
                 <span className="flex items-center gap-1 text-warning"><Shield className="w-3 h-3 fill-warning" /> You are Leader</span>
              ) : (
                 <span>Leader: {leader?.name || "None"}</span>
              )}
           </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-2xl mx-auto w-full scrollbar-hide">
        {messages.length === 0 && (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto mb-4 opacity-50">
               <MessageCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Secure channel established.</p>
            <p className="text-[10px] text-muted-foreground/60 uppercase tracking-widest mt-1">End-to-end coordinated</p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isMine = msg.senderId === userId;
            const senderVol = volunteers.find(v => v.userId === msg.senderId);
            const isSenderLeader = senderVol?.id === request?.teamLeaderVolunteerId;
            
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
              >
                {!isMine && (
                   <span className="text-[10px] font-bold text-muted-foreground mb-1 ml-1 flex items-center gap-1">
                      {isSenderLeader && <Shield className="w-2.5 h-2.5 text-warning fill-warning" />}
                      {senderVol?.name || (msg.senderId === request.userId ? "Citizen" : "Responder")}
                   </span>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                    isMine
                      ? "bg-emergency text-white rounded-tr-none border border-emergency/20"
                      : "bg-card border border-border rounded-tl-none"
                  }`}
                >
                  <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                  <p className={`text-[9px] mt-1.5 font-bold uppercase tracking-wider ${isMine ? "text-white/60 text-right" : "text-muted-foreground"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Quick Messages */}
      <div className="px-4 py-3 border-t border-border bg-card/80 backdrop-blur-md max-w-2xl mx-auto w-full">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {quickMessages.map((qm) => (
            <button
              key={qm.key}
              onClick={() => sendMessage(qm.text)}
              className="flex-shrink-0 px-4 py-2 rounded-xl border border-border bg-background text-[11px] font-bold text-muted-foreground hover:border-emergency/30 hover:text-emergency transition-all active:scale-95 shadow-sm"
            >
              {qm.text}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="sticky bottom-0 bg-card border-t border-border px-4 py-4 safe-area-bottom">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          className="flex items-center gap-3 max-w-2xl mx-auto"
        >
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type coordinates or updates..."
              className="w-full h-12 rounded-2xl bg-muted/30 border-none pl-5 pr-12 text-sm focus:ring-2 focus:ring-emergency/20"
              disabled={sending}
            />
            <Button
              type="submit"
              size="sm"
              className="absolute right-1 top-1 bottom-1 aspect-square rounded-xl bg-emergency hover:bg-emergency/90 p-0 shadow-lg"
              disabled={!input.trim() || sending}
            >
              <Send className="w-4 h-4 text-white" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
