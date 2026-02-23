"use client";

import { useCallback, useRef } from "react";
import { useEditorStore } from "@/stores/editorStore";
import { toast } from "@/stores/toastStore";
import type { ImageAdjustments } from "@/types";

// Extended image adjustments interface
interface ExtendedImageAdjustments extends ImageAdjustments {
  // HSL adjustments
  hue?: number;
  // Vignette
  vignetteAmount?: number;
  vignetteRadius?: number;
  // Grain/Noise
  grain?: number;
  // Temperature
  temperature?: number;
  // Tint
  tint?: number;
  // Clarity (local contrast)
  clarity?: number;
  // Vibrance
  vibrance?: number;
  // Dehaze
  dehaze?: number;
}

export function useImageProcessor() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const {
    originalImageData,
    setOriginalImageData,
    setInitialImageData,
    initialImageData,
    imageAdjustments,
    setProcessingState,
  } = useEditorStore();

  const initCanvas = useCallback(
    (canvas: HTMLCanvasElement, image: HTMLImageElement) => {
      canvasRef.current = canvas;
      ctxRef.current = canvas.getContext("2d", { willReadFrequently: true });

      if (!ctxRef.current) return;

      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      ctxRef.current.drawImage(image, 0, 0);

      // Store original image data
      const imageData = ctxRef.current.getImageData(
        0,
        0,
        canvas.width,
        canvas.height
      );
      setOriginalImageData(imageData);

      // Store initial image data for full reset (only on first load)
      if (!initialImageData) {
        const initialData = new ImageData(
          new Uint8ClampedArray(imageData.data),
          imageData.width,
          imageData.height,
        );
        setInitialImageData(initialData);
      }
    },
    [setOriginalImageData, setInitialImageData, initialImageData]
  );

  // RGB to HSL conversion
  const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return [h * 360, s * 100, l * 100];
  };

  // HSL to RGB conversion
  const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    h /= 360;
    s /= 100;
    l /= 100;
    let r, g, b;

    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  };

  // Apply temperature adjustment (warming/cooling)
  const applyTemperature = (r: number, g: number, b: number, temp: number): [number, number, number] => {
    // Positive temp = warmer (more orange/yellow), negative = cooler (more blue)
    const factor = temp / 100;
    if (factor > 0) {
      r += factor * 30;
      g += factor * 15;
      b -= factor * 30;
    } else {
      r += factor * 20;
      g -= factor * 5;
      b -= factor * 30;
    }
    return [r, g, b];
  };

  // Apply tint adjustment (green/magenta)
  const applyTint = (r: number, g: number, b: number, tintValue: number): [number, number, number] => {
    // Positive tint = magenta, negative = green
    const factor = tintValue / 100;
    if (factor > 0) {
      r += factor * 20;
      g -= factor * 20;
      b += factor * 20;
    } else {
      r += factor * 10;
      g -= factor * 20;
      b += factor * 10;
    }
    return [r, g, b];
  };

  // Apply vibrance (smart saturation)
  const applyVibrance = (r: number, g: number, b: number, vibranceValue: number): [number, number, number] => {
    const max = Math.max(r, g, b);
    const avg = (r + g + b) / 3;
    const amt = ((Math.abs(max - avg) * 2 / 255) * vibranceValue) / 100;

    if (r !== max) r += (max - r) * amt;
    if (g !== max) g += (max - g) * amt;
    if (b !== max) b += (max - b) * amt;

    return [r, g, b];
  };

  // Apply sharpening using unsharp mask
  const applySharpen = (imageData: ImageData, amount: number) => {
    if (amount <= 0) return;

    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const tempData = new Uint8ClampedArray(data);
    const strength = amount / 100;

    // Simple sharpening kernel
    const kernel = [
      0, -1, 0,
      -1, 5, -1,
      0, -1, 0
    ];

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const idx = ((y + ky) * width + (x + kx)) * 4 + c;
              sum += tempData[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
            }
          }
          const idx = (y * width + x) * 4 + c;
          const original = tempData[idx];
          data[idx] = Math.max(0, Math.min(255, original + (sum - original) * strength));
        }
      }
    }
  };

  // Apply vignette effect
  const applyVignette = (imageData: ImageData, amount: number, radius: number = 0.5) => {
    if (amount <= 0) return;

    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
    const strength = amount / 100;
    const radiusFactor = 1 - radius;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;
        const vignette = 1 - Math.pow(Math.max(0, dist - radiusFactor) / (1 - radiusFactor), 2) * strength;

        const idx = (y * width + x) * 4;
        data[idx] *= vignette;
        data[idx + 1] *= vignette;
        data[idx + 2] *= vignette;
      }
    }
  };

  // Apply grain/noise
  const applyGrain = (imageData: ImageData, amount: number) => {
    if (amount <= 0) return;

    const data = imageData.data;
    const strength = amount / 100 * 50;

    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * strength;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
  };

  // Apply clarity (local contrast enhancement)
  const applyClarity = (imageData: ImageData, amount: number) => {
    if (amount === 0) return;

    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const tempData = new Uint8ClampedArray(data);
    const strength = amount / 100;
    const radius = 2;

    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        const idx = (y * width + x) * 4;

        for (let c = 0; c < 3; c++) {
          // Calculate local average
          let sum = 0;
          let count = 0;
          for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              const nidx = ((y + dy) * width + (x + dx)) * 4 + c;
              sum += tempData[nidx];
              count++;
            }
          }
          const avg = sum / count;
          const original = tempData[idx + c];
          const diff = original - avg;
          data[idx + c] = Math.max(0, Math.min(255, original + diff * strength));
        }
      }
    }
  };

  // Apply dehaze
  const applyDehaze = (imageData: ImageData, amount: number) => {
    if (amount === 0) return;

    const data = imageData.data;
    const strength = amount / 100;

    // Find the atmospheric light (brightest pixel in haziest region)
    let minIntensity = 255;
    for (let i = 0; i < data.length; i += 4) {
      const min = Math.min(data[i], data[i + 1], data[i + 2]);
      if (min < minIntensity) minIntensity = min;
    }

    const atmosphericLight = 220;
    const transmission = 1 - strength * 0.5;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = Math.max(0, Math.min(255, (data[i] - atmosphericLight * (1 - transmission)) / transmission));
      data[i + 1] = Math.max(0, Math.min(255, (data[i + 1] - atmosphericLight * (1 - transmission)) / transmission));
      data[i + 2] = Math.max(0, Math.min(255, (data[i + 2] - atmosphericLight * (1 - transmission)) / transmission));
    }
  };

  const applyAdjustments = useCallback(
    (adjustments: ExtendedImageAdjustments) => {
      if (!canvasRef.current || !ctxRef.current || !originalImageData) return;

      const canvas = canvasRef.current;
      const ctx = ctxRef.current;

      // Create a copy of the original image data
      const newImageData = new ImageData(
        new Uint8ClampedArray(originalImageData.data),
        originalImageData.width,
        originalImageData.height
      );
      const data = newImageData.data;

      // Convert adjustments to factors
      const brightnessFactor = adjustments.brightness / 100;
      const contrastFactor = (adjustments.contrast + 100) / 100;
      const saturationFactor = (adjustments.saturation + 100) / 100;
      const exposureFactor = Math.pow(2, adjustments.exposure / 100);
      const hueFactor = adjustments.hue || 0;
      const temperature = adjustments.temperature || 0;
      const tintValue = adjustments.tint || 0;
      const vibranceValue = adjustments.vibrance || 0;

      // Process each pixel
      for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Exposure
        r *= exposureFactor;
        g *= exposureFactor;
        b *= exposureFactor;

        // Brightness
        r += brightnessFactor * 255;
        g += brightnessFactor * 255;
        b += brightnessFactor * 255;

        // Contrast
        r = (r - 128) * contrastFactor + 128;
        g = (g - 128) * contrastFactor + 128;
        b = (b - 128) * contrastFactor + 128;

        // Temperature
        if (temperature !== 0) {
          [r, g, b] = applyTemperature(r, g, b, temperature);
        }

        // Tint
        if (tintValue !== 0) {
          [r, g, b] = applyTint(r, g, b, tintValue);
        }

        // Vibrance (before saturation)
        if (vibranceValue !== 0) {
          [r, g, b] = applyVibrance(r, g, b, vibranceValue);
        }

        // Saturation
        const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
        r = gray + (r - gray) * saturationFactor;
        g = gray + (g - gray) * saturationFactor;
        b = gray + (b - gray) * saturationFactor;

        // Hue rotation
        if (hueFactor !== 0) {
          let [h, s, l] = rgbToHsl(
            Math.max(0, Math.min(255, r)),
            Math.max(0, Math.min(255, g)),
            Math.max(0, Math.min(255, b))
          );
          h = (h + hueFactor + 360) % 360;
          [r, g, b] = hslToRgb(h, s, l);
        }

        // Highlights & Shadows
        const luminance = (r + g + b) / 3 / 255;
        if (luminance > 0.5) {
          // Highlights
          const factor = 1 + (adjustments.highlights / 100) * (luminance - 0.5) * 2;
          r *= factor;
          g *= factor;
          b *= factor;
        } else {
          // Shadows
          const factor = 1 + (adjustments.shadows / 100) * (0.5 - luminance) * 2;
          r *= factor;
          g *= factor;
          b *= factor;
        }

        // Clamp values
        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
      }

      // Apply post-processing effects
      // Clarity (local contrast)
      if (adjustments.clarity) {
        applyClarity(newImageData, adjustments.clarity);
      }

      // Dehaze
      if (adjustments.dehaze) {
        applyDehaze(newImageData, adjustments.dehaze);
      }

      // Sharpness
      if (adjustments.sharpness > 0) {
        applySharpen(newImageData, adjustments.sharpness);
      }

      // Blur
      if (adjustments.blur > 0) {
        applyBoxBlur(newImageData, Math.ceil(adjustments.blur / 10));
      }

      // Vignette
      if (adjustments.vignetteAmount) {
        applyVignette(newImageData, adjustments.vignetteAmount, adjustments.vignetteRadius || 0.5);
      }

      // Grain
      if (adjustments.grain) {
        applyGrain(newImageData, adjustments.grain);
      }

      // Clear canvas and apply transformations
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();

      // Apply rotation and flip
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((adjustments.rotation * Math.PI) / 180);
      if (adjustments.flipHorizontal) {
        ctx.scale(-1, 1);
      }
      if (adjustments.flipVertical) {
        ctx.scale(1, -1);
      }

      // Create temporary canvas for transformed image data
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = newImageData.width;
      tempCanvas.height = newImageData.height;
      const tempCtx = tempCanvas.getContext("2d");
      if (tempCtx) {
        tempCtx.putImageData(newImageData, 0, 0);
        ctx.drawImage(tempCanvas, -canvas.width / 2, -canvas.height / 2);
      }

      ctx.restore();
    },
    [originalImageData]
  );

  const applyBoxBlur = (imageData: ImageData, radius: number) => {
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const tempData = new Uint8ClampedArray(data);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0,
          g = 0,
          b = 0,
          count = 0;

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = Math.min(width - 1, Math.max(0, x + dx));
            const ny = Math.min(height - 1, Math.max(0, y + dy));
            const idx = (ny * width + nx) * 4;
            r += tempData[idx];
            g += tempData[idx + 1];
            b += tempData[idx + 2];
            count++;
          }
        }

        const idx = (y * width + x) * 4;
        data[idx] = r / count;
        data[idx + 1] = g / count;
        data[idx + 2] = b / count;
      }
    }
  };

  const exportImage = useCallback(
    async (format: "png" | "jpg" | "webp" | "avif" | "bmp", quality: number = 0.9): Promise<Blob | null> => {
      if (!canvasRef.current) return null;

      setProcessingState({
        status: "processing",
        progress: 50,
        message: "画像をエクスポート中...",
      });

      try {
        const mimeTypeMap: Record<string, string> = {
          png: "image/png",
          jpg: "image/jpeg",
          webp: "image/webp",
          avif: "image/avif",
          bmp: "image/bmp",
        };
        const mimeType = mimeTypeMap[format] || "image/webp";
        const qualityArg = (format === "png" || format === "bmp") ? undefined : quality;

        return new Promise((resolve) => {
          canvasRef.current!.toBlob(
            (blob) => {
              if (blob) {
                setProcessingState({ status: "complete", progress: 100 });
                toast.success("画像のエクスポートが完了しました");
                resolve(blob);
              } else {
                // Fallback for unsupported formats (AVIF/BMP in some browsers)
                canvasRef.current!.toBlob(
                  (fallbackBlob) => {
                    setProcessingState({ status: "complete", progress: 100 });
                    toast.warning(`${format.toUpperCase()}非対応のため、WebPで出力しました`);
                    resolve(fallbackBlob);
                  },
                  "image/webp",
                  quality
                );
              }
            },
            mimeType,
            qualityArg
          );
        });
      } catch (error) {
        console.error("Image export error:", error);
        setProcessingState({
          status: "error",
          progress: 0,
          error: "エクスポートに失敗しました",
        });
        toast.error("画像のエクスポートに失敗しました");
        return null;
      }
    },
    [setProcessingState]
  );

  const resizeImage = useCallback(
    async (
      width: number,
      height: number,
      maintainAspectRatio: boolean = true
    ): Promise<void> => {
      if (!canvasRef.current || !ctxRef.current || !originalImageData) return;

      const canvas = canvasRef.current;
      const originalWidth = originalImageData.width;
      const originalHeight = originalImageData.height;

      let newWidth = width;
      let newHeight = height;

      if (maintainAspectRatio) {
        const aspectRatio = originalWidth / originalHeight;
        if (width / height > aspectRatio) {
          newWidth = height * aspectRatio;
        } else {
          newHeight = width / aspectRatio;
        }
      }

      // Create temp canvas with original image
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = originalWidth;
      tempCanvas.height = originalHeight;
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) return;
      tempCtx.putImageData(originalImageData, 0, 0);

      // Resize canvas and draw scaled image
      canvas.width = newWidth;
      canvas.height = newHeight;
      ctxRef.current.drawImage(
        tempCanvas,
        0,
        0,
        originalWidth,
        originalHeight,
        0,
        0,
        newWidth,
        newHeight
      );

      // Update original image data
      const newImageData = ctxRef.current.getImageData(0, 0, newWidth, newHeight);
      setOriginalImageData(newImageData);

      toast.success(`画像を ${Math.round(newWidth)}x${Math.round(newHeight)} にリサイズしました`);
    },
    [originalImageData, setOriginalImageData]
  );

  const cropImage = useCallback(
    async (x: number, y: number, width: number, height: number): Promise<void> => {
      if (!canvasRef.current || !ctxRef.current || !originalImageData) return;

      const canvas = canvasRef.current;

      // Create temp canvas with current image
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = originalImageData.width;
      tempCanvas.height = originalImageData.height;
      const tempCtx = tempCanvas.getContext("2d");
      if (!tempCtx) return;
      tempCtx.putImageData(originalImageData, 0, 0);

      // Resize canvas and draw cropped portion
      canvas.width = width;
      canvas.height = height;
      ctxRef.current.drawImage(tempCanvas, x, y, width, height, 0, 0, width, height);

      // Update original image data
      const newImageData = ctxRef.current.getImageData(0, 0, width, height);
      setOriginalImageData(newImageData);

      toast.success("画像をクロップしました");
    },
    [originalImageData, setOriginalImageData]
  );

  // Add text to image
  const addText = useCallback(
    (
      text: string,
      x: number,
      y: number,
      options: {
        fontSize?: number;
        fontFamily?: string;
        color?: string;
        strokeColor?: string;
        strokeWidth?: number;
        align?: CanvasTextAlign;
        baseline?: CanvasTextBaseline;
      } = {}
    ) => {
      if (!canvasRef.current || !ctxRef.current) return;

      const ctx = ctxRef.current;
      const {
        fontSize = 32,
        fontFamily = "sans-serif",
        color = "#ffffff",
        strokeColor,
        strokeWidth = 2,
        align = "left",
        baseline = "top",
      } = options;

      ctx.font = `${fontSize}px ${fontFamily}`;
      ctx.textAlign = align;
      ctx.textBaseline = baseline;

      if (strokeColor) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.strokeText(text, x, y);
      }

      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
    },
    []
  );

  // Draw shape
  const drawShape = useCallback(
    (
      type: "rectangle" | "circle" | "line",
      params: {
        x: number;
        y: number;
        width?: number;
        height?: number;
        radius?: number;
        endX?: number;
        endY?: number;
        fillColor?: string;
        strokeColor?: string;
        strokeWidth?: number;
      }
    ) => {
      if (!canvasRef.current || !ctxRef.current) return;

      const ctx = ctxRef.current;
      const {
        x,
        y,
        width = 100,
        height = 100,
        radius = 50,
        endX = x + 100,
        endY = y,
        fillColor,
        strokeColor = "#ffffff",
        strokeWidth = 2,
      } = params;

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;
      if (fillColor) ctx.fillStyle = fillColor;

      ctx.beginPath();

      switch (type) {
        case "rectangle":
          if (fillColor) ctx.fillRect(x, y, width, height);
          ctx.strokeRect(x, y, width, height);
          break;
        case "circle":
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          if (fillColor) ctx.fill();
          ctx.stroke();
          break;
        case "line":
          ctx.moveTo(x, y);
          ctx.lineTo(endX, endY);
          ctx.stroke();
          break;
      }

      ctx.closePath();
    },
    []
  );

  // Apply watermark
  const applyWatermark = useCallback(
    (
      watermarkImage: HTMLImageElement,
      position: "topLeft" | "topRight" | "bottomLeft" | "bottomRight" | "center" = "bottomRight",
      opacity: number = 0.5,
      scale: number = 0.2
    ) => {
      if (!canvasRef.current || !ctxRef.current) return;

      const canvas = canvasRef.current;
      const ctx = ctxRef.current;

      const watermarkWidth = canvas.width * scale;
      const watermarkHeight = (watermarkImage.height / watermarkImage.width) * watermarkWidth;
      const padding = 20;

      let x = 0;
      let y = 0;

      switch (position) {
        case "topLeft":
          x = padding;
          y = padding;
          break;
        case "topRight":
          x = canvas.width - watermarkWidth - padding;
          y = padding;
          break;
        case "bottomLeft":
          x = padding;
          y = canvas.height - watermarkHeight - padding;
          break;
        case "bottomRight":
          x = canvas.width - watermarkWidth - padding;
          y = canvas.height - watermarkHeight - padding;
          break;
        case "center":
          x = (canvas.width - watermarkWidth) / 2;
          y = (canvas.height - watermarkHeight) / 2;
          break;
      }

      ctx.globalAlpha = opacity;
      ctx.drawImage(watermarkImage, x, y, watermarkWidth, watermarkHeight);
      ctx.globalAlpha = 1;

      toast.success("ウォーターマークを追加しました");
    },
    []
  );

  // Get histogram data
  const getHistogram = useCallback((): { r: number[]; g: number[]; b: number[]; luminance: number[] } | null => {
    if (!originalImageData) return null;

    const data = originalImageData.data;
    const r = new Array(256).fill(0);
    const g = new Array(256).fill(0);
    const b = new Array(256).fill(0);
    const luminance = new Array(256).fill(0);

    for (let i = 0; i < data.length; i += 4) {
      r[data[i]]++;
      g[data[i + 1]]++;
      b[data[i + 2]]++;
      const lum = Math.round(0.2989 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      luminance[lum]++;
    }

    return { r, g, b, luminance };
  }, [originalImageData]);

  // Auto levels
  const autoLevels = useCallback(() => {
    if (!canvasRef.current || !ctxRef.current || !originalImageData) return;

    const data = originalImageData.data;
    let minR = 255, maxR = 0;
    let minG = 255, maxG = 0;
    let minB = 255, maxB = 0;

    // Find min/max for each channel
    for (let i = 0; i < data.length; i += 4) {
      minR = Math.min(minR, data[i]);
      maxR = Math.max(maxR, data[i]);
      minG = Math.min(minG, data[i + 1]);
      maxG = Math.max(maxG, data[i + 1]);
      minB = Math.min(minB, data[i + 2]);
      maxB = Math.max(maxB, data[i + 2]);
    }

    // Apply levels
    const newImageData = new ImageData(
      new Uint8ClampedArray(originalImageData.data),
      originalImageData.width,
      originalImageData.height
    );
    const newData = newImageData.data;

    for (let i = 0; i < newData.length; i += 4) {
      newData[i] = ((newData[i] - minR) / (maxR - minR)) * 255;
      newData[i + 1] = ((newData[i + 1] - minG) / (maxG - minG)) * 255;
      newData[i + 2] = ((newData[i + 2] - minB) / (maxB - minB)) * 255;
    }

    setOriginalImageData(newImageData);
    ctxRef.current.putImageData(newImageData, 0, 0);

    toast.success("自動レベル補正を適用しました");
  }, [originalImageData, setOriginalImageData]);

  // Auto white balance
  const autoWhiteBalance = useCallback(() => {
    if (!canvasRef.current || !ctxRef.current || !originalImageData) return;

    const data = originalImageData.data;
    let avgR = 0, avgG = 0, avgB = 0;
    const pixelCount = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
      avgR += data[i];
      avgG += data[i + 1];
      avgB += data[i + 2];
    }

    avgR /= pixelCount;
    avgG /= pixelCount;
    avgB /= pixelCount;

    const avgGray = (avgR + avgG + avgB) / 3;
    const scaleR = avgGray / avgR;
    const scaleG = avgGray / avgG;
    const scaleB = avgGray / avgB;

    const newImageData = new ImageData(
      new Uint8ClampedArray(originalImageData.data),
      originalImageData.width,
      originalImageData.height
    );
    const newData = newImageData.data;

    for (let i = 0; i < newData.length; i += 4) {
      newData[i] = Math.min(255, newData[i] * scaleR);
      newData[i + 1] = Math.min(255, newData[i + 1] * scaleG);
      newData[i + 2] = Math.min(255, newData[i + 2] * scaleB);
    }

    setOriginalImageData(newImageData);
    ctxRef.current.putImageData(newImageData, 0, 0);

    toast.success("自動ホワイトバランスを適用しました");
  }, [originalImageData, setOriginalImageData]);

  return {
    initCanvas,
    applyAdjustments,
    exportImage,
    resizeImage,
    cropImage,
    addText,
    drawShape,
    applyWatermark,
    getHistogram,
    autoLevels,
    autoWhiteBalance,
    canvasRef,
  };
}
