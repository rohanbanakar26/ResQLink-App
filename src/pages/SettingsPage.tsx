import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAppData } from "@/context/AppDataContext";
import { db, storage } from "@/lib/firebase";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Settings, User, Globe, Shield, Phone, LogOut, ArrowLeft, Camera, Loader2 } from "lucide-react";
import { setLanguage, getLanguage, type Language } from "@/utils/i18n";
import t from "@/utils/i18n";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, logout, volunteers, ngos } = useAppData();
  const [lang, setLang] = useState<Language>(getLanguage());
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentUser?.name || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [skillsStr, setSkillsStr] = useState("");
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Fetch existing avatar on mount
  useEffect(() => {
    if (!currentUser?.userId) return;
    getDoc(doc(db, "profiles", currentUser.userId))
      .then((snap) => { if (snap.exists()) setAvatarUrl(snap.data().avatar_url || null); })
      .catch(() => {});
  }, [currentUser?.userId]);

  const currentVolunteer = currentUser?.role === "volunteer" ? volunteers.find((v) => v.userId === currentUser?.userId) : null;
  const currentNgo = currentUser?.role === "ngo" ? ngos.find((n) => n.userId === currentUser?.userId) : null;

  useEffect(() => {
    if (!editing) {
      if (currentUser?.role === "volunteer" && currentVolunteer) {
        setSkillsStr(currentVolunteer.skills?.join(", ") || "");
      } else if (currentUser?.role === "ngo" && currentNgo) {
        setSkillsStr(currentNgo.services?.join(", ") || "");
      }
    }
  }, [editing, currentVolunteer, currentNgo, currentUser?.role]);

  if (!isAuthenticated || !currentUser) return <Navigate to="/auth" replace />;

  const handleLanguageChange = (value: Language) => {
    setLang(value);
    setLanguage(value);
    // Force re-render by reloading
    window.location.reload();
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const profileRef = doc(db, "profiles", currentUser.userId);
      await updateDoc(profileRef, {
        full_name: name,
        phone,
        language: lang,
      });

      if (currentUser.role === "volunteer" && currentVolunteer?.id) {
         await updateDoc(doc(db, "volunteers", currentVolunteer.id), {
            skills: skillsStr.split(",").map(s => s.trim()).filter(Boolean)
         });
      } else if (currentUser.role === "ngo" && currentNgo?.id) {
         await updateDoc(doc(db, "ngos", currentNgo.id), {
            services: skillsStr.split(",").map(s => s.trim()).filter(Boolean)
         });
      }

      setEditing(false);
    } catch (e) {
      console.error("Error saving profile:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    const ext = file.name.split(".").pop();
    const path = `profile-avatars/${currentUser.userId}/avatar.${ext}`;
    const storageRef = ref(storage, path);

    try {
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      const profileRef = doc(db, "profiles", currentUser.userId);
      await updateDoc(profileRef, { avatar_url: url });
      setAvatarUrl(url); // update local state immediately
    } catch (e) {
      console.error("Error uploading avatar:", e);
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-muted-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground mb-1">
            <Settings className="w-3 h-3 mr-1" /> {t("settings.title")}
          </Badge>
          <h1 className="text-2xl font-bold text-foreground">{t("settings.title")}</h1>
        </div>
      </div>

      {/* Edit Profile */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-foreground" />
              <h3 className="text-sm font-semibold text-foreground">{t("settings.editProfile")}</h3>
            </div>
            {!editing && (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                Edit
              </Button>
            )}
          </div>

          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  : <User className="w-8 h-8 text-primary" />
                }
              </div>
              <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emergency flex items-center justify-center cursor-pointer">
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                {avatarUploading ? (
                  <Loader2 className="w-3 h-3 text-white animate-spin" />
                ) : (
                  <Camera className="w-3 h-3 text-white" />
                )}
              </label>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{currentUser.name}</p>
              <p className="text-xs text-muted-foreground">{currentUser.email}</p>
            </div>
          </div>

          {editing && (
            <>
              <div className="space-y-2">
                <Label>{t("auth.fullName")}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t("auth.phone")}</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91..." />
              </div>
              {(currentUser.role === "volunteer" || currentUser.role === "ngo") && (
                <div className="space-y-2">
                  <Label>{currentUser.role === "ngo" ? "Services (comma-separated)" : "Skills (comma-separated)"}</Label>
                  <Input value={skillsStr} onChange={(e) => setSkillsStr(e.target.value)} placeholder="e.g. medical, rescue" />
                </div>
              )}
              <div className="flex gap-3 mt-4">
                <Button variant="outline" onClick={() => setEditing(false)} className="flex-1">
                  {t("general.cancel")}
                </Button>
                <Button
                  className="flex-1 bg-emergency hover:bg-emergency/90 text-emergency-foreground"
                  onClick={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? "Saving..." : t("general.save")}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-foreground" />
            <h3 className="text-sm font-semibold text-foreground">{t("settings.language")}</h3>
          </div>
          <Select value={lang} onValueChange={(v) => handleLanguageChange(v as Language)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">🇬🇧 English</SelectItem>
              <SelectItem value="hi">🇮🇳 हिन्दी (Hindi)</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Privacy */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-foreground" />
            <h3 className="text-sm font-semibold text-foreground">{t("settings.privacy")}</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Your location is only shared when you submit an emergency request. Personal data is protected by end-to-end encryption.
          </p>
        </CardContent>
      </Card>

      {/* Emergency Contacts */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <Phone className="w-4 h-4 text-emergency" />
            <h3 className="text-sm font-semibold text-foreground">{t("settings.emergencyContacts")}</h3>
          </div>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>🚨 Police: <a href="tel:100" className="text-info underline">100</a></p>
            <p>🚑 Ambulance: <a href="tel:108" className="text-info underline">108</a></p>
            <p>🔥 Fire: <a href="tel:101" className="text-info underline">101</a></p>
            <p>👩 Women Helpline: <a href="tel:1091" className="text-info underline">1091</a></p>
            <p>👶 Child Helpline: <a href="tel:1098" className="text-info underline">1098</a></p>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Logout */}
      <Button
        variant="outline"
        className="w-full text-destructive hover:bg-destructive/10"
        onClick={async () => {
          await logout();
          window.location.href = "/";
        }}
      >
        <LogOut className="w-4 h-4 mr-2" /> {t("settings.logout")}
      </Button>
    </div>
  );
}
