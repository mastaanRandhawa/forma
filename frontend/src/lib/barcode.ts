/**
 * barcode — thin wrapper around the browser-native BarcodeDetector API.
 *
 * No paid SDK: modern Chrome / Android WebView / Edge ship `BarcodeDetector`
 * for the grocery formats we need (UPC-A, UPC-E, EAN-8, EAN-13). Where it's
 * missing (Firefox, older Safari) `isBarcodeScanningSupported()` returns false
 * and the UI falls back to manual entry / search / custom food — the scanner is
 * never a dead end.
 */

const FORMATS = ["upc_a", "upc_e", "ean_8", "ean_13"] as const;

interface DetectedBarcode {
  rawValue: string;
  format: string;
}
interface BarcodeDetectorInstance {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
interface BarcodeDetectorCtor {
  new (opts?: { formats?: readonly string[] }): BarcodeDetectorInstance;
  getSupportedFormats?: () => Promise<string[]>;
}

const getCtor = (): BarcodeDetectorCtor | null =>
  (globalThis as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector ?? null;

export const isBarcodeScanningSupported = (): boolean =>
  typeof navigator !== "undefined" &&
  !!navigator.mediaDevices?.getUserMedia &&
  getCtor() !== null;

export type ScannerStatus =
  | "idle"
  | "starting"
  | "scanning"
  | "detected"
  | "permission-denied"
  | "no-camera"
  | "unsupported"
  | "error";

export interface ScannerHandle {
  stop: () => void;
}

/**
 * Open the camera, scan continuously, call `onResult` exactly once with the
 * first stable barcode, then stop. `onStatus` drives the UI (framing, hints,
 * error copy). Debounces duplicate detector callbacks.
 */
export async function startBarcodeScanner(
  video: HTMLVideoElement,
  onResult: (code: string) => void,
  onStatus: (status: ScannerStatus, detail?: string) => void,
): Promise<ScannerHandle> {
  const Ctor = getCtor();
  if (!Ctor || !navigator.mediaDevices?.getUserMedia) {
    onStatus("unsupported");
    return { stop: () => {} };
  }

  onStatus("starting");
  let stream: MediaStream | null = null;
  let raf = 0;
  let stopped = false;
  let done = false;

  const stop = () => {
    stopped = true;
    cancelAnimationFrame(raf);
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
  };

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
  } catch (e) {
    const name = (e as DOMException)?.name;
    if (name === "NotAllowedError" || name === "SecurityError") onStatus("permission-denied");
    else if (name === "NotFoundError" || name === "OverconstrainedError") onStatus("no-camera");
    else onStatus("error", (e as Error).message);
    return { stop };
  }

  if (stopped) {
    stop();
    return { stop };
  }

  video.srcObject = stream;
  video.setAttribute("playsinline", "true");
  await video.play().catch(() => {});

  const detector = new Ctor({ formats: FORMATS });
  onStatus("scanning");

  let hitCount = 0;
  let lastCode = "";

  const tick = async () => {
    if (stopped || done) return;
    try {
      const codes = await detector.detect(video);
      const code = codes[0]?.rawValue?.replace(/\D/g, "") ?? "";
      if (code && code.length >= 8) {
        if (code === lastCode) hitCount += 1;
        else {
          lastCode = code;
          hitCount = 1;
        }
        // require two consecutive frames agreeing to avoid a misread
        if (hitCount >= 2) {
          done = true;
          onStatus("detected", code);
          if (navigator.vibrate) navigator.vibrate(60);
          stop();
          onResult(code);
          return;
        }
      }
    } catch {
      /* transient detect failure — keep scanning */
    }
    raf = requestAnimationFrame(() => void tick());
  };
  raf = requestAnimationFrame(() => void tick());

  return { stop };
}
