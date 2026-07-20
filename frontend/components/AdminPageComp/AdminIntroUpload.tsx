"use client";

import { useState, useEffect, useRef } from "react";
import { userRequest } from "../../services/RequestMethods";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_VIDEO_SIZE     = 200 * 1024 * 1024;  // 200 MB
const MAX_THUMB_SIZE     =   5 * 1024 * 1024;  // 5 MB
const ACCEPTED_VIDEO     = ".mp4,.mov,.webm";
const ACCEPTED_THUMB     = ".jpg,.jpeg,.png,.webp";

// ─── Types ────────────────────────────────────────────────────────────────────
type IntroScene = {
  _id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  duration: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Reads the native duration of a local video file using an offscreen element. */
function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url   = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => { resolve(video.duration); URL.revokeObjectURL(url); };
    video.onerror = () => { reject(new Error("Could not read video metadata")); URL.revokeObjectURL(url); };
    video.src = url;
  });
}

// ─── Upload helper ─────────────────────────────────────────────────────────────
async function uploadToGCS(
  file: File,
  resourceType: "video" | "image"
): Promise<{ url: string; publicId: string }> {
  const sigRes = await userRequest.post("/pams-studio/intro-scenes/upload-signature", {
    contentType: file.type, filename: file.name,
  });
  const { uploadUrl, objectPath, publicUrl } = sigRes.data;
  const putRes = await fetch(uploadUrl, {
    method: "PUT", body: file, headers: { "Content-Type": file.type },
  });
  if (!putRes.ok) throw new Error(`GCS upload failed: ${putRes.status}`);
  return { url: publicUrl, publicId: objectPath };
}

// ─── Existing Intro Scene Row ─────────────────────────────────────────────────
function IntroSceneRow({
  scene,
  onDelete,
}: {
  scene: IntroScene;
  onDelete: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex items-center gap-3 p-3 rounded-2xl bg-white/4 border border-white/8 hover:border-white/15 transition-colors group"
    >
      {/* Thumbnail / video preview */}
      <div className="relative w-10 flex-shrink-0 aspect-[9/16] rounded-lg overflow-hidden bg-black/50 border border-white/10">
        {scene.thumbnailUrl ? (
          <img src={scene.thumbnailUrl} alt={scene.title} className="w-full h-full object-cover" />
        ) : (
          <video
            src={scene.videoUrl}
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white/85 truncate">{scene.title}</p>
        <p className="text-[10px] text-white/35 mt-0.5">
          {scene.duration.toFixed(1)}s &middot; order {scene.sortOrder}
        </p>
      </div>

      {/* Preview link */}
      <a
        href={scene.videoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[10px] text-cyan-400/70 hover:text-cyan-300 transition-colors flex-shrink-0 px-2 py-1 rounded-lg hover:bg-cyan-500/10"
      >
        Preview
      </a>

      {/* Delete */}
      <button
        onClick={() => {
          if (!confirming) { setConfirming(true); return; }
          onDelete(scene._id);
        }}
        onBlur={() => setConfirming(false)}
        className={`text-[10px] font-bold flex-shrink-0 px-2 py-1 rounded-lg border transition-all ${
          confirming
            ? "text-white bg-red-500/80 border-red-400/60 animate-pulse"
            : "text-red-400/70 border-red-400/15 bg-red-500/8 hover:bg-red-500/20 hover:text-red-300"
        }`}
      >
        {confirming ? "Confirm" : "Delete"}
      </button>
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminIntroUpload() {
  // List
  const [scenes, setScenes]       = useState<IntroScene[]>([]);
  const [loading, setLoading]     = useState(true);

  // Form
  const [title, setTitle]         = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [detectedDur, setDetectedDur] = useState<number | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);

  // Status
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState<string>("");

  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch existing intro scenes ────────────────────────────────────────────
  const fetchScenes = async () => {
    try {
      const res = await userRequest.get("/pams-studio/intro-scenes");
      setScenes(res.data.introScenes ?? []);
    } catch {
      toast.error("Failed to load intro scenes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchScenes(); }, []);

  // ── Video file selection ───────────────────────────────────────────────────
  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_VIDEO_SIZE) {
      toast.error(`Video too large — max ${fmtSize(MAX_VIDEO_SIZE)}`);
      return;
    }

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    setDetectedDur(null);

    try {
      const dur = await getVideoDuration(file);
      setDetectedDur(dur);
    } catch {
      toast.error("Could not read video duration — check the file");
    }
  };

  // ── Thumbnail file selection ───────────────────────────────────────────────
  const handleThumbChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_THUMB_SIZE) {
      toast.error(`Thumbnail too large — max ${fmtSize(MAX_THUMB_SIZE)}`);
      return;
    }
    setThumbFile(file);
    setThumbPreview(URL.createObjectURL(file));
  };

  // ── Reset form ─────────────────────────────────────────────────────────────
  const resetForm = () => {
    setTitle("");
    setSortOrder("0");
    setVideoFile(null);
    setThumbFile(null);
    setDetectedDur(null);
    if (videoPreview) URL.revokeObjectURL(videoPreview);
    if (thumbPreview) URL.revokeObjectURL(thumbPreview);
    setVideoPreview(null);
    setThumbPreview(null);
    if (videoInputRef.current) videoInputRef.current.value = "";
    if (thumbInputRef.current) thumbInputRef.current.value = "";
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!title.trim())    { toast.error("Title is required");            return; }
    if (!videoFile)       { toast.error("Select a video file");          return; }
    if (!detectedDur)     { toast.error("Could not detect video duration"); return; }
    if (detectedDur > 10) {
      toast.error(`Intro must be ≤ 10s (detected ${detectedDur.toFixed(1)}s)`);
      return;
    }

    setUploading(true);
    try {
      // 1. Upload video to GCS
      setUploadStage("Uploading video to GCS…");
      const { url: videoUrl, publicId } = await uploadToGCS(videoFile, "video");

      // 2. Upload thumbnail (optional)
      let thumbnailUrl: string | null = null;
      if (thumbFile) {
        setUploadStage("Uploading thumbnail…");
        const { url } = await uploadToGCS(thumbFile, "image");
        thumbnailUrl = url;
      }

      // 3. Save to DB
      setUploadStage("Saving intro scene…");
      await userRequest.post("/pams-studio/intro-scenes", {
        title:        title.trim(),
        videoUrl,
        publicId,
        thumbnailUrl,
        duration:     parseFloat(detectedDur.toFixed(2)),
        sortOrder:    Number(sortOrder) || 0,
      });

      toast.success(`"${title.trim()}" intro scene added!`);
      resetForm();
      await fetchScenes();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      toast.error(e?.response?.data?.error || e?.message || "Upload failed");
    } finally {
      setUploading(false);
      setUploadStage("");
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    try {
      await userRequest.delete(`/pams-studio/intro-scenes/${id}`);
      toast.success("Intro scene removed");
      setScenes((prev) => prev.filter((s) => s._id !== id));
    } catch {
      toast.error("Failed to delete intro scene");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Upload Form ──────────────────────────────────────────────────────── */}
      <div className="rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-xl bg-amber-500/20 flex items-center justify-center text-sm">🎬</div>
          <h2 className="text-sm font-bold text-white/80 uppercase tracking-[0.18em]">
            Add Intro Scene
          </h2>
        </div>

        {/* Title + Sort Order */}
        <div className="grid grid-cols-[1fr_120px] gap-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">
              Title *
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. QUTIE Chums Intro v1"
              className="w-full bg-white/5 border border-white/10 text-white placeholder-white/20 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400/40 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">
              Sort Order
            </label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              min={0}
              className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-amber-400/40 transition-colors"
            />
          </div>
        </div>

        {/* Video picker */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">
            Video File * <span className="normal-case font-normal text-white/25">(mp4 / mov / webm — max 200 MB, ≤ 10s)</span>
          </label>

          <div
            onClick={() => videoInputRef.current?.click()}
            className={`relative rounded-2xl border-2 border-dashed transition-colors cursor-pointer overflow-hidden ${
              videoFile
                ? "border-amber-400/50 bg-amber-400/5"
                : "border-white/10 hover:border-white/25 bg-white/[0.02]"
            }`}
            style={{ aspectRatio: videoFile ? undefined : "21/6" }}
          >
            <input
              ref={videoInputRef}
              type="file"
              accept={ACCEPTED_VIDEO}
              onChange={handleVideoChange}
              className="hidden"
            />

            {videoFile ? (
              <div className="flex items-center gap-4 p-4">
                {/* Mini preview */}
                {videoPreview && (
                  <div className="w-12 aspect-[9/16] flex-shrink-0 rounded-xl overflow-hidden bg-black border border-white/10">
                    <video src={videoPreview} muted playsInline autoPlay loop className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 font-medium truncate">{videoFile.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-white/35">{fmtSize(videoFile.size)}</span>
                    {detectedDur !== null && (
                      <>
                        <span className="text-white/15">·</span>
                        <span className={`text-[11px] font-semibold ${detectedDur > 10 ? "text-red-400" : "text-amber-300"}`}>
                          {detectedDur.toFixed(2)}s
                          {detectedDur > 10 && " ⚠ too long"}
                        </span>
                      </>
                    )}
                    {detectedDur === null && (
                      <span className="text-[11px] text-white/25 italic">reading duration…</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setVideoFile(null);
                    setDetectedDur(null);
                    if (videoPreview) URL.revokeObjectURL(videoPreview);
                    setVideoPreview(null);
                    if (videoInputRef.current) videoInputRef.current.value = "";
                  }}
                  className="text-[10px] text-red-400/70 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10 transition flex-shrink-0"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-2 p-6">
                <span className="text-2xl opacity-30">🎬</span>
                <p className="text-xs text-white/25">Click to select video</p>
              </div>
            )}
          </div>
        </div>

        {/* Thumbnail picker (optional) */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">
            Thumbnail <span className="normal-case font-normal text-white/25">(optional — jpg / png / webp — max 5 MB)</span>
          </label>

          <div
            onClick={() => thumbInputRef.current?.click()}
            className={`relative rounded-2xl border border-dashed transition-colors cursor-pointer ${
              thumbFile
                ? "border-white/20 bg-white/4"
                : "border-white/8 hover:border-white/18 bg-white/[0.015]"
            }`}
          >
            <input
              ref={thumbInputRef}
              type="file"
              accept={ACCEPTED_THUMB}
              onChange={handleThumbChange}
              className="hidden"
            />

            {thumbFile ? (
              <div className="flex items-center gap-3 p-3">
                {thumbPreview && (
                  <div className="w-10 aspect-[9/16] flex-shrink-0 rounded-lg overflow-hidden bg-black border border-white/10">
                    <img src={thumbPreview} alt="thumb" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/65 truncate">{thumbFile.name}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">{fmtSize(thumbFile.size)}</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setThumbFile(null);
                    if (thumbPreview) URL.revokeObjectURL(thumbPreview);
                    setThumbPreview(null);
                    if (thumbInputRef.current) thumbInputRef.current.value = "";
                  }}
                  className="text-[10px] text-red-400/60 hover:text-red-300 px-2 py-1 rounded-lg hover:bg-red-500/10 transition flex-shrink-0"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 py-3 px-4">
                <span className="text-white/20 text-sm">🖼</span>
                <p className="text-[11px] text-white/20">Click to add thumbnail</p>
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleSubmit}
            disabled={uploading || !videoFile || !title.trim() || !detectedDur || detectedDur > 10}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
              uploading || !videoFile || !title.trim() || !detectedDur || detectedDur > 10
                ? "bg-white/5 border border-white/8 text-white/20 cursor-not-allowed"
                : "bg-gradient-to-r from-amber-500/80 to-orange-500/80 border border-amber-400/40 text-white hover:from-amber-400/80 hover:to-orange-400/80 shadow-[0_0_18px_rgba(251,191,36,0.25)]"
            }`}
          >
            {uploading ? (
              <>
                <div className="w-3 h-3 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                {uploadStage || "Uploading…"}
              </>
            ) : (
              "Upload Intro Scene"
            )}
          </button>

          {(videoFile || title) && !uploading && (
            <button
              onClick={resetForm}
              className="text-xs text-white/30 hover:text-white/55 transition-colors px-3 py-2"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Existing Intro Scenes ─────────────────────────────────────────────── */}
      <div className="rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-xl bg-white/8 flex items-center justify-center text-sm">🗂</div>
            <h2 className="text-sm font-bold text-white/80 uppercase tracking-[0.18em]">
              Existing Intro Scenes
            </h2>
          </div>
          <span className="text-[10px] text-white/25">{scenes.length} total</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 gap-2">
            <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            <span className="text-xs text-white/30">Loading…</span>
          </div>
        ) : scenes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 rounded-2xl border border-dashed border-white/8 gap-2">
            <span className="text-2xl opacity-20">🎬</span>
            <p className="text-xs text-white/25">No intro scenes yet — upload one above</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {scenes.map((scene) => (
              <IntroSceneRow
                key={scene._id}
                scene={scene}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
