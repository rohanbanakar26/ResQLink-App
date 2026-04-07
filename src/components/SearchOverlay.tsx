import { useState, useRef, useCallback } from "react";
import { useAppData } from "@/context/AppDataContext";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, X, MapPin, Building2, Users, Radio } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { getCategoryMeta } from "@/data/system";
import t from "@/utils/i18n";

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const navigate = useNavigate();
  const { requests, ngos, volunteers } = useAppData();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const normalizedQuery = query.toLowerCase().trim();

  const filteredRequests = normalizedQuery.length > 1
    ? requests.filter((r) =>
        r.description?.toLowerCase().includes(normalizedQuery) ||
        r.category?.toLowerCase().includes(normalizedQuery) ||
        r.citizenName?.toLowerCase().includes(normalizedQuery)
      ).slice(0, 5)
    : [];

  const filteredNgos = normalizedQuery.length > 1
    ? ngos.filter((n) =>
        n.ngoName?.toLowerCase().includes(normalizedQuery) ||
        n.services?.some((s) => s.toLowerCase().includes(normalizedQuery))
      ).slice(0, 5)
    : [];

  const filteredVolunteers = normalizedQuery.length > 1
    ? volunteers.filter((v) =>
        v.name?.toLowerCase().includes(normalizedQuery) ||
        v.skills?.some((s) => s.toLowerCase().includes(normalizedQuery))
      ).slice(0, 5)
    : [];

  const hasResults = filteredRequests.length + filteredNgos.length + filteredVolunteers.length > 0;

  if (!open) return null;

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background/95 backdrop-blur-xl"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <div className="max-w-lg mx-auto px-4 pt-4 pb-24 space-y-4">
        {/* Search bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              autoFocus
              placeholder={t("search.placeholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>
          <button onClick={() => { setQuery(""); onClose(); }} className="text-muted-foreground p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results */}
        {normalizedQuery.length > 1 && !hasResults && (
          <p className="text-sm text-muted-foreground text-center py-8">{t("general.noResults")}</p>
        )}

        {filteredRequests.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Radio className="w-3.5 h-3.5 text-emergency" />
              <p className="text-xs font-medium text-muted-foreground uppercase">Requests</p>
            </div>
            <div className="space-y-2">
              {filteredRequests.map((req) => (
                <Card key={req.id} className="cursor-pointer hover:shadow-md transition-shadow border-border/50" onClick={() => { onClose(); navigate("/requests"); }}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <span className="text-lg">{getCategoryMeta(req.category).emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{getCategoryMeta(req.category).label}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{req.description}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] flex-shrink-0">{req.status}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {filteredNgos.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-3.5 h-3.5 text-success" />
              <p className="text-xs font-medium text-muted-foreground uppercase">NGOs</p>
            </div>
            <div className="space-y-2">
              {filteredNgos.map((ngo) => (
                <Card key={ngo.id} className="cursor-pointer hover:shadow-md transition-shadow border-border/50" onClick={() => { onClose(); navigate(`/profile/${ngo.id}`); }}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-success flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{ngo.ngoName}</p>
                      <p className="text-[10px] text-muted-foreground">{ngo.services?.slice(0, 3).join(", ")}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {filteredVolunteers.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-3.5 h-3.5 text-info" />
              <p className="text-xs font-medium text-muted-foreground uppercase">Volunteers</p>
            </div>
            <div className="space-y-2">
              {filteredVolunteers.map((vol) => (
                <Card key={vol.id} className="cursor-pointer hover:shadow-md transition-shadow border-border/50" onClick={() => { onClose(); navigate(`/profile/${vol.id}`); }}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <Users className="w-5 h-5 text-info flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{vol.name}</p>
                      <p className="text-[10px] text-muted-foreground">{vol.skills?.slice(0, 3).join(", ")}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
