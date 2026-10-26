"use client";

import { useEffect, useImperativeHandle, useRef, useState, type PointerEvent, type Ref } from "react";

type Point = { x: number; y: number };
type Stroke = Point[];

export type SignaturePadHandle = {
  getFile: () => Promise<File | null>;
};

type SignaturePadProps = {
  ref: Ref<SignaturePadHandle>;
  disabled?: boolean;
  error?: string;
  onChange: () => void;
};

/** Normalized points preserve a signature when the responsive canvas resizes. */
function paint(canvas: HTMLCanvasElement, strokes: Stroke[]) {
  const context = canvas.getContext("2d");
  if (!context) return;

  const { width, height } = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  context.scale(ratio, ratio);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#192a42";
  context.fillStyle = "#192a42";
  context.lineWidth = 2.4;
  context.lineCap = "round";
  context.lineJoin = "round";

  for (const stroke of strokes) {
    if (!stroke.length) continue;
    context.beginPath();
    context.moveTo(stroke[0].x * width, stroke[0].y * height);
    for (const point of stroke.slice(1)) {
      context.lineTo(point.x * width, point.y * height);
    }
    if (stroke.length === 1) {
      context.arc(stroke[0].x * width, stroke[0].y * height, 1.2, 0, Math.PI * 2);
      context.fill();
    } else {
      context.stroke();
    }
  }
}

export default function SignaturePad({ ref, disabled, error, onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const activePointer = useRef<number | null>(null);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => paint(canvas, strokes.current));
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useImperativeHandle(ref, () => ({
    async getFile() {
      const canvas = canvasRef.current;
      if (!canvas || !strokes.current.length) return null;

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error("Unable to prepare the signature image."));
        }, "image/png");
      });
      return new File([blob], "signature.png", { type: "image/png" });
    },
  }), []);

  function point(event: PointerEvent<HTMLCanvasElement>): Point {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)),
      y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)),
    };
  }

  function start(event: PointerEvent<HTMLCanvasElement>) {
    if (disabled || activePointer.current !== null || (event.pointerType === "mouse" && event.button !== 0)) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    activePointer.current = event.pointerId;
    strokes.current.push([point(event)]);
    paint(event.currentTarget, strokes.current);
    setHasSignature(true);
    onChange();
  }

  function move(event: PointerEvent<HTMLCanvasElement>) {
    if (disabled || activePointer.current !== event.pointerId) return;
    strokes.current[strokes.current.length - 1].push(point(event));
    paint(event.currentTarget, strokes.current);
  }

  function stop(event: PointerEvent<HTMLCanvasElement>) {
    if (activePointer.current !== event.pointerId) return;
    activePointer.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function clear() {
    strokes.current = [];
    activePointer.current = null;
    if (canvasRef.current) paint(canvasRef.current, []);
    setHasSignature(false);
    onChange();
  }

  return (
    <div className="sm:col-span-2">
      <p id="signature-label" className="mb-2 text-base leading-6 font-medium text-ink">
        Your signature <span aria-hidden="true" className="text-danger">*</span>
      </p>
      <div className={`relative overflow-hidden rounded-xl border-2 border-dashed bg-white focus-within:ring-3 focus-within:ring-blue-100 ${error ? "border-danger" : "border-line"}`}>
        <canvas
          ref={canvasRef}
          id="signature"
          role="img"
          tabIndex={0}
          aria-labelledby="signature-label"
          aria-describedby={`signature-hint${error ? " signature-error" : ""}`}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={stop}
          onPointerCancel={stop}
          onLostPointerCapture={() => { activePointer.current = null; }}
          className={`block h-52 w-full touch-none outline-none ${disabled ? "cursor-not-allowed" : "cursor-crosshair"}`}
        >
          Your browser does not support a signature canvas.
        </canvas>
        {!hasSignature && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 grid place-items-center text-base text-slate-500">
            Draw your signature here
          </span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <p id="signature-hint" className="max-w-md pt-2 text-sm leading-6 text-muted">
          Use your mouse, finger, or pen to sign. Select Clear signature to start again.
        </p>
        <button type="button" onClick={clear} disabled={disabled || !hasSignature} className="min-h-11 rounded-lg px-2 text-sm font-medium text-brand underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:text-slate-500">
          Clear signature
        </button>
      </div>
      {error && <p id="signature-error" className="mt-2 text-sm leading-6 text-danger">{error}</p>}
    </div>
  );
}
