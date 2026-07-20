"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { userRequest } from "../../services/RequestMethods";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_SLOTS     = 25;
const MAX_FILE_SIZE = 10 * 1024 * 1024;   // 10 MB per image
const ACCEPTED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const COLS          = 5;

// ─── Types ────────────────────────────────────────────────────────────────────
type CustomImage = {
  _id: string;
  title: string;
  imageUrl: string;
  publicId: string;
  sortOrder: number;
};

type SlotState =
  | { kind: "empty" }
  | { kind: "uploading"; file: File; preview: string; progress: number }
  | { kind: "filled"; image: CustomImage };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(0)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function uploadToGCS(file: File): Promise<{ url: string; publicId: string }> {
  const sigRes = await userRequest.post("/pams-studio/custom-images/upload-signature", {
    contentType: file.type, filename: file.name,
  });
  const { uploadUrl, objectPath, publicUrl } = sigRes.data;
  const putRes = await fetch(uploadUrl, {
    method: "PUT", body: file, headers: { "Content-Type": file.type },
  });
  if (!putRes.ok) throw new Error(`GCS upload failed: ${putRes.status}`);
  return { url: publicUrl, publicId: objectPath };
}

// ─── Single Slot ─────────────────────────────────────────────────────────────
function Slot({
  slot,
  index,
  onFileSelected,
  onDelete,
  onTitleChange,
  isDragOver,
}: {
  slot: SlotState;
  index: number;
  onFileSelected: (idx: number, files: FileList) => void;
  onDelete: (image: CustomImage) => void;
  onTitleChange: (image: CustomImage, title: string) => void;
  isDragOver: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  if (slot.kind === "filled") {
    const img = slot.image;
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.85 }}
        className="relative group aspect-square rounded-2xl overflow-hidden border border-white/10 bg-black/40"
      >
        <img src={img.imageUrl} alt={img.title || `Image ${index + 1}`} className="w-full h-full object-cover" />

        {/* Delete overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
          <button
            onClick={() => onDelete(img)}
            className="text-[10px] font-bold text-red-400 border border-red-400/40 bg-red-500/10 hover:bg-red-500/25 rounded-lg px-3 py-1.5 transition w-full text-center"
          >
            Remove
          </button>
        </div>

        {/* Slot number badge */}
        <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center pointer-events-none">
          <span className="text-[8px] text-white/50 font-bold">{index + 1}</span>
        </div>

        {/* Title below */}
        <div className="absolute bottom-0 left-0 right-0 px-1.5 py-1 bg-gradient-to-t from-black/80 to-transparent">
          <input
            value={img.title}
            onChange={(e) => onTitleChange(img, e.target.value)}
            onBlur={(e) => {
              if (e.target.value !== img.title) onTitleChange(img, e.target.value);
            }}
            placeholder="Label (optional)"
            className="w-full bg-transparent text-[8px] text-white/60 placeholder-white/20 focus:outline-none focus:text-white/80 transition truncate"
          />
        </div>
      </motion.div>
    );
  }

  if (slot.kind === "uploading") {
    return (
      <div className="relative aspect-square rounded-2xl overflow-hidden border border-violet-400/30 bg-black/40">
        {/* Blurred preview */}
        <img src={slot.preview} alt="" className="w-full h-full object-cover opacity-40 blur-sm" />
        {/* Progress overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-3">
          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-violet-400 rounded-full transition-all duration-300"
              style={{ width: `${slot.progress}%` }}
            />
          </div>
          <span className="text-[9px] text-violet-300/70">{slot.progress}%</span>
        </div>
        <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
          <span className="text-[8px] text-white/50 font-bold">{index + 1}</span>
        </div>
      </div>
    );
  }

  // Empty slot
  return (
    <button
      onClick={() => inputRef.current?.click()}
      className={`relative aspect-square rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-1 group ${
        isDragOver
          ? "border-violet-400/60 bg-violet-400/10"
          : "border-white/10 hover:border-white/25 bg-white/[0.02] hover:bg-white/[0.04]"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_MIME.join(",")}
        multiple
        className="hidden"
        onChange={(e) => e.target.files && onFileSelected(index, e.target.files)}
      />
      <span className={`text-lg transition-opacity ${isDragOver ? "opacity-60" : "opacity-20 group-hover:opacity-40"}`}>＋</span>
      <span className="text-[8px] text-white/20 group-hover:text-white/35 transition">{index + 1}</span>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminCustomImageUpload() {
  const [slots, setSlots]         = useState<SlotState[]>(
    Array.from({ length: MAX_SLOTS }, () => ({ kind: "empty" as const }))
  );
  const [loading, setLoading]     = useState(true);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Fetch existing images ────────────────────────────────────────────────
  const fetchImages = useCallback(async () => {
    try {
      const res = await userRequest.get("/pams-studio/custom-images");
      const images: CustomImage[] = res.data.customImages ?? [];
      setSlots((prev) => {
        const next: SlotState[] = Array.from({ length: MAX_SLOTS }, () => ({ kind: "empty" }));
        images.slice(0, MAX_SLOTS).forEach((img, i) => {
          next[i] = { kind: "filled", image: img };
        });
        // Preserve any in-progress uploads
        prev.forEach((s, i) => {
          if (s.kind === "uploading") next[i] = s;
        });
        return next;
      });
    } catch {
      toast.error("Failed to load images");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchImages(); }, [fetchImages]);

  // ── Count filled + uploading slots ──────────────────────────────────────
  const filledCount = slots.filter((s) => s.kind === "filled" || s.kind === "uploading").length;

  // ── Process a batch of files into empty slots ────────────────────────────
  const processFiles = useCallback(async (files: File[], startIdx?: number) => {
    const validFiles = files.filter((f) => {
      if (!ACCEPTED_MIME.includes(f.type)) {
        toast.error(`${f.name}: not an accepted image format`);
        return false;
      }
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`${f.name}: exceeds ${fmtSize(MAX_FILE_SIZE)} limit`);
        return false;
      }
      return true;
    });

    if (!validFiles.length) return;

    // Find empty slot indices
    const emptyIndices: number[] = [];
    slots.forEach((s, i) => {
      if (s.kind === "empty") emptyIndices.push(i);
    });

    const targets = startIdx !== undefined
      ? [startIdx, ...emptyIndices.filter((i) => i !== startIdx)]
      : emptyIndices;

    const toUpload = validFiles.slice(0, targets.length);
    if (toUpload.length < validFiles.length) {
      toast(`Only ${toUpload.length} slot${toUpload.length !== 1 ? "s" : ""} available`, { icon: "⚠️" });
    }

    // Create previews + set uploading state
    const previews = await Promise.all(
      toUpload.map(
        (f) =>
          new Promise<string>((res) => {
            const r = new FileReader();
            r.onload = () => res(r.result as string);
            r.readAsDataURL(f);
          })
      )
    );

    setSlots((prev) => {
      const next = [...prev];
      toUpload.forEach((f, i) => {
        next[targets[i]] = { kind: "uploading", file: f, preview: previews[i], progress: 0 };
      });
      return next;
    });

    setUploadCount((c) => c + toUpload.length);

    // Upload concurrently
    await Promise.allSettled(
      toUpload.map(async (file, i) => {
        const slotIdx = targets[i];
        const sortOrder = slotIdx;
        try {
          // Simulate progress
          const progressTick = setInterval(() => {
            setSlots((prev) => {
              const next = [...prev];
              const s = next[slotIdx];
              if (s.kind === "uploading") {
                next[slotIdx] = { ...s, progress: Math.min(s.progress + 15, 85) };
              }
              return next;
            });
          }, 300);

          const { url, publicId } = await uploadToGCS(file);
          clearInterval(progressTick);

          // Save to DB
          const res = await userRequest.post("/pams-studio/custom-images", {
            imageUrl: url,
            publicId,
            title: file.name.replace(/\.[^/.]+$/, ""),
            sortOrder,
          });
          const saved: CustomImage = res.data.customImage;

          setSlots((prev) => {
            const next = [...prev];
            next[slotIdx] = { kind: "filled", image: { ...saved, _id: saved._id } };
            return next;
          });
        } catch (err: unknown) {
          const e = err as { response?: { data?: { error?: string } }; message?: string };
          const msg = e?.response?.data?.error || e?.message || "Upload failed";
          toast.error(`${file.name}: ${msg}`);
          setSlots((prev) => {
            const next = [...prev];
            next[slotIdx] = { kind: "empty" };
            return next;
          });
        } finally {
          setUploadCount((c) => Math.max(0, c - 1));
        }
      })
    );
  }, [slots]);

  // ── Drag and drop on the whole grid ─────────────────────────────────────
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setIsDraggingOver(false);
    }
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) processFiles(files);
  };

  // ── Per-slot file selection ──────────────────────────────────────────────
  const handleFileSelected = (startIdx: number, fileList: FileList) => {
    processFiles(Array.from(fileList), startIdx);
  };

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (image: CustomImage) => {
    try {
      await userRequest.delete(`/pams-studio/custom-images/${image._id}`);
      setSlots((prev) => {
        // Remove the deleted image and compact remaining filled slots to the front
        const filled = prev
          .filter((s) => s.kind === "filled" && (s as { kind: "filled"; image: CustomImage }).image._id !== image._id)
          .map((s) => s);
        const empty: SlotState[] = Array.from({ length: MAX_SLOTS - filled.length }, () => ({ kind: "empty" as const }));
        return [...filled, ...empty];
      });
      toast.success("Image removed");
    } catch {
      toast.error("Failed to remove image");
    }
  };

  // ── Title update ────────────────────────────────────────────────────────
  const handleTitleChange = async (image: CustomImage, newTitle: string) => {
    try {
      const res = await userRequest.patch(`/pams-studio/custom-images/${image._id}`, { title: newTitle });
      const updated = res.data.customImage;
      setSlots((prev) =>
        prev.map((s) =>
          s.kind === "filled" && (s as { kind: "filled"; image: CustomImage }).image._id === image._id
            ? { kind: "filled", image: updated }
            : s
        )
      );
    } catch {
      // Silently ignore title save failures
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header panel */}
      <div className="rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-xl bg-violet-500/20 flex items-center justify-center text-sm">🖼</div>
            <div>
              <h2 className="text-sm font-bold text-white/80 uppercase tracking-[0.18em]">Custom Character Images</h2>
              <p className="text-[10px] text-white/30 mt-0.5">
                Square images only · Max {MAX_SLOTS} slots · {fmtSize(MAX_FILE_SIZE)} per file
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-xs font-bold tabular-nums ${filledCount >= MAX_SLOTS ? "text-red-400" : "text-white/40"}`}>
              {filledCount}
            </span>
            <span className="text-xs text-white/20"> / {MAX_SLOTS}</span>
          </div>
        </div>

        {/* Drag hint */}
        <p className="text-[10px] text-white/25 text-center">
          Click any empty slot to upload · Drag &amp; drop multiple files onto the grid to bulk fill
        </p>
      </div>

      {/* 25-slot grid */}
      <div
        ref={containerRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-3xl border backdrop-blur-xl p-5 transition-colors ${
          isDraggingOver
            ? "border-violet-400/50 bg-violet-400/5 shadow-[0_0_30px_rgba(167,139,250,0.15)]"
            : "border-white/10 bg-white/5"
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2">
            <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            <span className="text-xs text-white/30">Loading…</span>
          </div>
        ) : (
          <>
            {isDraggingOver && (
              <div className="mb-4 flex items-center justify-center gap-2">
                <span className="text-violet-300/70 text-sm font-semibold">
                  Drop to fill {Math.min(slots.filter((s) => s.kind === "empty").length, MAX_SLOTS - filledCount)} available slot{slots.filter((s) => s.kind === "empty").length !== 1 ? "s" : ""}
                </span>
              </div>
            )}

            <AnimatePresence mode="popLayout">
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
              >
                {slots.map((slot, idx) => (
                  <Slot
                    key={idx}
                    slot={slot}
                    index={idx}
                    onFileSelected={handleFileSelected}
                    onDelete={handleDelete}
                    onTitleChange={handleTitleChange}
                    isDragOver={isDraggingOver && slot.kind === "empty"}
                  />
                ))}
              </div>
            </AnimatePresence>

            {/* Upload in progress indicator */}
            {uploadCount > 0 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="w-3 h-3 border-2 border-violet-400/40 border-t-violet-400 rounded-full animate-spin" />
                <span className="text-[11px] text-violet-300/70">
                  Uploading {uploadCount} file{uploadCount !== 1 ? "s" : ""}…
                </span>
              </div>
            )}

            {filledCount >= MAX_SLOTS && (
              <p className="mt-4 text-center text-[10px] text-red-400/70">
                All {MAX_SLOTS} slots are filled. Remove an image to add another.
              </p>
            )}
          </>
        )}
      </div>

      {/* Instructions */}
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 space-y-2">
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-widest">Tips</p>
        <ul className="space-y-1.5 text-[10px] text-white/30 leading-relaxed">
          <li>• Square images work best — non-square images will be cropped to 1:1 by the AI video pipeline</li>
          <li>• JPG, PNG, WebP accepted · Max {fmtSize(MAX_FILE_SIZE)} per file</li>
          <li>• Drag multiple files at once to bulk fill empty slots in order</li>
          <li>• Labels are optional but help identify characters in the scene library</li>
          <li>• Deleting an image compacts remaining images to the front of the grid</li>
          <li>• These images appear in the PaMs Studio alongside NFT scenes and can generate video content</li>
        </ul>
      </div>
    </div>
  );
}
