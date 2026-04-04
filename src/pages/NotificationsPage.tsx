import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAppData } from "@/context/AppDataContext";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  updateDoc, 
  doc, 
  writeBatch,
  getDocs
} from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, CheckCircle2, Users, AlertTriangle, Heart, Award, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import t from "@/utils/i18n";

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: number;
}

const typeIcons: Record<string, any> = {
  request_accepted: CheckCircle2,
  volunteer_arriving: Users,
  completion: CheckCircle2,
  campaign: Heart,
  badge: Award,
  warning: AlertTriangle,
  info: Bell,
};

const typeColors: Record<string, string> = {
  request_accepted: "text-success",
  volunteer_arriving: "text-info",
  completion: "text-success",
  campaign: "text-emergency",
  badge: "text-warning",
  warning: "text-destructive",
  info: "text-muted-foreground",
};

export default function NotificationsPage() {
  const { isAuthenticated, currentUser } = useAppData();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const userId = currentUser?.userId;

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const notifRef = collection(db, "notifications");
    const q = query(
      notifRef, 
      where("user_id", "==", userId),
      orderBy("created_at", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(d => {
        const n = d.data();
        return {
          id: d.id,
          type: n.type,
          title: n.title,
          body: n.body,
          read: n.read,
          createdAt: n.created_at?.toMillis?.() || Date.now(),
        };
      }));
      setLoading(false);
    });

    // Mark all as read after a short delay
    const markAsRead = async () => {
      const unreadQuery = query(
        notifRef,
        where("user_id", "==", userId),
        where("read", "==", false)
      );
      const unreadSnaps = await getDocs(unreadQuery);
      if (!unreadSnaps.empty) {
        const batch = writeBatch(db);
        unreadSnaps.docs.forEach(d => {
          batch.update(d.ref, { read: true });
        });
        await batch.commit();
      }
    };
    
    const timeout = setTimeout(markAsRead, 2000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [userId]);

  const formatTime = (time: number) => {
    const diff = Date.now() - time;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (!isAuthenticated) return <Navigate to="/auth" replace />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-4">
      <div>
        <div className="inline-flex items-center rounded-full border border-info/30 text-info px-2.5 py-0.5 text-xs font-semibold mb-3">
          <Bell className="w-3.5 h-3.5 mr-1" /> Updates
        </div>
        <h1 className="text-2xl font-bold text-foreground">{t("notifications.title")}</h1>
      </div>

      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Bell className="w-8 h-8 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">{t("notifications.noNotifications")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif, i) => {
            const Icon = typeIcons[notif.type] || Bell;
            const color = typeColors[notif.type] || "text-muted-foreground";

            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Card className={`border-border/50 ${!notif.read ? "bg-info/5 border-info/20" : ""}`}>
                  <CardContent className="p-3 flex items-start gap-3">
                    <div className={`mt-0.5 ${color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{notif.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{notif.body}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      {formatTime(notif.createdAt)}
                    </span>
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
