import { useRef, useState, useCallback, useEffect } from "react";
import { toast } from "@/stores/toastStore";

interface UseMosaicOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  getCanvasCoordinates: (clientX: number, clientY: number) => { x: number; y: number; scaleX: number; scaleY: number } | null;
}

export function useMosaic({ canvasRef, getCanvasCoordinates }: UseMosaicOptions) {
  const [mosaicMode, setMosaicMode] = useState(false);
  const [mosaicBlockSize, setMosaicBlockSize] = useState(15);
  const [mosaicBrushSize, setMosaicBrushSize] = useState(40);
  const mosaicCanvasRef = useRef<HTMLCanvasElement>(null);
  const isMosaicDrawingRef = useRef(false);

  const setMosaicDrawingState = useCallback((isDrawing: boolean) => {
    isMosaicDrawingRef.current = isDrawing;
  }, []);

  // Initialize mask canvas when entering mosaic mode
  useEffect(() => {
    if (!mosaicMode) {
      setMosaicDrawingState(false);
      return;
    }

    if (canvasRef.current && mosaicCanvasRef.current) {
      const mc = mosaicCanvasRef.current;
      mc.width = canvasRef.current.width;
      mc.height = canvasRef.current.height;
      const ctx = mc.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, mc.width, mc.height);
      }
    }
  }, [mosaicMode, canvasRef, setMosaicDrawingState]);

  const handleMosaicDraw = useCallback((clientX: number, clientY: number) => {
    if (!mosaicMode || !isMosaicDrawingRef.current || !mosaicCanvasRef.current) return;

    const coordinates = getCanvasCoordinates(clientX, clientY);
    if (!coordinates) return;

    const { x, y, scaleX } = coordinates;
    const ctx = mosaicCanvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
    ctx.beginPath();
    ctx.arc(x, y, mosaicBrushSize * scaleX, 0, Math.PI * 2);
    ctx.fill();
  }, [mosaicMode, mosaicBrushSize, getCanvasCoordinates]);

  const handleMosaicPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!mosaicMode) return;
    e.preventDefault();
    setMosaicDrawingState(true);
    handleMosaicDraw(e.clientX, e.clientY);
  }, [mosaicMode, setMosaicDrawingState, handleMosaicDraw]);

  const handleMosaicPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!mosaicMode) return;
    if (e.pointerType === "touch") {
      e.preventDefault();
    }
    handleMosaicDraw(e.clientX, e.clientY);
  }, [mosaicMode, handleMosaicDraw]);

  const handleMosaicPointerEnd = useCallback(() => {
    if (!mosaicMode) return;
    setMosaicDrawingState(false);
  }, [mosaicMode, setMosaicDrawingState]);

  const applyMosaic = useCallback(() => {
    if (!canvasRef.current || !mosaicCanvasRef.current) return;

    const canvas = canvasRef.current;
    const maskCanvas = mosaicCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const maskCtx = maskCanvas.getContext("2d");
    if (!ctx || !maskCtx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    const blockSize = mosaicBlockSize;

    for (let by = 0; by < canvas.height; by += blockSize) {
      for (let bx = 0; bx < canvas.width; bx += blockSize) {
        let isMasked = false;
        for (let y = by; y < Math.min(by + blockSize, canvas.height) && !isMasked; y++) {
          for (let x = bx; x < Math.min(bx + blockSize, canvas.width) && !isMasked; x++) {
            const idx = (y * maskCanvas.width + x) * 4;
            if (maskData.data[idx + 3] > 0) {
              isMasked = true;
            }
          }
        }

        if (!isMasked) continue;

        let r = 0, g = 0, b = 0, count = 0;
        for (let y = by; y < Math.min(by + blockSize, canvas.height); y++) {
          for (let x = bx; x < Math.min(bx + blockSize, canvas.width); x++) {
            const idx = (y * canvas.width + x) * 4;
            r += imageData.data[idx];
            g += imageData.data[idx + 1];
            b += imageData.data[idx + 2];
            count++;
          }
        }
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        for (let y = by; y < Math.min(by + blockSize, canvas.height); y++) {
          for (let x = bx; x < Math.min(bx + blockSize, canvas.width); x++) {
            const idx = (y * canvas.width + x) * 4;
            imageData.data[idx] = r;
            imageData.data[idx + 1] = g;
            imageData.data[idx + 2] = b;
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
    setMosaicMode(false);
    setMosaicDrawingState(false);
    toast.success("モザイクを適用しました");
  }, [canvasRef, mosaicBlockSize, setMosaicDrawingState]);

  const cancelMosaic = useCallback(() => {
    setMosaicMode(false);
    setMosaicDrawingState(false);
    if (mosaicCanvasRef.current) {
      const ctx = mosaicCanvasRef.current.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, mosaicCanvasRef.current.width, mosaicCanvasRef.current.height);
    }
  }, [setMosaicDrawingState]);

  return {
    mosaicMode,
    setMosaicMode,
    mosaicBlockSize,
    setMosaicBlockSize,
    mosaicBrushSize,
    setMosaicBrushSize,
    mosaicCanvasRef,
    handleMosaicPointerDown,
    handleMosaicPointerMove,
    handleMosaicPointerEnd,
    applyMosaic,
    cancelMosaic,
    setMosaicDrawingState,
  };
}
