import { isTauri, invoke } from "@tauri-apps/api/core";

// ── Theme ────────────────────────────────────────────────────────
// Apply saved theme immediately (before first paint) to avoid FOUC.
// Light is the default; only set an attribute when dark is requested.
(function applyStoredTheme() {
  const saved = localStorage.getItem("theme");
  if (saved === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  }
  // No saved preference → leave attribute unset → light theme via :root
})();

function getTheme(): "dark" | "light" {
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

function setTheme(theme: "dark" | "light"): void {
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  } else {
    document.documentElement.removeAttribute("data-theme");
  }
  localStorage.setItem("theme", theme);
}

const themeToggle = document.getElementById(
  "theme-toggle",
) as HTMLButtonElement;
themeToggle.addEventListener("click", () => {
  setTheme(getTheme() === "dark" ? "light" : "dark");
});

// ── Platform detection ───────────────────────────────────────────
/** True when running inside a Tauri Android app. */
function isAndroid(): boolean {
  return isTauri() && navigator.userAgent.toLowerCase().includes("android");
}

// ── Data helpers ─────────────────────────────────────────────────

/** Strip the `data:image/jpeg;base64,` prefix and return only the base-64 payload. */
function dataUrlToBase64(dataUrl: string): string {
  return dataUrl.split(",")[1];
}

/** Convert a base-64 string to a Uint8Array of raw bytes (used for the fs plugin). */
function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// ── Unified save entry-point ─────────────────────────────────────

/**
 * Three-way save strategy:
 *
 * 1. **Android** — calls the `save_to_gallery` Tauri command backed by a
 *    Kotlin plugin that uses `MediaStore`. No `WRITE_EXTERNAL_STORAGE`
 *    permission is required on API 29+.
 *    `data` is sent as a plain `number[]` (raw JPEG bytes) so the Kotlin
 *    side receives a `ByteArray` directly — no base-64 decode needed.
 *
 * 2. **Desktop Tauri** (macOS / Linux / Windows) — uses `@tauri-apps/plugin-fs`
 *    to write directly into `Pictures/VideoCaptures/`.
 *
 * 3. **Browser** — falls back to the classic `<a download>` trick.
 */
async function saveFrame(
  dataUrl: string,
  fileName: string,
  ts: string,
): Promise<void> {
  if (isAndroid()) {
    // ── Android: MediaStore via gallery-plugin ───────────────────
    // Convert to a plain number[] so Tauri IPC serialises it as a
    // JSON byte array — the Kotlin plugin reads it as ByteArray directly.
    await invoke("plugin:ext|save-to-gallery", {
      fileName,
      bytes: Array.from(base64ToBytes(dataUrlToBase64(dataUrl))),
    });
  } else if (isTauri()) {
    // ── Desktop Tauri: write to Pictures/VideoCaptures/ ──────────
    const { writeFile, BaseDirectory, exists, mkdir } =
      await import("@tauri-apps/plugin-fs");
    const dir = "VideoCaptures";
    if (!(await exists(dir, { baseDir: BaseDirectory.Picture }))) {
      await mkdir(dir, { baseDir: BaseDirectory.Picture, recursive: true });
    }
    await writeFile(
      `${dir}/${fileName}`,
      base64ToBytes(dataUrlToBase64(dataUrl)),
      {
        baseDir: BaseDirectory.Picture,
      },
    );

    showToast(
      isTauri()
        ? `Saved to Pictures/VideoCaptures — ${ts}`
        : `Frame saved — ${ts}`,
      "success",
    );
  } else {
    // ── Browser: anchor download ─────────────────────────────────
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = fileName;
    a.click();
  }
}

// ── Element refs ────────────────────────────────────────────────
const dropZone = document.getElementById("drop-zone") as HTMLElement;
const fileInput = document.getElementById("file-input") as HTMLInputElement;
const uploadSection = document.getElementById("upload-section") as HTMLElement;
const playerSection = document.getElementById("player-section") as HTMLElement;
const video = document.getElementById("video") as HTMLVideoElement;
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const seekBar = document.getElementById("seek-bar") as HTMLInputElement;
const currentTimeEl = document.getElementById("current-time") as HTMLElement;
const durationLabel = document.getElementById("duration-label") as HTMLElement;
const playBtn = document.getElementById("play-btn") as HTMLButtonElement;
const playIcon = document.getElementById("play-icon") as HTMLElement;
const pauseIcon = document.getElementById("pause-icon") as HTMLElement;
const prevFrameBtn = document.getElementById(
  "prev-frame-btn",
) as HTMLButtonElement;
const nextFrameBtn = document.getElementById(
  "next-frame-btn",
) as HTMLButtonElement;
const downloadBtn = document.getElementById(
  "download-btn",
) as HTMLButtonElement;
const changeBtn = document.getElementById("change-btn") as HTMLButtonElement;
const filenameLabel = document.getElementById("filename-label") as HTMLElement;
const currentFrameInfo = document.getElementById(
  "current-frame-info",
) as HTMLElement;
const videoOverlay = document.getElementById("video-overlay") as HTMLElement;
const overlayText = document.getElementById("overlay-text") as HTMLElement;
const previewBtn = document.getElementById("preview-btn") as HTMLButtonElement;
const previewModal = document.getElementById("preview-modal") as HTMLElement;
const previewImg = document.getElementById("preview-img") as HTMLImageElement;
const previewStage = document.getElementById("preview-stage") as HTMLElement;
const previewTimestamp = document.getElementById(
  "preview-timestamp",
) as HTMLElement;
const previewResolution = document.getElementById(
  "preview-resolution",
) as HTMLElement;
const previewCloseBtn = document.getElementById(
  "preview-close-btn",
) as HTMLButtonElement;
const previewDownloadBtn = document.getElementById(
  "preview-download-btn",
) as HTMLButtonElement;
const zoomInBtn = document.getElementById("zoom-in-btn") as HTMLButtonElement;
const zoomOutBtn = document.getElementById("zoom-out-btn") as HTMLButtonElement;
const zoomFitBtn = document.getElementById("zoom-fit-btn") as HTMLButtonElement;
const zoomActualBtn = document.getElementById(
  "zoom-actual-btn",
) as HTMLButtonElement;
const zoomLabel = document.getElementById("zoom-label") as HTMLElement;

// ── State ────────────────────────────────────────────────────────
let toastTimer: ReturnType<typeof setTimeout> | null = null;
let overlayTimer: ReturnType<typeof setTimeout> | null = null;

// Preview state
let previewDataUrl: string | null = null;
let previewCurrentTime = 0;
let previewScale = 1;
let previewOffsetX = 0;
let previewOffsetY = 0;
let isDragging = false;
let dragStartX = 0;
let dragStartY = 0;
let dragOriginX = 0;
let dragOriginY = 0;

const ZOOM_STEP = 0.15;
const ZOOM_MIN = 0.05;
const ZOOM_MAX = 16;

// ── Toast ────────────────────────────────────────────────────────
const toast = document.createElement("div");
toast.id = "toast";
document.body.appendChild(toast);

function showToast(msg: string, type = "", duration = 2200): void {
  toast.textContent = msg;
  toast.className = "show" + (type ? " " + type : "");
  clearTimeout(toastTimer ?? undefined);
  toastTimer = setTimeout(() => {
    toast.className = "";
  }, duration);
}

// ── Overlay flash ────────────────────────────────────────────────
function flashOverlay(msg: string): void {
  overlayText.textContent = msg;
  videoOverlay.hidden = false;
  clearTimeout(overlayTimer ?? undefined);
  overlayTimer = setTimeout(() => {
    videoOverlay.hidden = true;
  }, 900);
}

// ── Time formatting ──────────────────────────────────────────────
function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return "0:00.000";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${m}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

// ── Update UI to current video time ─────────────────────────────
function updateTimeUI(): void {
  const t = video.currentTime;
  const d = video.duration || 0;

  currentTimeEl.textContent = formatTime(t);

  if (d > 0) {
    seekBar.value = String((t / d) * 1000);
  }

  currentFrameInfo.textContent = `${formatTime(t)}  /  ${formatTime(d)}`;
}

// ── Video event handlers ─────────────────────────────────────────
video.addEventListener("loadedmetadata", () => {
  durationLabel.textContent = formatTime(video.duration);
  seekBar.max = "1000";
  seekBar.value = "0";
  updateTimeUI();
});

video.addEventListener("timeupdate", updateTimeUI);

function setPlayIcon(isPlaying: boolean): void {
  if (isPlaying) {
    playIcon.setAttribute("hidden", "");
    pauseIcon.removeAttribute("hidden");
  } else {
    playIcon.removeAttribute("hidden");
    pauseIcon.setAttribute("hidden", "");
  }
}

video.addEventListener("play", () => setPlayIcon(true));
video.addEventListener("pause", () => setPlayIcon(false));
video.addEventListener("ended", () => setPlayIcon(false));

// ── Seek bar ─────────────────────────────────────────────────────
seekBar.addEventListener("input", () => {
  const t = (Number(seekBar.value) / 1000) * (video.duration || 0);
  video.currentTime = t;
  updateTimeUI();
});

// ── Play / Pause ─────────────────────────────────────────────────
playBtn.addEventListener("click", togglePlay);

function togglePlay(): void {
  if (video.paused || video.ended) {
    void video.play();
  } else {
    video.pause();
  }
}

// ── Frame stepping (fixed 1/30s step) ───────────────────────────
const FRAME_STEP = 1 / 30;

function stepFrame(direction: -1 | 1): void {
  video.pause();
  const next = video.currentTime + direction * FRAME_STEP;
  video.currentTime = Math.max(0, Math.min(next, video.duration));
}

prevFrameBtn.addEventListener("click", () => stepFrame(-1));
nextFrameBtn.addEventListener("click", () => stepFrame(+1));

// ── Keyboard shortcuts ───────────────────────────────────────────
document.addEventListener("keydown", (e: KeyboardEvent) => {
  if (playerSection.hidden) return;

  // Preview modal shortcuts
  if (!previewModal.hidden) {
    switch (e.key) {
      case "Escape":
        closePreview();
        break;
      case "+":
      case "=":
        zoomByStep(+ZOOM_STEP * 2);
        break;
      case "-":
        zoomByStep(-ZOOM_STEP * 2);
        break;
      case "0":
        fitToScreen();
        break;
      case "1":
        zoomActualBtn.click();
        break;
    }
    return;
  }

  switch (e.key) {
    case " ":
      e.preventDefault();
      togglePlay();
      break;
    case "ArrowLeft":
      e.preventDefault();
      stepFrame(-1);
      break;
    case "ArrowRight":
      e.preventDefault();
      stepFrame(+1);
      break;
    case "p":
    case "P":
      openPreview();
      break;
    case "Enter":
      e.preventDefault();
      downloadFrame();
      break;
  }
});

// ── Capture frame to canvas → dataUrl ───────────────────────────
interface CaptureResult {
  dataUrl: string;
  w: number;
  h: number;
}

function captureCurrentFrame(): CaptureResult | null {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) return null;
  canvas.width = w;
  canvas.height = h;
  (canvas.getContext("2d") as CanvasRenderingContext2D).drawImage(
    video,
    0,
    0,
    w,
    h,
  );
  return { dataUrl: canvas.toDataURL("image/jpeg", 0.95), w, h };
}

// ── Preview frame ────────────────────────────────────────────────
previewBtn.addEventListener("click", openPreview);

function openPreview(): void {
  const result = captureCurrentFrame();
  if (!result) {
    showToast("Video not ready yet", "error");
    return;
  }
  previewDataUrl = result.dataUrl;
  previewCurrentTime = video.currentTime;

  previewTimestamp.textContent = formatTime(previewCurrentTime);
  previewResolution.textContent = `${result.w} × ${result.h}`;

  previewModal.hidden = false;
  document.body.style.overflow = "hidden";

  // Set src after modal is visible so the stage has real dimensions.
  // Use a rAF → rAF double-pump to ensure layout is complete (critical on iOS
  // where the first frame after hidden=false still has zero clientHeight).
  previewImg.src = previewDataUrl;
  previewImg.onload = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => fitToScreen());
    });
  };
  // If the image was already cached the onload won't re-fire — call directly.
  if (previewImg.complete && previewImg.naturalWidth) {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => fitToScreen());
    });
  }
}

function closePreview(): void {
  previewModal.hidden = true;
  document.body.style.overflow = "";
  previewImg.src = "";
  previewDataUrl = null;
}

previewCloseBtn.addEventListener("click", closePreview);
(
  previewModal.querySelector(".preview-backdrop") as HTMLElement
).addEventListener("click", closePreview);

// ── Zoom helpers ─────────────────────────────────────────────────
// ── Transform model ──────────────────────────────────────────────
//
// The image is positioned with CSS  left/top = 50%  so its top-left corner
// starts at the stage centre. We then apply:
//
//   transform: translate(-50%, -50%) translate(offsetX, offsetY) scale(scale)
//
// with transform-origin: center center (the default).
//
// This means:
//   • scale(1) at offset(0,0)  →  image perfectly centred at natural size
//   • fitToScreen sets offsetX/Y to 0 and scale to fit — always centred
//   • zoomAround keeps the cursor-point fixed by adjusting offsets only
//
// offsetX / offsetY are *extra* pan beyond the CSS centering, in px.

function applyTransform(): void {
  previewImg.style.transform = `translate(-50%, -50%) translate(${previewOffsetX}px, ${previewOffsetY}px) scale(${previewScale})`;
  zoomLabel.textContent = Math.round(previewScale * 100) + "%";
}

function fitToScreen(_animate = true): void {
  const sw = previewStage.clientWidth;
  const sh = previewStage.clientHeight;
  const iw = previewImg.naturalWidth || previewImg.clientWidth;
  const ih = previewImg.naturalHeight || previewImg.clientHeight;
  if (!sw || !sh || !iw || !ih) return;

  // Scale to fill as much of the stage as possible without cropping,
  // but never upscale beyond 1× on first open.
  const scale = Math.min(sw / iw, sh / ih, 1);
  previewScale = scale;
  // With the CSS centering trick, zero offset = perfectly centred.
  previewOffsetX = 0;
  previewOffsetY = 0;
  applyTransform();
}

function zoomAround(newScale: number, clientX: number, clientY: number): void {
  newScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, newScale));
  const rect = previewStage.getBoundingClientRect();

  // Cursor position relative to the stage centre (where the image origin sits).
  const px = clientX - rect.left - rect.width / 2;
  const py = clientY - rect.top - rect.height / 2;

  // Shift the pan so the pixel under the cursor stays fixed.
  const ratio = newScale / previewScale;
  previewOffsetX = px - (px - previewOffsetX) * ratio;
  previewOffsetY = py - (py - previewOffsetY) * ratio;
  previewScale = newScale;
  applyTransform();
}

function zoomByStep(delta: number): void {
  // Zoom around the stage centre (offset 0,0 in cursor-space).
  const rect = previewStage.getBoundingClientRect();
  zoomAround(
    previewScale * (1 + delta),
    rect.left + rect.width / 2,
    rect.top + rect.height / 2,
  );
}

zoomInBtn.addEventListener("click", () => zoomByStep(+ZOOM_STEP * 2));
zoomOutBtn.addEventListener("click", () => zoomByStep(-ZOOM_STEP * 2));
zoomFitBtn.addEventListener("click", () => fitToScreen());
zoomActualBtn.addEventListener("click", () => {
  previewScale = 1;
  previewOffsetX = 0;
  previewOffsetY = 0;
  applyTransform();
});

// ── Scroll to zoom ───────────────────────────────────────────────
previewStage.addEventListener(
  "wheel",
  (e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP;
    zoomAround(previewScale * (1 + delta), e.clientX, e.clientY);
  },
  { passive: false },
);

// ── Drag to pan ──────────────────────────────────────────────────
previewStage.addEventListener("mousedown", (e: MouseEvent) => {
  if (e.button !== 0) return;
  isDragging = true;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragOriginX = previewOffsetX;
  dragOriginY = previewOffsetY;
  previewStage.classList.add("dragging");
});

window.addEventListener("mousemove", (e: MouseEvent) => {
  if (!isDragging) return;
  previewOffsetX = dragOriginX + (e.clientX - dragStartX);
  previewOffsetY = dragOriginY + (e.clientY - dragStartY);
  applyTransform();
});

window.addEventListener("mouseup", () => {
  if (!isDragging) return;
  isDragging = false;
  previewStage.classList.remove("dragging");
});

// ── Touch pan/pinch ──────────────────────────────────────────────
let lastTouchDist: number | null = null;
let lastTouchMidX = 0;
let lastTouchMidY = 0;

previewStage.addEventListener(
  "touchstart",
  (e: TouchEvent) => {
    if (e.touches.length === 1) {
      isDragging = true;
      dragStartX = e.touches[0].clientX;
      dragStartY = e.touches[0].clientY;
      dragOriginX = previewOffsetX;
      dragOriginY = previewOffsetY;
    } else if (e.touches.length === 2) {
      isDragging = false;
      lastTouchDist = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY,
      );
      lastTouchMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      lastTouchMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    }
  },
  { passive: true },
);

previewStage.addEventListener(
  "touchmove",
  (e: TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1 && isDragging) {
      previewOffsetX = dragOriginX + (e.touches[0].clientX - dragStartX);
      previewOffsetY = dragOriginY + (e.touches[0].clientY - dragStartY);
      applyTransform();
    } else if (e.touches.length === 2 && lastTouchDist !== null) {
      const dist = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY,
      );
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      const ratio = dist / lastTouchDist;
      zoomAround(previewScale * ratio, midX, midY);
      lastTouchDist = dist;
      lastTouchMidX = midX;
      lastTouchMidY = midY;
    }
  },
  { passive: false },
);

previewStage.addEventListener("touchend", () => {
  isDragging = false;
  lastTouchDist = null;
});

// ── Double-click to reset ────────────────────────────────────────
previewStage.addEventListener("dblclick", () => fitToScreen());

// ── Download from preview ────────────────────────────────────────
previewDownloadBtn.addEventListener("click", () => {
  if (!previewDataUrl) return;
  const filename = buildFilename(previewCurrentTime);
  const ts = formatTime(previewCurrentTime);
  saveFrame(previewDataUrl, filename, ts)
    .then(() => {
      console.log("Saved");
    })
    .catch((err: unknown) => {
      console.error("Save failed", err);
      showToast("Save failed — check permissions", "error");
    });
});

// ── Download frame ───────────────────────────────────────────────
downloadBtn.addEventListener("click", downloadFrame);

function downloadFrame(): void {
  const result = captureCurrentFrame();
  if (!result) {
    showToast("Video not ready yet", "error");
    return;
  }
  const time = video.currentTime;
  const filename = buildFilename(time);
  const ts = formatTime(time);
  saveFrame(result.dataUrl, filename, ts)
    .then(() => {
      flashOverlay(`Saved at ${ts}`);
    })
    .catch((err: unknown) => {
      console.error("Save failed", err);
      showToast("Save failed — check permissions", "error");
    });
}

function buildFilename(time: number): string {
  const base = filenameLabel.textContent?.replace(/\.[^.]+$/, "") || "video";
  const safe = base.replace(/[^\w\-]/g, "_");
  const t = formatTime(time).replace(/[:.]/g, "-");
  return `${safe}_${t}.jpg`;
}

// ── Change video ─────────────────────────────────────────────────
changeBtn.addEventListener("click", resetToUpload);

function resetToUpload(): void {
  video.pause();
  video.src = "";
  playerSection.hidden = true;
  uploadSection.hidden = false;
  fileInput.value = "";
}

// ── File loading ─────────────────────────────────────────────────
dropZone.addEventListener("click", () => fileInput.click());

dropZone.addEventListener("keydown", (e: KeyboardEvent) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fileInput.click();
  }
});

fileInput.addEventListener("change", () => {
  if (fileInput.files?.length) loadFile(fileInput.files[0]);
});

dropZone.addEventListener("dragover", (e: DragEvent) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

(["dragleave", "dragend"] as const).forEach((ev) =>
  dropZone.addEventListener(ev, () => dropZone.classList.remove("dragover")),
);

dropZone.addEventListener("drop", (e: DragEvent) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  const file = e.dataTransfer?.files[0];
  if (file && file.type.startsWith("video/")) {
    loadFile(file);
  } else {
    showToast("Please drop a video file", "error");
  }
});

function loadFile(file: File): void {
  const url = URL.createObjectURL(file);
  video.src = url;
  video.load();
  filenameLabel.textContent = file.name;

  uploadSection.hidden = true;
  playerSection.hidden = false;

  video.addEventListener("loadedmetadata", updateTimeUI, { once: true });
}

// lastTouchMidX / lastTouchMidY are written during pinch tracking; the
// void expressions below keep noUnusedLocals happy while preserving the
// variables for future debugging use.
void lastTouchMidX;
void lastTouchMidY;
