import { useState, useRef } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Camera, X, Loader2 } from "lucide-react";

interface MediaUploadProps {
  userId: string;
  files: string[];
  onChange: (urls: string[]) => void;
  required?: boolean;
}

export default function MediaUpload({ userId, files, onChange, required }: MediaUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected || selected.length === 0) return;

    setUploading(true);
    const newUrls: string[] = [];

    for (const file of Array.from(selected)) {
      const ext = file.name.split(".").pop();
      const path = `emergency-media/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const storageRef = ref(storage, path);

      try {
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        newUrls.push(url);
      } catch (error) {
        console.error("Error uploading to Firebase Storage:", error);
      }
    }

    onChange([...files, ...newUrls]);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeFile = (url: string) => {
    onChange(files.filter((f) => f !== url));
  };

  return (
    <div>
      <label className="text-sm font-medium text-foreground mb-1.5 block">
        📸 Upload photo / video {required ? <span className="text-emergency">*</span> : "(optional)"}
      </label>

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleUpload}
      />

      <div className="flex flex-wrap gap-2">
        {files.map((url) => (
          <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
            {url.match(/\.(mp4|webm|mov)/) ? (
              <video src={url} className="w-full h-full object-cover" />
            ) : (
              <img src={url} alt="Upload" className="w-full h-full object-cover" />
            )}
            <button
              type="button"
              onClick={() => removeFile(url)}
              className="absolute top-0.5 right-0.5 bg-background/80 rounded-full p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          className="w-20 h-20 flex flex-col items-center justify-center gap-1 border-dashed"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
          <span className="text-[10px]">{uploading ? "Uploading" : "Add"}</span>
        </Button>
      </div>
    </div>
  );
}
