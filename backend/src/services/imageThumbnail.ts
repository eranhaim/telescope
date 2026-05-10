import sharp from "sharp";

const THUMB_WIDTH = 400;
const THUMB_QUALITY = 75;

export async function generateImageThumbnail(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(THUMB_WIDTH, undefined, { withoutEnlargement: true })
    .jpeg({ quality: THUMB_QUALITY })
    .toBuffer();
}
