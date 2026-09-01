import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload an image buffer or base64 data to Cloudinary in the `wetri/avatars` folder.
 */
export async function uploadAvatarToCloudinary(
  fileBufferOrBase64: string | Buffer,
  publicId?: string
): Promise<string> {
  const options = {
    folder: 'wetri/avatars',
    public_id: publicId,
    overwrite: true,
    transformation: [
      { width: 256, height: 256, crop: 'fill', gravity: 'face' },
      { quality: 'auto', fetch_format: 'webp' },
    ],
  };

  if (typeof fileBufferOrBase64 === 'string') {
    const result = await cloudinary.uploader.upload(fileBufferOrBase64, options);
    return result.secure_url;
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error || !result) {
        reject(error || new Error('Cloudinary upload failed'));
      } else {
        resolve(result.secure_url);
      }
    });
    stream.end(fileBufferOrBase64);
  });
}

/**
 * Generate a DiceBear Bottts avatar SVG URL for an initial user profile.
 */
export function getDicebearAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/9.x/bottts/svg?seed=${encodeURIComponent(seed)}`;
}
