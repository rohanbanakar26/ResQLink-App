import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, CheckCircle2, AlertTriangle, X, Loader2 } from "lucide-react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import t from "@/utils/i18n";

interface CompletionFlowProps {
  requestId: string;
  isVolunteer: boolean;
  isCitizen: boolean;
  completionProofs: string[];
  citizenApproved: boolean | null;
  onUploadProofs: (urls: string[]) => Promise<void>;
  onCitizenApprove: () => Promise<void>;
  onCitizenReject: () => Promise<void>;
  onRate: () => void;
  hasRated?: boolean;
}

export default function CompletionFlow({
  requestId,
  isVolunteer,
  isCitizen,
  completionProofs,
  citizenApproved,
  onUploadProofs,
  onCitizenApprove,
  onCitizenReject,
  onRate,
  hasRated = false,
}: CompletionFlowProps) {
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<string[]>(completionProofs);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    setUploading(true);
    const newUrls: string[] = [];

    for (const file of Array.from(selected)) {
      const ext = file.name.split(".").pop();
      const path = `completion-proofs/${requestId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const storageRef = ref(storage, path);

      try {
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        newUrls.push(url);
      } catch (error) {
        console.error("Error uploading to Firebase Storage:", error);
      }
    }

    const allUrls = [...files, ...newUrls];
    setFiles(allUrls);
    await onUploadProofs(allUrls);
    setUploading(false);
  };

  // Volunteer view: Upload proof
  if (isVolunteer && completionProofs.length === 0) {
    return (
      <Card className="border-info/30 bg-info/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-info" />
            <p className="text-sm font-medium text-foreground">{t("completion.uploadProof")}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            Upload before & after photos to verify task completion
          </p>

          <div className="flex flex-wrap gap-2">
            {files.map((url) => (
              <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
                <img src={url} alt="Proof" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>

          <label className="cursor-pointer">
            <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleUpload} />
            <Button type="button" variant="outline" className="w-full" disabled={uploading} asChild>
              <span>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Camera className="w-4 h-4 mr-2" />}
                {uploading ? "Uploading..." : "Upload Proof Photos"}
              </span>
            </Button>
          </label>
        </CardContent>
      </Card>
    );
  }

  // Citizen view: Approve or reject
  if (isCitizen && completionProofs.length > 0 && citizenApproved === null) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
            <p className="text-sm font-medium text-foreground">{t("completion.title")}</p>
          </div>

          <p className="text-xs text-muted-foreground">{t("completion.beforeAfter")}</p>

          <div className="flex flex-wrap gap-2">
            {completionProofs.map((url, i) => (
              <div key={url} className="relative w-24 h-24 rounded-lg overflow-hidden border border-border">
                {url.match(/\.(mp4|webm|mov)/) ? (
                  <video src={url} className="w-full h-full object-cover" controls />
                ) : (
                  <img src={url} alt={`Proof ${i + 1}`} className="w-full h-full object-cover" />
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              className="flex-1 bg-success hover:bg-success/90 text-white"
              onClick={async () => {
                await onCitizenApprove();
                onRate();
              }}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {t("completion.approve")}
            </Button>
            <Button
              variant="outline"
              className="flex-1 text-destructive border-destructive/30"
              onClick={onCitizenReject}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              {t("completion.reportIssue")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Already approved
  if (citizenApproved === true) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="p-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <p className="text-sm text-success font-medium">Citizen approved ✓</p>
          </div>
          {!hasRated && (
             <Button size="sm" variant="outline" className="text-success border-success/30" onClick={onRate}>
               Rate Experience
             </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Rejected
  if (citizenApproved === false) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <p className="text-sm text-destructive font-medium">Issue reported — under review</p>
        </CardContent>
      </Card>
    );
  }

  return null;
}
