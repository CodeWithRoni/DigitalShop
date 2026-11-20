import 'server-only';
import { one } from './db/pg';

export const MAX_IMAGE_BYTES = 400 * 1024;
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp'];

/** Stores an uploaded image in Postgres and returns its public URL. (No SVG: it can carry scripts.) */
export async function saveImage(file: File): Promise<{ url: string } | { error: string }> {
  if (!ALLOWED.includes(file.type)) return { error: 'Use a PNG, JPG or WebP image' };
  if (file.size > MAX_IMAGE_BYTES) return { error: 'Image is too large (max 400 KB after resizing)' };
  const buf = Buffer.from(await file.arrayBuffer());
  // Check magic bytes so a renamed file can't pretend to be an image.
  const isPng = buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const isJpg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  const isWebp = buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP';
  if (!(isPng || isJpg || isWebp)) return { error: 'This file is not a valid image' };
  const mime = isPng ? 'image/png' : isJpg ? 'image/jpeg' : 'image/webp';
  const r = await one<{ id: number }>('insert into images (mime, data) values ($1, $2) returning id', [mime, buf]);
  return { url: `/api/img/${r!.id}` };
}
