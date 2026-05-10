import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";
import { v4 as uuidv4 } from "uuid";

const execFileAsync = promisify(execFile);

export async function extractVideoThumbnail(
  videoBuffer: Buffer,
  originalName: string
): Promise<Buffer> {
  const tmpDir = os.tmpdir();
  const id = uuidv4();
  const ext = path.extname(originalName) || ".mp4";
  const inputPath = path.join(tmpDir, `${id}${ext}`);
  const outputPath = path.join(tmpDir, `${id}_thumb.jpg`);

  try {
    fs.writeFileSync(inputPath, videoBuffer);

    await execFileAsync("ffmpeg", [
      "-i", inputPath,
      "-vframes", "1",
      "-an",
      "-ss", "0",
      "-f", "image2",
      "-q:v", "2",
      outputPath,
    ]);

    return fs.readFileSync(outputPath);
  } finally {
    try { fs.unlinkSync(inputPath); } catch {}
    try { fs.unlinkSync(outputPath); } catch {}
  }
}
