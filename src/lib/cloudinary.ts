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

/**
 * Upload an image buffer or base64 data to Cloudinary in the `wetri/avatars` folder.
 * Always converts image to WebP format first.
 */
export async function uploadAvatarToCloudinary(
  fileBufferOrBase64: string | Buffer,
  publicId?: string
): Promise<string> {
  // Always pre-convert to WebP buffer
  const webpBuffer = await convertToWebPBuffer(fileBufferOrBase64);

  const options = {
    folder: 'wetri/avatars',
    public_id: publicId,
    overwrite: true,
    format: 'webp',
    resource_type: 'image' as const,
  };

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error || !result) {
        reject(error || new Error('Cloudinary upload failed'));
      } else {
        resolve(result.secure_url);
      }
    });
    stream.end(webpBuffer);
  });
}

/**
 * Generate a DiceBear Bottts avatar SVG URL for an initial user profile.
 */
export function getDicebearAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(seed)}`;
}
