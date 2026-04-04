import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from "@react-google-maps/api";
import { MapPin, Navigation, Phone, MessageSquare, CheckCircle2, ArrowLeft, Zap, Shield, AlertTriangle } from "lucide-react";
import { useAppData } from "../../context/AppDataContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  styles: [
    { elementType: "geometry", stylers: [{ color: "#212121" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#424242" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
  ],
};

interface OnFieldModeProps {
  requestId: string;
  onExit: () => void;
}

import ProofSubmission from "./ProofSubmission";

export default function OnFieldMode({ requestId, onExit }: OnFieldModeProps) {
  const navigate = useNavigate();
  const { requests, location, currentUser, volunteerAdvance } = useAppData();
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [status, setStatus] = useState<"navigating" | "reached" | "working" | "proof">("navigating");
  const [showProof, setShowProof] = useState(false);

  const request = requests.find((r) => r.id === requestId);
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
  });

  useEffect(() => {
    if (isLoaded && location && request?.location) {
      const directionsService = new google.maps.DirectionsService();
      directionsService.route(
        {
          origin: { lat: location.lat, lng: location.lng },
          destination: { lat: request.location.lat, lng: request.location.lng },
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK) {
            setDirections(result);
          }
        }
      );
    }
  }, [isLoaded, location, request]);

  if (!request) return null;

  if (showProof) {
    return (
      <ProofSubmission 
        requestId={requestId} 
        onCancel={() => setShowProof(false)} 
        onComplete={() => {
          setShowProof(false);
          onExit();
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[60] bg-background flex flex-col">
      {/* Top Overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-background/90 to-transparent">
        <div className="flex items-center justify-between">
          <Button variant="secondary" size="icon" onClick={onExit} className="rounded-full bg-background/80 backdrop-blur shadow-lg">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Badge className="bg-success text-white font-black px-4 py-1.5 shadow-lg shadow-success/20 animate-pulse">
             MISSION ACTIVE
          </Badge>
          <div className="w-10 h-10 rounded-full bg-emergency/20 flex items-center justify-center border border-emergency/30 backdrop-blur">
             <Shield className="w-5 h-5 text-emergency" />
          </div>
        </div>
      </div>

      {/* Map View */}
      <div className="flex-1 relative">
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={location ? { lat: location.lat, lng: location.lng } : { lat: 12.9716, lng: 77.5946 }}
            zoom={15}
            options={mapOptions}
          >
            {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true }} />}
            {location && (
              <Marker 
                position={{ lat: location.lat, lng: location.lng }} 
                icon={{
                  path: "M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z",
                  fillColor: "#3b82f6",
                  fillOpacity: 1,
                  scale: 2,
                  anchor: new google.maps.Point(12, 12),
                  rotation: 45 // Dummy rotation
                } as any}
              />
            )}
            {request.location && (
              <Marker position={{ lat: request.location.lat, lng: request.location.lng }} />
            )}
          </GoogleMap>
        ) : (
          <div className="w-full h-full bg-muted/20 animate-pulse flex items-center justify-center">
             <Navigation className="w-12 h-12 text-muted-foreground animate-spin" />
          </div>
        )}

        {/* Floating ETA */}
        <div className="absolute bottom-4 left-4 right-4 z-10">
           <Card className="bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl overflow-hidden rounded-3xl">
              <CardContent className="p-0">
                 {/* Navigation Info */}
                 <div className="p-5 flex items-center justify-between border-b border-border/30">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-emergency/10 flex items-center justify-center flex-shrink-0">
                          <Navigation className="w-6 h-6 text-emergency" />
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Target Arrival</p>
                          <p className="text-xl font-black text-foreground">6 MIN <span className="text-sm font-medium text-muted-foreground ml-1">· 1.2 km</span></p>
                       </div>
                    </div>
                    <Button 
                      size="icon" 
                      className="rounded-full bg-success text-white h-12 w-12 shadow-lg shadow-success/20"
                      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${request.location?.lat},${request.location?.lng}`, "_blank")}
                    >
                       <Zap className="w-5 h-5 fill-white" />
                    </Button>
                 </div>

                 {/* Action Bar */}
                 <div className="p-4 grid grid-cols-2 gap-3">
                    <Button variant="outline" className="h-12 rounded-2xl border-border/50 font-bold" onClick={() => navigate(`/requests/${requestId}/chat`)}>
                       <MessageSquare className="w-4 h-4 mr-2 text-info" /> Incident Chat
                    </Button>
                    <Button 
                      className={`h-12 rounded-2xl font-black transition-all ${status === "navigating" ? "bg-emergency hover:bg-emergency/90" : "bg-success hover:bg-success/90"}`}
                      onClick={() => {
                        if (status === "navigating") {
                          setStatus("reached");
                          volunteerAdvance(requestId, "In Progress");
                        }
                        else if (status === "reached") setStatus("working");
                        else setShowProof(true);
                      }}
                    >
                       {status === "navigating" ? (
                          <>MARK REACHED</>
                       ) : status === "reached" ? (
                          <><CheckCircle2 className="w-4 h-4 mr-2" /> BEGIN SERVICE</>
                       ) : (
                          <><Zap className="w-4 h-4 mr-2" /> FINISH MISSION</>
                       )}
                    </Button>
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
