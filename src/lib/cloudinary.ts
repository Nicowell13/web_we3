import { v2 as cloudinary } from 'cloudinary';
import sharp from 'sharp';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Convert any image buffer/base64 to an optimized WebP buffer before uploading.
 * This saves storage & bandwidth on Cloudinary and standardizes user avatars.
 */
export async function convertToWebPBuffer(input: Buffer | string): Promise<Buffer> {
  let buffer: Buffer;

  if (typeof input === 'string') {
    // Strip data URI prefix if present (e.g. data:image/png;base64,...)
    const base64Data = input.replace(/^data:image\/\w+;base64,/, '');
    buffer = Buffer.from(base64Data, 'base64');
  } else {
    buffer = input;
  }

  // Process with sharp: resize max 256x256, auto orient, convert to WebP (quality 85)
  return sharp(buffer)
    .rotate() // Auto-orient based on EXIF
    .resize(256, 256, {
      fit: 'cover',
      position: 'center',
    })
    .webp({ quality: 85, effort: 4 })
    .toBuffer();
}

async function uploadWebPToCloudinary(fileBufferOrBase64: string | Buffer, folder: string, publicId?: string, size = 256): Promise<string> {
  const buffer = typeof fileBufferOrBase64 === 'string'
    ? Buffer.from(fileBufferOrBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64')
    : fileBufferOrBase64;
  const webpBuffer = await sharp(buffer).rotate().resize(size, size, { fit: 'cover', position: 'center' }).webp({ quality: 85, effort: 4 }).toBuffer();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder, public_id: publicId, overwrite: true, format: 'webp', resource_type: 'image' as const }, (error, result) => {
      if (error || !result) reject(error || new Error('Cloudinary upload failed'));
      else resolve(result.secure_url);
    });
    stream.end(webpBuffer);
  });
}

/**
 * Upload an image buffer or base64 data to Cloudinary in the `wetri/avatars` folder.
 * Always converts image to WebP format first.
 */
export async function uploadAvatarToCloudinary(
  fileBufferOrBase64: string | Buffer,
  publicId?: string
): Promise<string> {
  return uploadWebPToCloudinary(fileBufferOrBase64, 'wetri/avatars', publicId, 256);
}

/**
 * Delete an old avatar from Cloudinary by extracting its public_id from the Cloudinary URL.
 * Only deletes if the URL is hosted on Cloudinary and in the wetri folder.
 */
export async function uploadArticleImageToCloudinary(fileBufferOrBase64: string | Buffer, publicId?: string): Promise<string> {
  return uploadWebPToCloudinary(fileBufferOrBase64, 'wetri/articles', publicId, 1200);
}

export async function uploadBannerToCloudinary(fileBufferOrBase64: string | Buffer, publicId?: string, variant: 'desktop' | 'mobile' = 'desktop'): Promise<string> {
  const size = variant === 'mobile' ? 720 : 1200;
  return uploadWebPToCloudinary(fileBufferOrBase64, 'wetri/banners', publicId, size);
}

export async function deleteCloudinaryImage(url?: string | null): Promise<boolean> {
  if (!url || !url.includes('res.cloudinary.com')) return false;
  try {
    const match = url.match(/\/upload\/(?:v\d+\/)?(wetri\/(?:avatars|banners)\/[^.]+)/);
    if (!match || !match[1]) return false;
    const res = await cloudinary.uploader.destroy(match[1], { resource_type: 'image', invalidate: true });
    return res.result === 'ok';
  } catch (err) {
    console.error('[Cloudinary] Failed to delete image:', err);
    return false;
  }
}

export async function deleteAvatarFromCloudinary(url?: string | null): Promise<boolean> {
  return deleteCloudinaryImage(url);
}

/** Generate a DiceBear Bottts avatar SVG URL. */
export function getDicebearAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(seed)}`;
}

/** Generate one random DiceBear avatar, upload it to Cloudinary, and return persistent URL. */
export async function createDefaultAvatar(userId: string): Promise<string> {
  const seed = crypto.randomUUID();
  const response = await fetch(getDicebearAvatarUrl(seed));
  if (!response.ok) throw new Error(`DiceBear avatar generation failed (${response.status})`);

  return uploadAvatarToCloudinary(
    Buffer.from(await response.arrayBuffer()),
    `default_${userId}_${Date.now()}`
  );
}
