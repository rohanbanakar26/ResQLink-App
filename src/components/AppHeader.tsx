import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAppData } from "../context/AppDataContext";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Bell, LogOut, Zap } from "lucide-react";
import SearchOverlay from "./SearchOverlay";

export default function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, loading, activeRequests, logout } = useAppData();
  const [showSearch, setShowSearch] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const userId = currentUser?.userId;

  // Fetch unread notification count via real-time listener
  // Guard: only start listener when fully authenticated with a confirmed profile.
  // Starting before auth is ready causes Firestore permission-denied errors.
  useEffect(() => {
    if (!userId || !isAuthenticated || loading) return;
    if (location.pathname === "/" || location.pathname === "/auth") return;

    const notifRef = collection(db, "notifications");
    const q = query(notifRef, where("user_id", "==", userId), where("read", "==", false));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    }, (err) => {
      // Silently ignore permission errors — can happen during auth state transitions
      console.warn("[AppHeader] Notification listener error (transient):", err.code);
    });

    return () => unsubscribe();
  }, [userId, isAuthenticated, loading, location.pathname]);

  if (location.pathname === "/" || location.pathname === "/auth") {
    return null;
  }

  const criticalCount = activeRequests.filter((r) => r.urgency === "critical").length;

  return (
    <>
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between max-w-5xl mx-auto px-4 h-14">
          <Link to="/emergency" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emergency flex items-center justify-center">
              <Zap className="w-4 h-4 text-emergency-foreground" />
            </div>
            <span className="font-bold text-foreground text-sm">
              Res<span className="text-emergency">Q</span>Link
            </span>
          </Link>

          <div className="flex items-center gap-1">
            {/* Search */}
            <Button variant="ghost" size="sm" onClick={() => setShowSearch(true)}>
              <Search className="w-4 h-4" />
            </Button>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="sm"
              className="relative"
              onClick={() => navigate("/notifications")}
            >
              <Bell className="w-4 h-4" />
              {(unreadCount > 0 || criticalCount > 0) && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-emergency text-emergency-foreground text-[10px] flex items-center justify-center">
                  {unreadCount || criticalCount}
                </span>
              )}
            </Button>

            {/* Logout */}
            {isAuthenticated && (
              <Button variant="ghost" size="sm" onClick={async () => { await logout(); navigate("/"); }}>
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Search Overlay */}
      <SearchOverlay open={showSearch} onClose={() => setShowSearch(false)} />
    </>
  );
}
