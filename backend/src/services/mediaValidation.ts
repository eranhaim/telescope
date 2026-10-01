const IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
} as const;

const VIDEO_TYPES = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
} as const;

export type MediaKind = "image" | "video";
export type SupportedMediaType = keyof typeof IMAGE_TYPES | keyof typeof VIDEO_TYPES;

function startsWith(buffer: Buffer, bytes: number[]): boolean {
  return bytes.every((byte, index) => buffer[index] === byte);
}

function hasIsoBaseMediaHeader(buffer: Buffer): boolean {
  return buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp";
}

function isMatchingSignature(buffer: Buffer, mimeType: SupportedMediaType): boolean {
  switch (mimeType) {
    case "image/jpeg":
      return startsWith(buffer, [0xff, 0xd8, 0xff]);
    case "image/png":
      return startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/gif":
      return buffer.subarray(0, 6).toString("ascii") === "GIF87a" || buffer.subarray(0, 6).toString("ascii") === "GIF89a";
    case "image/webp":
      return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
    case "video/mp4":
    case "video/quicktime":
      return hasIsoBaseMediaHeader(buffer);
    case "video/webm":
      return startsWith(buffer, [0x1a, 0x45, 0xdf, 0xa3]);
  }
}

export function validateUploadedMedia(
  file: Pick<Express.Multer.File, "buffer" | "mimetype">,
  expectedKind: MediaKind
): { mimeType: SupportedMediaType; extension: string } | { error: string } {
  const mimeType = file.mimetype.toLowerCase() as SupportedMediaType;
  const extension = expectedKind === "image" ? IMAGE_TYPES[mimeType as keyof typeof IMAGE_TYPES] : VIDEO_TYPES[mimeType as keyof typeof VIDEO_TYPES];

  if (!extension) {
    return { error: expectedKind === "image" ? "Only JPG, PNG, GIF, and WebP images are supported" : "Only MP4, MOV, and WebM videos are supported" };
  }
  if (!isMatchingSignature(file.buffer, mimeType)) {
    return { error: "The uploaded file does not match its declared media type" };
  }
  return { mimeType, extension };
}
