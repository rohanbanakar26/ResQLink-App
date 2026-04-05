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
import { ArrowLeft, Send, Phone, MessageCircle, User, Shield, Users, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import TrustStars from "@/components/profile/TrustStars";
import t from "@/utils/i18n";

interface Message {
  id: string;
  requestId: string;
  senderId: string;
  senderName?: string;
  content: string;
  messageType: string;
  createdAt: number;
}

const QUICK_MESSAGES: Record<string, any[]> = {
  citizen: [
    { key: "thankYou", text: "Thank you!" },
    { key: "whereAreYou", text: "What's your current location?" },
    { key: "stayingSafe", text: "I'm staying safe." },
  ],
  volunteer: [
    { key: "onMyWay", text: "On my way! 🚗" },
    { key: "iReached", text: "I have reached the spot. 📍" },
    { key: "needSupport", text: "Requesting additional backup! 🆘" },
    { key: "secure", text: "Spot is secured. ✅" },
  ],
  ngo: [
    { key: "dispatching", text: "We are dispatching a team now." },
    { key: "confirmStatus", text: "Please confirm your safety status." },
    { key: "stayCalm", text: "Help is coming. Stay calm." },
  ]
};

export default function ChatPage() {
  const { requestId, chatType } = useParams<{ requestId: string; chatType: string }>();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, requests, volunteers, ngos } = useAppData();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userId = currentUser?.userId;

  const request = requests.find((r) => r.id === requestId);
  const leader = volunteers.find((v) => v.id === request?.teamLeaderVolunteerId);
  const ngo = ngos.find((n) => n.id === request?.ngoId);
  
  // Privacy Check
  const canAccess = () => {
    if (!currentUser || !request) return false;
    if (currentUser.role === "ngo") return true; // NGO can oversee all chats
    if (chatType === "team") return currentUser.role === "volunteer";
    if (chatType === "citizen-leader") return currentUser.userId === request.userId || (currentUser.role === "volunteer" && leader?.userId === currentUser.userId);
    if (chatType === "ngo-citizen") return currentUser.userId === request.userId;
    return false;
  };

  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  if (!requestId || !request || !chatType || !canAccess()) return <Navigate to="/requests" replace />;

  const quickMessages = QUICK_MESSAGES[currentUser?.role || "citizen"] || [];

  // Determine header info
  let chatTitle = "Chat";
  let channelBadge = chatType.toUpperCase();
  if (chatType === "team") {
    chatTitle = "Team Field Ops";
    channelBadge = "Internal Team";
  } else if (chatType === "citizen-leader") {
    chatTitle = currentUser?.role === "citizen" ? (leader?.name || "Team Leader") : "Citizen Coordination";
  } else if (chatType === "ngo-citizen") {
    chatTitle = currentUser?.role === "ngo" ? "Distressed Citizen" : "NGO Support";
  }

  useEffect(() => {
    if (!requestId || !chatType) return;

    const messagesRef = collection(db, "emergency_requests", requestId, "chats", chatType, "messages");
    const q = query(messagesRef, orderBy("created_at", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(d => {
        const m = d.data();
        let sName = "Member";
        if (m.sender_id === request.userId) sName = "Citizen";
        else {
           const v = volunteers.find(vol => vol.userId === m.sender_id);
           if (v) sName = v.name;
           else if (m.sender_id === ngo?.userId) sName = "NGO Admin";
        }

        return {
          id: d.id,
          requestId: requestId,
          senderId: m.sender_id,
          senderName: sName,
          content: m.content,
          messageType: m.message_type,
          createdAt: m.created_at?.toMillis?.() || Date.now(),
        };
      }));
    });

    return () => unsubscribe();
  }, [requestId, chatType, volunteers, ngo, request.userId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (content: string, type: string = "text") => {
    if (!content.trim() || !userId || !requestId || !chatType) return;
    setSending(true);
    try {
      const messagesRef = collection(db, "emergency_requests", requestId, "chats", chatType, "messages");
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
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border shadow-sm">
        <div className="flex items-center gap-3 max-w-2xl mx-auto px-4 h-16">
          <button onClick={() => navigate(-1)} className="text-muted-foreground p-1 hover:bg-muted rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-full bg-emergency/10 flex items-center justify-center border border-emergency/20">
             {chatType === "team" ? <Users className="w-5 h-5 text-emergency" /> : <User className="w-5 h-5 text-emergency" />}
          </div>
          <div className="flex-1 min-w-0">
             <div className="flex items-center gap-1.5">
               <p className="text-sm font-bold text-foreground truncate">{chatTitle}</p>
               <Badge variant="outline" className="text-[8px] h-4 border-info/30 text-info bg-info/5 uppercase font-black tracking-tighter">{channelBadge}</Badge>
             </div>
             <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Lock className="w-2 h-2" /> End-to-end encrypted channel</p>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 max-w-2xl mx-auto w-full scrollbar-hide">
        {messages.length === 0 && (
          <div className="text-center py-20 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mb-4 opacity-50">
               <MessageCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-bold text-muted-foreground">Secure Channel: {channelBadge}</p>
            <p className="text-[11px] text-muted-foreground/60 max-w-[200px] mt-2">
               Your communications in this channel are restricted to authorized responders and administrators.
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`flex flex-col ${msg.senderId === userId ? "items-end" : "items-start"}`}
            >
              {msg.senderId !== userId && (
                 <span className="text-[10px] font-bold text-muted-foreground mb-1 ml-1">{msg.senderName}</span>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                  msg.senderId === userId 
                    ? "bg-emergency text-white rounded-tr-none" 
                    : "bg-card border border-border rounded-tl-none"
                }`}
              >
                <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                <p className={`text-[9px] mt-1.5 font-bold uppercase tracking-wider ${msg.senderId === userId ? "text-white/60" : "text-muted-foreground"}`}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

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

      <div className="sticky bottom-0 bg-card border-t border-border px-4 py-4 safe-area-bottom">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex items-center gap-3 max-w-2xl mx-auto">
          <div className="flex-1 relative">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Send operational update..."
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
