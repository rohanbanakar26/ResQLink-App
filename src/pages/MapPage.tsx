import { useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useAppData } from "../context/AppDataContext";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Zap, Shield, Users, Locate } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Custom marker icons                                                */
/* ------------------------------------------------------------------ */
function makeIcon(color: string, size = 28) {
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};
      border:3px solid #fff;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      box-shadow:0 2px 8px ${color}80;
    "></div>`,
  });
}

const ICONS = {
  user: makeIcon("#8b5cf6"),
  critical: makeIcon("#ef4444"),
  high: makeIcon("#f97316"),
  request: makeIcon("#eab308"),
  volunteer: makeIcon("#3b82f6", 22),
  ngo: makeIcon("#22c55e", 22),
};

function iconForRequest(urgency: string) {
  if (urgency === "critical") return ICONS.critical;
  if (urgency === "high") return ICONS.high;
  return ICONS.request;
}

/* ------------------------------------------------------------------ */
/*  Recenter helper                                                    */
/* ------------------------------------------------------------------ */
function RecenterButton({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  return (
    <Button
      size="icon"
      variant="secondary"
      className="absolute bottom-4 right-4 z-[1000] rounded-full shadow-lg h-10 w-10 bg-background/80 backdrop-blur"
      onClick={() => map.flyTo([lat, lng], 14, { duration: 0.8 })}
    >
      <Locate className="h-4 w-4" />
    </Button>
  );
}

/* ------------------------------------------------------------------ */
/*  Map Page                                                            */
/* ------------------------------------------------------------------ */
export default function MapPage() {
  const { currentUser, nearbyRequests, myRequests, volunteers, ngos, location, isAuthenticated, priorityZones } = useAppData();
  const [selected, setSelected] = useState<any>(null);

  const role = currentUser?.role ?? "citizen";

  const displayRequests = useMemo(() => {
    return role === "citizen" ? myRequests : nearbyRequests;
  }, [role, myRequests, nearbyRequests]);

  const center: [number, number] = useMemo(
    () => (location ? [location.lat, location.lng] : [12.9716, 77.5946]),
    [location],
  );

  if (!isAuthenticated) return <Navigate to="/auth" replace />;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 pb-24 space-y-4">
      <div className="flex flex-col gap-1">
        <Badge variant="outline" className="w-fit border-emergency/30 text-emergency bg-emergency/5">
          <MapPin className="w-3.5 h-3.5 mr-1" /> LIVE OPERATIONS MAP
        </Badge>
        <h1 className="text-2xl font-black text-foreground tracking-tight">
          RES<span className="text-emergency">Q</span>CENTRAL
        </h1>
        <div className="flex gap-4 mt-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          {role === "citizen" ? (
            <span>{displayRequests.length} Active Requests</span>
          ) : (
            <>
              <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-warning" /> {nearbyRequests.length} NEARBY</span>
              <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-success" /> {priorityZones.length} SAFE ZONES</span>
            </>
          )}
        </div>
      </div>

      <Card className="overflow-hidden border-border/50 shadow-2xl relative rounded-2xl">
        <MapContainer
          center={center}
          zoom={13}
          scrollWheelZoom={true}
          style={{ width: "100%", height: "500px", borderRadius: "1rem" }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* User Location */}
          {location && (
            <Marker position={[location.lat, location.lng]} icon={ICONS.user}>
              <Popup className="resq-popup">
                <div className="p-1 text-center">
                  <p className="text-[10px] font-bold uppercase text-violet-500 mb-0.5">Your Location</p>
                  <p className="text-xs text-muted-foreground">{location.lat.toFixed(4)}, {location.lng.toFixed(4)}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {/* Emergency Requests */}
          {displayRequests.map((req) =>
            req.location ? (
              <Marker key={req.id} position={[req.location.lat, req.location.lng]} icon={iconForRequest(req.urgency)}>
                <Popup>
                  <div className="p-1 min-w-[140px]">
                    <span className="inline-block text-[8px] font-black uppercase tracking-widest bg-emergency/10 text-emergency px-1.5 py-0.5 rounded mb-1">Emergency</span>
                    <h4 className="font-bold text-sm">{req.category}</h4>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{req.description || "No details"}</p>
                    {req.status && <span className="inline-block mt-1 text-[8px] font-bold uppercase bg-red-500 text-white px-1.5 py-0.5 rounded">{req.status}</span>}
                  </div>
                </Popup>
              </Marker>
            ) : null,
          )}

          {/* Volunteers & NGOs (non-citizen view) */}
          {role !== "citizen" && (
            <>
              {volunteers.map((vol) =>
                vol.location ? (
                  <Marker key={vol.id} position={[vol.location.lat, vol.location.lng]} icon={ICONS.volunteer}>
                    <Popup>
                      <div className="p-1">
                        <span className="text-[8px] font-black uppercase text-blue-500">Responder</span>
                        <h4 className="font-bold text-sm">{vol.name}</h4>
                        <p className="text-xs text-gray-500">⭐ {vol.trustScore?.toFixed(1)} · {vol.available ? "🟢 Online" : "🔴 Offline"}</p>
                      </div>
                    </Popup>
                  </Marker>
                ) : null,
              )}
              {ngos.map((ngo) =>
                ngo.location ? (
                  <Marker key={ngo.id} position={[ngo.location.lat, ngo.location.lng]} icon={ICONS.ngo}>
                    <Popup>
                      <div className="p-1">
                        <span className="text-[8px] font-black uppercase text-green-500">NGO Base</span>
                        <h4 className="font-bold text-sm">{ngo.ngoName}</h4>
                        <p className="text-xs text-gray-500">⭐ {ngo.trustScore?.toFixed(1)}</p>
                      </div>
                    </Popup>
                  </Marker>
                ) : null,
              )}
            </>
          )}

          <RecenterButton lat={center[0]} lng={center[1]} />
        </MapContainer>
      </Card>

      {/* Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/10 p-4 rounded-2xl border border-border/30">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Emergency</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Responder</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase">NGO Base</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase">Reporting Point</span>
        </div>
      </div>
    </div>
  );
}
