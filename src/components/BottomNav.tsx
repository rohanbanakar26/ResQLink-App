import { NavLink, useLocation } from "react-router-dom";
import { AlertTriangle, Radio, Map, Users, User, Newspaper, LayoutDashboard, Megaphone } from "lucide-react";
import { useAppData } from "@/context/AppDataContext";
import t from "@/utils/i18n";

const citizenItems = [
  { to: "/emergency", label: "nav.emergency", icon: AlertTriangle },
  { to: "/requests", label: "nav.requests", icon: Radio },
  { to: "/map", label: "nav.map", icon: Map },
  { to: "/resources", label: "nav.resources", icon: Newspaper },
  { to: "/network", label: "nav.network", icon: Users },
  { to: "/profile", label: "nav.profile", icon: User },
];

const ngoItems = [
  { to: "/emergency", label: "ngo.controlCenter", icon: LayoutDashboard },
  { to: "/requests", label: "nav.requests", icon: Radio },
  { to: "/map", label: "nav.map", icon: Map },
  { to: "/resources", label: "ngo.myCampaigns", icon: Megaphone },
  { to: "/network", label: "nav.network", icon: Users },
  { to: "/profile", label: "nav.profile", icon: User },
];

export default function BottomNav() {
  const location = useLocation();
  const { currentUser } = useAppData();
  const items = currentUser?.role === "ngo" ? ngoItems : citizenItems;

  if (location.pathname === "/" || location.pathname === "/auth" || location.pathname.includes("/chat")) {
    return null;
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around max-w-lg mx-auto h-16">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg transition-colors ${
                isActive
                  ? "text-emergency"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "text-emergency" : ""}`} />
              <span className="text-[9px] font-medium">{t(item.label)}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
