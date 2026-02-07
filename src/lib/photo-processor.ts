import imageCompression from "browser-image-compression";

export interface ProcessedPhoto {
  blob: Blob;
  base64: string;
  thumbnailUrl: string;
  originalName: string;
  mimeType: string;
}

export interface PhotoProcessingResult {
  photo?: ProcessedPhoto;
  error?: string;
  fileName: string;
}

// Track thumbnail URLs for cleanup
const activeThumbnailUrls = new Set<string>();

export function revokeThumbnailUrl(url: string) {
  if (activeThumbnailUrls.has(url)) {
    URL.revokeObjectURL(url);
    activeThumbnailUrls.delete(url);
  }
}

export function revokeAllThumbnails() {
  for (const url of activeThumbnailUrls) {
    URL.revokeObjectURL(url);
  }
  activeThumbnailUrls.clear();
}

export async function processPhoto(file: File): Promise<ProcessedPhoto> {
  const compressed = await imageCompression(file, {
    maxWidthOrHeight: 1600,
    useWebWorker: true,
    preserveExif: false,
    fileType: "image/jpeg",
    initialQuality: 0.85,
  });

  const thumbBlob = await imageCompression(file, {
    maxWidthOrHeight: 200,
    useWebWorker: true,
    fileType: "image/jpeg",
    initialQuality: 0.6,
  });

  const base64 = await blobToBase64(compressed);
  const thumbnailUrl = URL.createObjectURL(thumbBlob);
  activeThumbnailUrls.add(thumbnailUrl);

  return {
    blob: compressed,
    base64,
    thumbnailUrl,
    originalName: file.name,
    mimeType: "image/jpeg",
  };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const CONCURRENCY = 3;

export async function processMultiplePhotos(
  files: File[],
  onProgress?: (index: number, status: "processing" | "done" | "error") => void,
): Promise<PhotoProcessingResult[]> {
  const results: PhotoProcessingResult[] = new Array(files.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < files.length) {
      const i = nextIndex++;
      onProgress?.(i, "processing");
      try {
        const photo = await processPhoto(files[i]);
        results[i] = { photo, fileName: files[i].name };
        onProgress?.(i, "done");
      } catch (err) {
        results[i] = {
          error: err instanceof Error ? err.message : "Processing failed",
          fileName: files[i].name,
        };
        onProgress?.(i, "error");
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(CONCURRENCY, files.length) },
    () => worker(),
  );
  await Promise.all(workers);

  return results;
}
