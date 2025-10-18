import { put, del, PutBlobResult } from '@vercel/blob';

/**
 * Upload an image to Vercel Blob Storage
 * @param imageData - Base64 encoded image string or Buffer
 * @param filename - Name for the file (will be made unique by Vercel)
 * @returns URL of the uploaded image
 */
export async function uploadImage(
  imageData: string | Buffer,
  filename: string
): Promise<string> {
  try {
    let blob: Buffer;

    // Handle base64 encoded images
    if (typeof imageData === 'string') {
      // Remove data:image/...;base64, prefix if present
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      blob = Buffer.from(base64Data, 'base64');
    } else {
      blob = imageData;
    }

    // Upload to Vercel Blob
    const result: PutBlobResult = await put(filename, blob, {
      access: 'public',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return result.url;
  } catch (error) {
    console.error('Error uploading image to Vercel Blob:', error);
    throw new Error('Failed to upload image');
  }
}

/**
 * Delete an image from Vercel Blob Storage
 * @param imageUrl - URL of the image to delete
 */
export async function deleteImage(imageUrl: string): Promise<void> {
  try {
    if (!imageUrl || !imageUrl.includes('blob.vercel-storage.com')) {
      // Not a Vercel Blob URL, skip deletion
      return;
    }

    await del(imageUrl, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
  } catch (error) {
    console.error('Error deleting image from Vercel Blob:', error);
    // Don't throw error on deletion failure, just log it
  }
}

/**
 * Replace an existing image with a new one
 * @param oldImageUrl - URL of the existing image (will be deleted)
 * @param newImageData - Base64 encoded new image string or Buffer
 * @param filename - Name for the new file
 * @returns URL of the newly uploaded image
 */
export async function replaceImage(
  oldImageUrl: string | null | undefined,
  newImageData: string | Buffer,
  filename: string
): Promise<string> {
  // Upload new image first
  const newUrl = await uploadImage(newImageData, filename);

  // Delete old image if it exists
  if (oldImageUrl) {
    await deleteImage(oldImageUrl);
  }

  return newUrl;
}

/**
 * Validate if a string is a base64 encoded image
 * @param str - String to validate
 * @returns true if valid base64 image
 */
export function isBase64Image(str: string): boolean {
  if (!str || typeof str !== 'string') {
    return false;
  }

  // Check if it's a data URI
  const dataUriPattern = /^data:image\/(png|jpg|jpeg|gif|webp|svg\+xml);base64,/;
  if (dataUriPattern.test(str)) {
    return true;
  }

  // Check if it's a pure base64 string (without data URI prefix)
  try {
    const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;
    return base64Pattern.test(str) && str.length % 4 === 0;
  } catch {
    return false;
  }
}

/**
 * Check if a string is a valid image URL (either HTTP or Vercel Blob)
 * @param str - String to validate
 * @returns true if valid URL
 */
export function isImageUrl(str: string): boolean {
  if (!str || typeof str !== 'string') {
    return false;
  }

  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
