import { useEffect, useRef, useState } from "react";
import { Camera, ScanLine, CameraOff } from "lucide-react";
import {
  startBarcodeScanner,
  isBarcodeScanningSupported,
  type ScannerStatus,
  type ScannerHandle,
} from "../../lib/barcode";

/**
 * BarcodeScanner — camera viewfinder with a scan frame. Uses the browser-native
 * BarcodeDetector (no paid SDK). When unsupported or the camera is denied it
 * shows a clear message; the parent still offers manual entry / search / custom
 * food, so this is never a dead end.
 */
export function BarcodeScanner({ onDetected }: { onDetected: (code: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const handleRef = useRef<ScannerHandle | null>(null);
  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [active, setActive] = useState(false);
  const supported = isBarcodeScanningSupported();

  useEffect(() => {
    if (!active || !videoRef.current) return;
    let cancelled = false;
    startBarcodeScanner(
      videoRef.current,
      (code) => {
        if (!cancelled) {
          setActive(false);
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
  }, [active]);

  if (!supported) {
    return (
      <div className="surface-recessed flex items-center gap-3 rounded-[var(--radius-large)] p-4">
        <CameraOff size={18} strokeWidth={1.75} className="shrink-0 text-content-tertiary" />
        <p className="text-[0.82rem] leading-relaxed text-content-secondary">
          this browser can't scan barcodes. type the number below, or search by name.
        </p>
      </div>
    );
  }

  const message: Partial<Record<ScannerStatus, string>> = {
    starting: "starting camera…",
    scanning: "point at the barcode",
    detected: "got it",
    "permission-denied": "camera permission denied — allow it in your browser, or type the number",
    "no-camera": "no camera found on this device",
    error: "couldn't start the camera",
  };

  return (
    <div>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[var(--radius-large)] bg-black/40">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          muted
          playsInline
          aria-label="Barcode camera view"
        />
        {!active && (
          <button
            onClick={() => {
              setStatus("starting");
              setActive(true);
            }}
            className="focus-ring tactile absolute inset-0 grid place-items-center text-content-secondary"
          >
            <span className="flex flex-col items-center gap-2">
              <Camera size={26} strokeWidth={1.5} />
              <span className="text-[0.85rem] lowercase">tap to scan a barcode</span>
            </span>
          </button>
        )}
        {active && (
          <>
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="h-24 w-56 rounded-xl border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
            <ScanLine
              size={18}
              className="pointer-events-none absolute left-3 top-3 text-white/80"
            />
          </>
        )}
      </div>
      {active && (
        <div className="mt-2 flex items-center justify-between">
          <p className="text-[0.8rem] text-content-tertiary">{message[status] ?? "scanning…"}</p>
          <button
            onClick={() => setActive(false)}
            className="focus-ring text-[0.8rem] lowercase text-content-tertiary hover:text-content-secondary"
          >
            stop
          </button>
        </div>
      )}
      {!active && status in message && status !== "starting" && (
        <p className="mt-2 text-[0.8rem] text-[var(--accent-amber)]">{message[status]}</p>
      )}
    </div>
  );
}
