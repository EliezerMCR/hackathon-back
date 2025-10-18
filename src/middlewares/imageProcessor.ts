import { Request, Response, NextFunction } from 'express';
import { uploadImage, isBase64Image, isImageUrl } from '../utils/blob-storage';

/**
 * Middleware to process image fields in request body
 * Converts base64 images to Vercel Blob URLs
 * @param imageFields - Array of field names that contain images
 */
export function processImages(imageFields: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      for (const field of imageFields) {
        const imageData = req.body[field];

        // Skip if field doesn't exist or is null/undefined
        if (!imageData) {
          continue;
        }

        // If it's already a URL, leave it as is
        if (isImageUrl(imageData)) {
          continue;
        }

        // If it's a base64 image, upload it
        if (isBase64Image(imageData)) {
          // Generate a unique filename
          const timestamp = Date.now();
          const randomStr = Math.random().toString(36).substring(2, 8);
          const filename = `${field}-${timestamp}-${randomStr}.jpg`;

          // Upload and replace the base64 with the URL
          const imageUrl = await uploadImage(imageData, filename);
          req.body[field] = imageUrl;
        }
      }

      next();
    } catch (error) {
      console.error('Error processing images:', error);
      res.status(500).json({ error: 'Failed to process images' });
    }
  };
}
