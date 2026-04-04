import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Megaphone, Image, Send, Loader2, CheckCircle2, Trash2, Edit3, X } from "lucide-react";
import { useAppData } from "../../context/AppDataContext";
import { db, storage } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  serverTimestamp 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import t from "@/utils/i18n";

interface Campaign {
  id: string;
  title: string;
  caption: string;
  mediaUrls: string[];
  likesCount: number;
  commentsCount: number;
  createdAt: number;
}

export default function CampaignCreator() {
  const { ngos, currentUser } = useAppData();
  const ngo = useMemo(() => ngos.find((n) => n.userId === currentUser?.userId), [ngos, currentUser]);

  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [myCampaigns, setMyCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Fetch existing campaigns via listener
  useEffect(() => {
    if (!ngo?.id) {
      setLoading(false);
      return;
    }

    const campaignsRef = collection(db, "campaigns");
    const q = query(
      campaignsRef, 
      where("ngo_id", "==", ngo.id), 
      orderBy("created_at", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMyCampaigns(snapshot.docs.map(d => {
        const c = d.data();
        return {
          id: d.id,
          title: c.title,
          caption: c.caption,
          mediaUrls: c.media_urls || [],
          likesCount: c.likes_count || 0,
          commentsCount: c.comments_count || 0,
          createdAt: c.created_at?.toMillis?.() || Date.now(),
        };
      }));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [ngo?.id]);

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const handlePublish = async () => {
    if (!title.trim() || !caption.trim() || !ngo?.id) return;
    setPublishing(true);

    let mediaUrls: string[] = [];

    try {
      // Upload media if selected
      if (mediaFile && currentUser?.userId) {
        const filePath = `campaign-media/${currentUser.userId}/${Date.now()}-${mediaFile.name}`;
        const storageRef = ref(storage, filePath);
        
        await uploadBytes(storageRef, mediaFile);
        const url = await getDownloadURL(storageRef);
        mediaUrls = [url];
      }

      await addDoc(collection(db, "campaigns"), {
        ngo_id: ngo.id,
        ngo_user_id: currentUser?.userId, // Useful for joins later
        ngo_name: ngo.ngoName,
        title: title.trim(),
        caption: caption.trim(),
        media_urls: mediaUrls,
        likes_count: 0,
        comments_count: 0,
        created_at: serverTimestamp()
      });

      setPublished(true);
      setTitle("");
      setCaption("");
      setMediaFile(null);
      setMediaPreview(null);
      setShowForm(false);
      setTimeout(() => setPublished(false), 3000);
    } catch (e) {
      console.error("Error publishing campaign:", e);
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async (campaignId: string) => {
    try {
      await deleteDoc(doc(db, "campaigns", campaignId));
    } catch (e) {
      console.error("Error deleting campaign:", e);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-foreground flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-warning" /> Campaigns
        </h2>
        <Button
          size="sm"
          variant={showForm ? "secondary" : "default"}
          className={`h-8 rounded-lg text-xs font-bold ${!showForm ? "bg-emergency hover:bg-emergency/90 text-emergency-foreground" : ""}`}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? <><X className="w-3 h-3 mr-1" /> Cancel</> : <><Edit3 className="w-3 h-3 mr-1" /> {t("ngo.createCampaign")}</>}
        </Button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <Card className="border-warning/20 bg-warning/5">
              <CardContent className="p-4 space-y-3">
                <div>
                  <p className="text-[10px] font-bold text-foreground mb-1 uppercase tracking-wider">{t("ngo.campaignTitle")}</p>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Flood Relief Drive 2026" className="text-sm" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-foreground mb-1 uppercase tracking-wider">{t("ngo.campaignCaption")}</p>
                  <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={4} placeholder="Describe your campaign..." className="text-sm" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-foreground mb-1 uppercase tracking-wider">Media (optional)</p>
                  <input type="file" accept="image/*,video/*" onChange={handleMediaSelect} className="text-xs text-muted-foreground" />
                  {mediaPreview && (
                    <div className="mt-2 relative w-full aspect-video rounded-lg overflow-hidden border border-border/30 bg-muted/10">
                      <img src={mediaPreview} alt="Preview" className="w-full h-full object-cover" />
                      <button onClick={() => { setMediaFile(null); setMediaPreview(null); }} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-background/80 flex items-center justify-center">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
                <Button
                  className="w-full h-11 rounded-xl bg-warning hover:bg-warning/90 text-warning-foreground font-bold"
                  onClick={handlePublish}
                  disabled={!title.trim() || !caption.trim() || publishing}
                >
                  {publishing ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publishing...</>
                  ) : published ? (
                    <><CheckCircle2 className="w-4 h-4 mr-2" /> Published!</>
                  ) : (
                    <><Send className="w-4 h-4 mr-2" /> {t("ngo.publishCampaign")}</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <p className="text-xs font-bold text-foreground mb-3 uppercase tracking-wider">{t("ngo.myCampaigns")} ({myCampaigns.length})</p>
        {loading ? (
          <div className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
        ) : myCampaigns.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">No campaigns published yet. Create your first!</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {myCampaigns.map((c) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-border/30 overflow-hidden">
                  {c.mediaUrls.length > 0 && (
                    <img src={c.mediaUrls[0]} alt={c.title} className="w-full aspect-video object-cover" />
                  )}
                  <CardContent className="p-3 space-y-1">
                    <div className="flex items-start justify-between">
                      <h3 className="text-sm font-bold text-foreground">{c.title}</h3>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{c.caption}</p>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1">
                      <span>❤️ {c.likesCount}</span>
                      <span>💬 {c.commentsCount}</span>
                      <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
