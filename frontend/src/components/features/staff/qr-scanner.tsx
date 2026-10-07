"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { inputClass, primaryButtonClass, secondaryButtonClass } from "@/csmju";
import { FormField } from "@/components/shared/form-field";
import { PhotoCameraIcon, QrCodeIcon } from "@/components/shared/shop-icons";
import { Alert } from "@/components/shared/states";
import { focusRing } from "./orders-ui";

/**
 * สแกน QR ด้วยกล้องของเครื่อง
 *
 * วิธีทำงาน: เปิดกล้องด้วย getUserMedia → อ่านภาพจาก <video> ประมาณ 8 ครั้งต่อวินาที
 * - เบราว์เซอร์ที่มี BarcodeDetector (Chrome/Edge/Android) ใช้ตัวถอดรหัสของเครื่องเลย เร็วและไม่กินซีพียู
 * - ไม่มี → วาดภาพลง <canvas> ที่ซ่อนไว้แล้วส่ง pixel เข้า jsQR (src/lib/vendor/jsqr.js โหลดตอนกดเปิดกล้องครั้งแรก)
 * ถอดได้เมื่อไหร่ก็ปิดกล้องแล้วเรียก onDetect ทันที
 *
 * ข้อจำกัดของเบราว์เซอร์: กล้องเปิดได้เฉพาะหน้าเว็บที่เป็น secure context (https:// หรือ http://localhost)
 */

type Status = "idle" | "starting" | "scanning" | "error";
type Decode = (video: HTMLVideoElement, canvas: HTMLCanvasElement) => Promise<string | null>;

type JsQr = (
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options?: { inversionAttempts?: "dontInvert" | "onlyInvert" | "attemptBoth" | "invertFirst" },
) => { data: string } | null;

interface NativeBarcodeDetector {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
interface NativeBarcodeDetectorCtor {
  new (options?: { formats: string[] }): NativeBarcodeDetector;
  getSupportedFormats?: () => Promise<string[]>;
}

const SCAN_INTERVAL_MS = 120;

async function loadDecoder(): Promise<Decode> {
  const Native = (window as unknown as { BarcodeDetector?: NativeBarcodeDetectorCtor }).BarcodeDetector;
  if (Native) {
    try {
      const formats = (await Native.getSupportedFormats?.()) ?? ["qr_code"];
      if (formats.includes("qr_code")) {
        const detector = new Native({ formats: ["qr_code"] });
        return async (video) => {
          const codes = await detector.detect(video);
          return codes[0]?.rawValue ?? null;
        };
      }
    } catch {
      // ใช้ jsQR แทน
    }
  }

  // โหลดตัวถอดรหัสครั้งเดียวตอนกดเปิดกล้อง — ไม่ติดไปกับ bundle แรกของหน้า
  const mod: unknown = await import("@/lib/vendor/jsqr.js");
  const jsQR = (typeof mod === "function" ? mod : (mod as { default?: unknown }).default) as JsQr;
  return async (video, canvas) => {
    // ย่อภาพก่อนถอดรหัส — เร็วขึ้นมากและยังอ่าน QR ได้สบาย
    const scale = Math.min(1, 640 / (video.videoWidth || 640));
    const w = Math.round(video.videoWidth * scale);
    const h = Math.round(video.videoHeight * scale);
    if (!w || !h) return null;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, w, h);
    const image = ctx.getImageData(0, 0, w, h);
    return jsQR(image.data, w, h, { inversionAttempts: "dontInvert" })?.data ?? null;
  };
}

function messageFor(error: unknown): string {
  const name = error instanceof DOMException || error instanceof Error ? error.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "เบราว์เซอร์ไม่อนุญาตให้ใช้กล้อง กดไอคอนกล้องบนแถบที่อยู่แล้วเลือก “อนุญาต” จากนั้นลองอีกครั้ง";
    case "NotFoundError":
    case "OverconstrainedError":
      return "ไม่พบกล้องบนเครื่องนี้ ต่อกล้องหรือพิมพ์รหัสรับสินค้าด้านล่างแทนได้";
    case "NotReadableError":
      return "เปิดกล้องไม่ได้ เพราะอาจมีโปรแกรมอื่นใช้กล้องอยู่ ปิดโปรแกรมนั้นแล้วลองอีกครั้ง";
    default:
      return "เปิดกล้องไม่สำเร็จ กรุณาลองอีกครั้ง หรือพิมพ์รหัสรับสินค้าด้านล่างแทน";
  }
}

export function QrScanner({ onDetect, disabled = false }: { onDetect: (text: string) => void; disabled?: boolean }) {
  const id = useId();
  const cameraSelectId = `${id}-camera`;
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef(0);
  const lastScanRef = useRef(0);
  const decodingRef = useRef(false);
  const decodeRef = useRef<Decode | null>(null);
  const onDetectRef = useRef(onDetect);

  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [cameraId, setCameraId] = useState("");

  useEffect(() => {
    onDetectRef.current = onDetect;
  }, [onDetect]);

  /** หยุดลูปและปิดกล้อง (ไม่แตะ state) — เรียกซ้ำได้ */
  const release = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const stop = useCallback(() => {
    release();
    setStatus("idle");
  }, [release]);

  // ปิดกล้องเมื่อออกจากหน้า ไม่งั้นไฟกล้องจะค้าง
  useEffect(() => release, [release]);

  const tick = useCallback(
    function frame() {
      rafRef.current = requestAnimationFrame(frame);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const decode = decodeRef.current;
      if (!video || !canvas || !decode || video.readyState < 2 || decodingRef.current) return;

      const now = performance.now();
      if (now - lastScanRef.current < SCAN_INTERVAL_MS) return;
      lastScanRef.current = now;

      decodingRef.current = true;
      decode(video, canvas)
        .then((text) => {
          const value = text?.trim();
          if (!value || !streamRef.current) return;
          stop();
          onDetectRef.current(value);
        })
        .catch(() => undefined)
        .finally(() => {
          decodingRef.current = false;
        });
    },
    [stop],
  );

  const start = useCallback(
    async (deviceId?: string) => {
      release();
      setError(null);
      setStatus("starting");

      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError(
          "หน้านี้เปิดกล้องไม่ได้เพราะไม่ใช่การเชื่อมต่อที่ปลอดภัย เบราว์เซอร์อนุญาตให้ใช้กล้องเฉพาะ https:// หรือ http://localhost กรุณาพิมพ์รหัสรับสินค้าด้านล่างแทน",
        );
        setStatus("error");
        return;
      }

      try {
        if (!decodeRef.current) decodeRef.current = await loadDecoder();

        const stream = await navigator.mediaDevices.getUserMedia(
          deviceId
            ? { video: { deviceId: { exact: deviceId } }, audio: false }
            : { video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } }, audio: false },
        );
        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) {
          release();
          setStatus("idle");
          return;
        }
        video.srcObject = stream;
        setStatus("scanning");
        // บางเบราว์เซอร์ไม่ resolve play() จนกว่า <video> จะแสดง จึงไม่ await
        video.play().catch(() => undefined);

        // ชื่อกล้องอ่านได้หลังผู้ใช้กดอนุญาตแล้วเท่านั้น
        navigator.mediaDevices
          .enumerateDevices()
          .then((devices) => setCameras(devices.filter((d) => d.kind === "videoinput")))
          .catch(() => setCameras([]));
        setCameraId(stream.getVideoTracks()[0]?.getSettings().deviceId ?? deviceId ?? "");

        lastScanRef.current = 0;
        tick();
      } catch (e) {
        release();
        setError(messageFor(e));
        setStatus("error");
      }
    },
    [release, tick],
  );

  const scanning = status === "scanning";
  const starting = status === "starting";

  return (
    <div className="space-y-4">
      <div className="relative grid aspect-4/3 place-items-center overflow-hidden rounded-xl bg-brand-navy p-6">
        <video
          ref={videoRef}
          muted
          playsInline
          aria-label="ภาพจากกล้องสำหรับสแกน QR"
          className={`absolute inset-0 h-full w-full object-cover ${scanning ? "" : "hidden"}`}
        />
        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

        {/* กรอบเล็งสี่มุม */}
        <div className="relative grid h-full w-full place-items-center">
          <span aria-hidden="true" className="absolute left-0 top-0 h-10 w-10 rounded-tl-lg border-l-4 border-t-4 border-accent" />
          <span aria-hidden="true" className="absolute right-0 top-0 h-10 w-10 rounded-tr-lg border-r-4 border-t-4 border-accent" />
          <span aria-hidden="true" className="absolute bottom-0 left-0 h-10 w-10 rounded-bl-lg border-b-4 border-l-4 border-accent" />
          <span aria-hidden="true" className="absolute bottom-0 right-0 h-10 w-10 rounded-br-lg border-b-4 border-r-4 border-accent" />

          {scanning ? (
            <>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-6 top-1/2 h-0.5 animate-pulse bg-accent motion-reduce:animate-none"
              />
              <span role="status" className="absolute bottom-3 rounded-full bg-brand-navy/80 px-3 py-1 text-label-md text-white">
                ยกบัตรรับสินค้าให้ QR อยู่ในกรอบ
              </span>
            </>
          ) : (
            <div className="relative text-center">
              <QrCodeIcon className="mx-auto h-10 w-10 text-primary-fixed" />
              <button
                type="button"
                onClick={() => start()}
                disabled={disabled}
                aria-busy={starting}
                className={`${primaryButtonClass} relative mx-auto mt-4 ${focusRing} disabled:cursor-not-allowed disabled:opacity-40 ${
                  starting ? "btn-loading" : ""
                }`}
              >
                <span className="btn-text flex items-center gap-2">
                  <PhotoCameraIcon className="h-4 w-4" />
                  {status === "error" ? "ลองเปิดกล้องอีกครั้ง" : "เปิดกล้องสแกน QR"}
                </span>
                <span className="dots" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
              </button>
              <p className="mt-3 text-body-md text-primary-fixed">หรือพิมพ์รหัสรับสินค้าด้านล่าง</p>
            </div>
          )}
        </div>
      </div>

      {error && <Alert tone="warning">{error}</Alert>}

      {scanning && (
        <div className="flex flex-col gap-4 md:flex-row md:items-end">
          {cameras.length > 1 && (
            <div className="min-w-0 flex-1">
              <FormField id={cameraSelectId} label="เลือกกล้อง">
                <select
                  id={cameraSelectId}
                  value={cameraId}
                  onChange={(e) => start(e.target.value)}
                  className={inputClass}
                >
                  {cameras.map((c, i) => (
                    <option key={c.deviceId || i} value={c.deviceId}>
                      {c.label || `กล้องที่ ${i + 1}`}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
          )}
          <div className="flex justify-end md:ml-auto">
            <button type="button" onClick={stop} className={`${secondaryButtonClass} ${focusRing}`}>
              ปิดกล้อง
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
