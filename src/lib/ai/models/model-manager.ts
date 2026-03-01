import type { OnnxModelInfo } from "@/types/ai";

const DB_NAME = "onnx-model-cache";
const DB_VERSION = 1;
const STORE_NAME = "models";

// CDN URLs for ONNX models (placeholder URLs - will be replaced with actual model CDN)
export const AVAILABLE_MODELS: Record<string, OnnxModelInfo> = {
  "real-esrgan-lite": {
    name: "real-esrgan-lite",
    url: "/models/real-esrgan-lite.onnx",
    sizeBytes: 15_000_000,
    version: "1.0.0",
  },
  "denoise-lite": {
    name: "denoise-lite",
    url: "/models/denoise-lite.onnx",
    sizeBytes: 8_000_000,
    version: "1.0.0",
  },
  "face-detect-ultra": {
    name: "face-detect-ultra",
    url: "/models/face-detect-ultra.onnx",
    sizeBytes: 3_000_000,
    version: "1.0.0",
  },
  "saliency-lite": {
    name: "saliency-lite",
    url: "/models/saliency-lite.onnx",
    sizeBytes: 5_000_000,
    version: "1.0.0",
  },
};

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getCachedModel(name: string, version: string): Promise<ArrayBuffer | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const key = `${name}@${version}`;
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function cacheModel(name: string, version: string, data: ArrayBuffer): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const key = `${name}@${version}`;
    const req = store.put(data, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function loadModelBuffer(
  modelName: string,
  onProgress?: (loaded: number, total: number) => void
): Promise<ArrayBuffer> {
  const info = AVAILABLE_MODELS[modelName];
  if (!info) throw new Error(`Unknown model: ${modelName}`);

  // Check IndexedDB cache first
  const cached = await getCachedModel(info.name, info.version);
  if (cached) {
    onProgress?.(info.sizeBytes, info.sizeBytes);
    return cached;
  }

  // Fetch from CDN with progress
  const response = await fetch(info.url);
  if (!response.ok) throw new Error(`Failed to fetch model: ${response.statusText}`);

  const reader = response.body?.getReader();
  if (!reader) throw new Error("ReadableStream not supported");

  const contentLength = Number(response.headers.get("content-length")) || info.sizeBytes;
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress?.(received, contentLength);
  }

  const buffer = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }

  const arrayBuffer = buffer.buffer;

  // Cache for next time
  await cacheModel(info.name, info.version, arrayBuffer);

  return arrayBuffer;
}

export async function createInferenceSession(
  modelName: string,
  onProgress?: (loaded: number, total: number) => void
) {
  const ort = await import("onnxruntime-web");
  const buffer = await loadModelBuffer(modelName, onProgress);
  const session = await ort.InferenceSession.create(buffer);
  return session;
}
