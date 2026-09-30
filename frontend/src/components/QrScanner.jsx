'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from './ui';
import { QrIcon } from './icons';

/**
 * สแกน QR ด้วยกล้องของเครื่อง
 *
 * วิธีทำงาน: เปิดกล้องด้วย getUserMedia → วาดภาพจาก <video> ลง <canvas> ที่ซ่อนไว้
 * → ส่ง pixel เข้า jsQR เพื่อถอดรหัส ทำซ้ำประมาณ 10 ครั้งต่อวินาที
 * ถอดได้เมื่อไหร่ก็ปิดกล้องแล้วเรียก onDetect ทันที
 *
 * ข้อจำกัดของเบราว์เซอร์: กล้องเปิดได้เฉพาะหน้าเว็บที่เป็น secure context
 * คือ https:// หรือ http://localhost เท่านั้น — เปิดผ่าน IP เครื่อง (เช่น http://192.168.x.x:4000)
 * เบราว์เซอร์จะไม่ยอมให้ใช้กล้องเลย จึงเช็กและบอกผู้ใช้ตรง ๆ
 */
export default function QrScanner({ onDetect, disabled = false }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const lastScanRef = useRef(0);
  const jsqrRef = useRef(null);
  const onDetectRef = useRef(onDetect);
  onDetectRef.current = onDetect;

  const [status, setStatus] = useState('idle'); // idle | starting | scanning | error
  const [error, setError] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [cameraId, setCameraId] = useState('');

  /** ปิดกล้องและหยุดลูปอ่านภาพ — เรียกซ้ำได้ไม่มีผลข้างเคียง */
  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStatus((s) => (s === 'error' ? s : 'idle'));
  }, []);

  /** ปิดกล้องให้เรียบร้อยเมื่อออกจากหน้า ไม่งั้นไฟกล้องจะค้างติด */
  useEffect(() => stop, [stop]);

  const messageFor = (err) => {
    switch (err?.name) {
      case 'NotAllowedError':
      case 'SecurityError':
        return 'เบราว์เซอร์ไม่อนุญาตให้ใช้กล้อง — กดไอคอนกล้องบนแถบที่อยู่ แล้วเลือก "อนุญาต" จากนั้นลองใหม่';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'ไม่พบกล้องบนเครื่องนี้ — ต่อกล้องหรือใช้วิธีพิมพ์รหัสด้านล่างแทนได้';
      case 'NotReadableError':
      case 'TrackStartError':
        return 'เปิดกล้องไม่ได้ อาจมีโปรแกรมอื่น (เช่น Zoom หรือ Teams) ใช้กล้องอยู่ — ปิดโปรแกรมนั้นแล้วลองใหม่';
      default:
        return err?.message || 'เปิดกล้องไม่สำเร็จ';
    }
  };

  const start = useCallback(
    async (deviceId) => {
      setError(null);
      setStatus('starting');

      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError(
          'หน้านี้เปิดกล้องไม่ได้เพราะไม่ใช่การเชื่อมต่อที่ปลอดภัย — ' +
            'เบราว์เซอร์ยอมให้ใช้กล้องเฉพาะ http://localhost หรือ https:// เท่านั้น ' +
            'ถ้าเปิดผ่าน IP ของเครื่องอยู่ ให้กลับไปใช้ http://localhost:4000 แทน',
        );
        setStatus('error');
        return;
      }

      try {
        // โหลดตัวถอดรหัสครั้งเดียวตอนกดเปิดกล้อง — ไม่ติดไปกับ bundle แรกของหน้า
        // ไฟล์อยู่ในโปรเจกต์เลย (lib/vendor/jsqr.js) จึงไม่ต้อง npm install อะไรเพิ่ม
        if (!jsqrRef.current) {
          const mod = await import('@/lib/vendor/jsqr.js');
          jsqrRef.current = mod.default ?? mod;
        }

        const constraints = deviceId
          ? { video: { deviceId: { exact: deviceId } } }
          : { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } } };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        const video = videoRef.current;
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');

        // สลับสถานะก่อนค่อยสั่งเล่น — ตอนนี้ยังซ่อน <video> อยู่ (display:none)
        // บางเบราว์เซอร์จะไม่ resolve play() ให้ถ้าวิดีโอยังไม่ถูกแสดง จึงห้าม await ตรงนี้
        setStatus('scanning');
        video.play().catch(() => {
          /* autoplay ถูกบล็อก — ลูปอ่านภาพยังทำงานได้จาก stream ตรง ๆ */
        });

        // ชื่อกล้องจะอ่านได้หลังผู้ใช้กดอนุญาตแล้วเท่านั้น จึงมาดึงตอนนี้
        navigator.mediaDevices
          .enumerateDevices()
          .then((devices) => setCameras(devices.filter((d) => d.kind === 'videoinput')))
          .catch(() => setCameras([]));
        setCameraId(stream.getVideoTracks()[0]?.getSettings?.().deviceId ?? deviceId ?? '');

        lastScanRef.current = 0;
        tick();
      } catch (err) {
        stop();
        setError(messageFor(err));
        setStatus('error');
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stop],
  );

  /** ลูปอ่านภาพ — ถอดรหัสทุก ~100ms ก็พอ ไม่ต้องทุกเฟรม จะได้ไม่กินซีพียู */
  const tick = useCallback(() => {
    rafRef.current = requestAnimationFrame(tick);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    const now = performance.now();
    if (now - lastScanRef.current < 100) return;
    lastScanRef.current = now;

    // ย่อภาพก่อนถอดรหัส — เร็วขึ้นมากและยังอ่าน QR ได้สบาย
    const scale = Math.min(1, 640 / (video.videoWidth || 640));
    const w = Math.round(video.videoWidth * scale);
    const h = Math.round(video.videoHeight * scale);
    if (!w || !h) return;

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(video, 0, 0, w, h);

    let image;
    try {
      image = ctx.getImageData(0, 0, w, h);
    } catch {
      return;
    }

    const hit = jsqrRef.current?.(image.data, w, h, { inversionAttempts: 'dontInvert' });
    if (!hit?.data) return;

    stop();
    setStatus('idle');
    onDetectRef.current?.(hit.data.trim());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stop]);

  const scanning = status === 'scanning';

  return (
    <div className="space-y-2">
      <div className="relative grid aspect-4/3 place-items-center overflow-hidden rounded-xl bg-navy-950 p-6">
        {/* วิดีโอจากกล้อง — ซ่อนไว้จนกว่าจะเริ่มสแกนจริง */}
        <video
          ref={videoRef}
          muted
          playsInline
          className={`absolute inset-0 size-full object-cover ${scanning ? '' : 'hidden'}`}
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* กรอบเล็งสี่มุม */}
        <div className="relative grid size-full place-items-center rounded-lg">
          <span className="absolute top-0 left-0 size-10 rounded-tl-lg border-t-3 border-l-3 border-jade-500" />
          <span className="absolute top-0 right-0 size-10 rounded-tr-lg border-t-3 border-r-3 border-jade-500" />
          <span className="absolute bottom-0 left-0 size-10 rounded-bl-lg border-b-3 border-l-3 border-jade-500" />
          <span className="absolute right-0 bottom-0 size-10 rounded-br-lg border-r-3 border-b-3 border-jade-500" />

          {scanning ? (
            <>
              {/* เส้นกวาดให้รู้ว่ากล้องทำงานอยู่ */}
              <span className="pointer-events-none absolute inset-x-6 top-1/2 h-0.5 animate-pulse bg-jade-400/80" />
              <span className="absolute bottom-2 rounded-full bg-navy-950/70 px-3 py-1 text-xs text-white/80">
                ยกบัตรรับสินค้าให้ QR อยู่ในกรอบ
              </span>
            </>
          ) : (
            <div className="text-center">
              <QrIcon className="mx-auto size-8 text-white/30" />
              <Button
                tone="jade"
                type="button"
                className="mt-3 px-4 py-2 text-sm"
                disabled={disabled || status === 'starting'}
                onClick={() => start()}
              >
                {status === 'starting'
                  ? 'กำลังเปิดกล้อง…'
                  : status === 'error'
                    ? 'ลองเปิดกล้องอีกครั้ง'
                    : 'เปิดกล้องสแกน QR'}
              </Button>
              <p className="mt-2 text-xs text-white/50">หรือพิมพ์รหัสด้านล่างก็ได้</p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-amber-50 px-3.5 py-3 text-sm text-amber-800" role="alert">
          {error}
        </p>
      )}

      {scanning && (
        <div className="flex flex-wrap items-center gap-2">
          <Button tone="outlineNavy" type="button" className="px-3 py-1.5 text-xs" onClick={stop}>
            ปิดกล้อง
          </Button>

          {cameras.length > 1 && (
            <select
              value={cameraId}
              onChange={(e) => {
                stop();
                start(e.target.value);
              }}
              aria-label="เลือกกล้อง"
              className="min-w-0 flex-1 rounded-xl border border-hairline px-3 py-1.5 text-xs outline-none focus:border-jade-500"
            >
              {cameras.map((c, i) => (
                <option key={c.deviceId} value={c.deviceId}>
                  {c.label || `กล้องที่ ${i + 1}`}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}
