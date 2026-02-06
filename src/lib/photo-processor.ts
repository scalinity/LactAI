import imageCompression from "browser-image-compression";

export interface ProcessedPhoto {
  blob: Blob;
  base64: string;
  thumbnailUrl: string;
  originalName: string;
  mimeType: string;
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

export async function processMultiplePhotos(
  files: File[],
  onProgress?: (index: number, status: "processing" | "done" | "error") => void,
): Promise<ProcessedPhoto[]> {
  const results: ProcessedPhoto[] = [];

  for (let i = 0; i < files.length; i++) {
    onProgress?.(i, "processing");
    try {
      const result = await processPhoto(files[i]);
      results.push(result);
      onProgress?.(i, "done");
    } catch {
      onProgress?.(i, "error");
    }
  }

  return results;
}
