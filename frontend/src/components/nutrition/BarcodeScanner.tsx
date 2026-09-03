import { useEffect, useRef, useState } from "react";
import { Camera, ScanLine, CameraOff, Aperture } from "lucide-react";
import {
  startBarcodeScanner,
  isBarcodeScanningSupported,
  type ScannerStatus,
  type ScannerHandle,
} from "../../lib/barcode";

/**
 * BarcodeScanner — camera viewfinder with two modes:
 *  - scan: browser-native BarcodeDetector (no paid SDK), stops on first hit
 *  - photo: a shutter that grabs a still frame → `onPhoto(dataUrl)` (used to
 *    eyeball a nutrition label while filling in a manual food; not uploaded)
 *
 * When the API / camera is unavailable it says so clearly; the parent always
 * offers manual entry, so this is never a dead end.
 */
export function BarcodeScanner({
  onDetected,
  onPhoto,
}: {
  onDetected: (code: string) => void;
  onPhoto?: (dataUrl: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handleRef = useRef<ScannerHandle | null>(null);
  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [mode, setMode] = useState<"off" | "scan" | "photo">("off");
  const scanSupported = isBarcodeScanningSupported();
  const cameraSupported =
    typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

  // scan mode → drive the detector
  useEffect(() => {
    if (mode !== "scan" || !videoRef.current) return;
    let cancelled = false;
    startBarcodeScanner(
      videoRef.current,
      (code) => {
        if (!cancelled) {
          setMode("off");
          onDetected(code);
        }
      },
      (s) => !cancelled && setStatus(s),
    ).then((h) => {
      if (cancelled) h.stop();
      else handleRef.current = h;
    });
    return () => {
      cancelled = true;
      handleRef.current?.stop();
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // photo mode → just open a plain camera stream
  useEffect(() => {
    if (mode !== "photo" || !cameraSupported) return;
    let cancelled = false;
    setStatus("starting");
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then(async (stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setStatus("scanning");
      })
      .catch((e) => {
        const name = (e as DOMException)?.name;
        setStatus(name === "NotAllowedError" ? "permission-denied" : name === "NotFoundError" ? "no-camera" : "error");
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [mode, cameraSupported]);

  const capture = () => {
    const v = videoRef.current;
    if (!v || !onPhoto) return;
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 640 / (v.videoWidth || 640));
    canvas.width = (v.videoWidth || 640) * scale;
    canvas.height = (v.videoHeight || 480) * scale;
    canvas.getContext("2d")?.drawImage(v, 0, 0, canvas.width, canvas.height);
    setMode("off");
    onPhoto(canvas.toDataURL("image/jpeg", 0.7));
  };

  if (!cameraSupported) {
    return (
      <div className="surface-recessed flex items-center gap-3 rounded-[var(--radius-large)] p-4">
        <CameraOff size={18} strokeWidth={1.75} className="shrink-0 text-content-tertiary" />
        <p className="text-[0.82rem] leading-relaxed text-content-secondary">
          no camera here. type the barcode number below, or search by name.
        </p>
      </div>
    );
  }

  const message: Partial<Record<ScannerStatus, string>> = {
    starting: "starting camera…",
    scanning: mode === "photo" ? "frame the label, then tap the shutter" : "point at the barcode",
    detected: "got it",
    "permission-denied": "camera permission denied — allow it in your browser, or type the number",
    "no-camera": "no camera found on this device",
    error: "couldn't start the camera",
    unsupported: "this browser can't scan barcodes — use a photo or type the number",
  };
  const active = mode !== "off";

  return (
    <div>
      <div className="on-swatch relative aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-large)] bg-black/40">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline aria-label="Camera view" />

        {!active && (
          <div className="absolute inset-0 grid place-items-center gap-3">
            <div className="flex flex-col items-center gap-3">
              <Camera size={26} strokeWidth={1.5} className="text-content-secondary" />
              <div className="flex gap-2">
                {scanSupported && (
                  <button
                    onClick={() => {
                      setStatus("starting");
                      setMode("scan");
                    }}
                    className="focus-ring tactile rounded-pill bg-white/[0.12] px-3.5 py-2 text-[0.8rem] lowercase text-content-primary hover:bg-white/[0.2]"
                  >
                    scan barcode
                  </button>
                )}
                {onPhoto && (
                  <button
                    onClick={() => {
                      setStatus("starting");
                      setMode("photo");
                    }}
                    className="focus-ring tactile rounded-pill bg-white/[0.12] px-3.5 py-2 text-[0.8rem] lowercase text-content-primary hover:bg-white/[0.2]"
                  >
                    take a photo
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {mode === "scan" && (
          <>
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="h-24 w-56 rounded-xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
            <ScanLine size={18} className="pointer-events-none absolute left-3 top-3 text-white/80" />
          </>
        )}

        {mode === "photo" && (
          <button
            onClick={capture}
            aria-label="Take photo"
            className="focus-ring absolute bottom-3 left-1/2 grid h-14 w-14 -translate-x-1/2 place-items-center rounded-full bg-white/90 text-black shadow-lg hover:bg-white"
          >
            <Aperture size={22} strokeWidth={2} />
          </button>
        )}
      </div>

      {active && (
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[0.8rem] text-content-tertiary">{message[status] ?? "…"}</p>
          <button
            onClick={() => setMode("off")}
            className="focus-ring text-[0.8rem] lowercase text-content-tertiary hover:text-content-secondary"
          >
            stop
          </button>
        </div>
      )}
      {!active && status !== "idle" && status !== "starting" && message[status] && (
        <p className="mt-2 text-[0.8rem] text-[var(--accent-amber)]">{message[status]}</p>
      )}
    </div>
  );
}
