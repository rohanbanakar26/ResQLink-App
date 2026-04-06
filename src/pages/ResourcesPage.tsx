import { useState, useEffect, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useAppData } from "@/context/AppDataContext";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  updateDoc, 
  serverTimestamp, 
  increment,
  getDoc
} from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Heart, MessageCircle, Send, Building2, MapPin, UserPlus, UserCheck, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistance, haversineDistance } from "@/utils/geo";
import TrustStars from "@/components/profile/TrustStars";
import VerifiedBadge from "@/components/safety/VerifiedBadge";
import t from "@/utils/i18n";

interface Campaign {
  id: string;
  ngoId: string;
  ngoName: string;
  ngoTrustScore: number;
  title: string;
  caption: string;
  mediaUrls: string[];
  likesCount: number;
  commentsCount: number;
  createdAt: number;
  liked: boolean;
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  createdAt: number;
}

export default function ResourcesPage() {
  const { isAuthenticated, currentUser, ngos, location, followingList, toggleFollow } = useAppData();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedComments, setExpandedComments] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const userId = currentUser?.userId;

  if (!isAuthenticated) return <Navigate to="/auth" replace />;

  // Fetch campaigns, follows, and likes
  useEffect(() => {
    if (!userId) return;

    const campaignsRef = collection(db, "campaigns");
    const q = query(campaignsRef, orderBy("created_at", "desc"));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      // Fetch user's likes
      const likesQuery = query(collection(db, "campaign_likes"), where("user_id", "==", userId));
      
      const likesSnap = await getDocs(likesQuery);
      const likedSet = new Set(likesSnap.docs.map(d => d.data().campaign_id));

      const campaignData = await Promise.all(snapshot.docs.map(async d => {
        const c = d.data();
        // Fetch NGO trust score from profile
        const pRef = doc(db, "profiles", c.ngo_user_id || c.ngo_id);
        const pSnap = await getDoc(pRef);
        const trustScore = pSnap.exists() ? (pSnap.data().trust_score || 4.5) : 4.5;

        return {
          id: d.id,
          ngoId: c.ngo_id,
          ngoName: c.ngo_name || "NGO",
          ngoTrustScore: trustScore,
          title: c.title,
          caption: c.caption,
          mediaUrls: c.media_urls || [],
          likesCount: c.likes_count || 0,
          commentsCount: c.comments_count || 0,
          createdAt: c.created_at?.toMillis?.() || Date.now(),
          liked: likedSet.has(d.id),
        };
      }));
      
      setCampaigns(campaignData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const toggleLike = async (campaignId: string) => {
    if (!userId) return;
    const campRef = doc(db, "campaigns", campaignId);
    const likeQuery = query(collection(db, "campaign_likes"), where("campaign_id", "==", campaignId), where("user_id", "==", userId));
    const likeSnap = await getDocs(likeQuery);

    if (!likeSnap.empty) {
      // Unlike
      await deleteDoc(likeSnap.docs[0].ref);
      await updateDoc(campRef, { likes_count: increment(-1) });
    } else {
      // Like
      await addDoc(collection(db, "campaign_likes"), { campaign_id: campaignId, user_id: userId, created_at: serverTimestamp() });
      await updateDoc(campRef, { likes_count: increment(1) });
    }
  };

  const sortedCampaigns = useMemo(() => {
    return [...campaigns].sort((a, b) => {
      const aFollowed = followingList.includes(a.ngoId);
      const bFollowed = followingList.includes(b.ngoId);
      
      if (aFollowed && !bFollowed) return -1;
      if (!aFollowed && bFollowed) return 1;

      // Distance checking
      const nA = ngos.find(n => n.id === a.ngoId);
      const nB = ngos.find(n => n.id === b.ngoId);
      const distA = nA ? haversineDistance(location, nA.location) ?? 999 : 999;
      const distB = nB ? haversineDistance(location, nB.location) ?? 999 : 999;

      const aNearby = distA <= 25;
      const bNearby = distB <= 25;

      if (aNearby && !bNearby) return -1;
      if (!aNearby && bNearby) return 1;

      return b.createdAt - a.createdAt; // Standard fallback
    });
  }, [campaigns, followingList, location, ngos]);

  const loadComments = async (campaignId: string) => {
    if (expandedComments === campaignId) {
      setExpandedComments(null);
      return;
    }

    const commentsRef = collection(db, "campaigns", campaignId, "comments");
    const q = query(commentsRef, orderBy("created_at", "asc"));
    
    // Static fetch for performance or sub listener? Let's do snapshot for real-time
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const commentData = await Promise.all(snapshot.docs.map(async d => {
        const c = d.data();
        const pSnap = await getDoc(doc(db, "profiles", c.user_id));
        return {
          id: d.id,
          userId: c.user_id,
          userName: pSnap.exists() ? (pSnap.data().full_name || "User") : "User",
          content: c.content,
          createdAt: c.created_at?.toMillis?.() || Date.now(),
        };
      }));
      setComments(prev => ({ ...prev, [campaignId]: commentData }));
    });

    setExpandedComments(campaignId);
  };

  const submitComment = async (campaignId: string) => {
    const content = commentInputs[campaignId]?.trim();
    if (!content || !userId) return;

    const commentsRef = collection(db, "campaigns", campaignId, "comments");
    await addDoc(commentsRef, {
      user_id: userId,
      content,
      created_at: serverTimestamp(),
    });

    await updateDoc(doc(db, "campaigns", campaignId), {
      comments_count: increment(1)
    });

    setCommentInputs((prev) => ({ ...prev, [campaignId]: "" }));
  };

  const nearbyNgos = useMemo(() => {
    return ngos
      .map((n) => ({ ...n, distanceKm: haversineDistance(location, n.location) }))
      .filter((n) => n.distanceKm === null || n.distanceKm <= 25)
      .sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999))
      .slice(0, 5);
  }, [ngos, location]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-6">
      <div>
        <Badge variant="outline" className="border-info/30 text-info mb-3">
          <Building2 className="w-3.5 h-3.5 mr-1" /> {t("resources.campaigns")}
        </Badge>
        <h1 className="text-2xl font-bold text-foreground">{t("resources.title")}</h1>
      </div>

      {nearbyNgos.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase mb-3">{t("resources.nearbyNGOs")}</p>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {nearbyNgos.map((ngo) => (
              <Card key={ngo.id} className="flex-shrink-0 w-40 border-border/50">
                <CardContent className="p-3 text-center">
                  <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-2">
                    <Building2 className="w-5 h-5 text-success" />
                  </div>
                  <p className="text-xs font-semibold text-foreground truncate">{ngo.ngoName}</p>
                  {ngo.distanceKm != null && (
                    <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5 mt-1">
                      <MapPin className="w-2.5 h-2.5" /> {formatDistance(ngo.distanceKm)}
                    </p>
                  )}
                  <Button
                    size="sm"
                    variant={followingList.includes(ngo.id) ? "secondary" : "outline"}
                    className="w-full mt-2 h-7 text-[10px]"
                    onClick={() => toggleFollow(ngo.id, "ngo")}
                  >
                    {followingList.includes(ngo.id) ? (
                      <><UserCheck className="w-3 h-3 mr-1" /> {t("resources.following")}</>
                    ) : (
                      <><UserPlus className="w-3 h-3 mr-1" /> {t("resources.follow")}</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground text-sm">
            No campaigns yet. NGOs will post updates here.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {sortedCampaigns.map((campaign) => (
            <motion.div
              key={campaign.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-border/50 overflow-hidden">
                <div className="flex items-center gap-3 p-4 pb-2">
                  <div className="w-9 h-9 rounded-full bg-success/10 flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-success" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-semibold text-foreground">{campaign.ngoName}</p>
                      <VerifiedBadge type="ngo" size="sm" />
                    </div>
                    <TrustStars score={campaign.ngoTrustScore} size="sm" />
                  </div>
                  <Button
                    size="sm"
                    variant={followingList.includes(campaign.ngoId) ? "secondary" : "outline"}
                    className="h-7 text-[10px]"
                    onClick={() => toggleFollow(campaign.ngoId, "ngo")}
                  >
                    {followingList.includes(campaign.ngoId) ? t("resources.following") : t("resources.follow")}
                  </Button>
                </div>

                {campaign.mediaUrls.length > 0 && (
                  <div className="relative">
                    {campaign.mediaUrls[0].match(/\.(mp4|webm|mov)/) ? (
                      <video src={campaign.mediaUrls[0]} className="w-full aspect-video object-cover" controls />
                    ) : (
                      <img src={campaign.mediaUrls[0]} alt={campaign.title} className="w-full aspect-video object-cover" />
                    )}
                  </div>
                )}

                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleLike(campaign.id)}
                      className="flex items-center gap-1.5 text-sm"
                    >
                      <Heart className={`w-5 h-5 transition-colors ${campaign.liked ? "fill-emergency text-emergency" : "text-muted-foreground"}`} />
                      <span className="text-xs text-muted-foreground">{campaign.likesCount}</span>
                    </button>
                    <button
                      onClick={() => loadComments(campaign.id)}
                      className="flex items-center gap-1.5 text-sm"
                    >
                      <MessageCircle className="w-5 h-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{campaign.commentsCount}</span>
                    </button>
                  </div>

                  <h3 className="text-sm font-bold text-foreground">{campaign.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{campaign.caption}</p>

                  <p className="text-[10px] text-muted-foreground">
                    {new Date(campaign.createdAt).toLocaleDateString()}
                  </p>

                  <AnimatePresence>
                    {expandedComments === campaign.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-border pt-3 mt-2 space-y-2">
                          {(comments[campaign.id] || []).map((comment) => (
                            <div key={comment.id} className="flex gap-2">
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                <span className="text-[10px] font-bold">{comment.userName.charAt(0)}</span>
                              </div>
                              <div>
                                <p className="text-xs">
                                  <span className="font-semibold text-foreground">{comment.userName}</span>{" "}
                                  <span className="text-muted-foreground">{comment.content}</span>
                                </p>
                              </div>
                            </div>
                          ))}

                          <form
                            onSubmit={(e) => { e.preventDefault(); submitComment(campaign.id); }}
                            className="flex gap-2 mt-2"
                          >
                            <Input
                              placeholder={t("resources.comment")}
                              value={commentInputs[campaign.id] || ""}
                              onChange={(e) => setCommentInputs((prev) => ({ ...prev, [campaign.id]: e.target.value }))}
                              className="h-8 text-xs"
                            />
                            <Button type="submit" size="sm" variant="ghost" className="h-8 px-2">
                              <Send className="w-3.5 h-3.5" />
                            </Button>
                          </form>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
