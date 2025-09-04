import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';

const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1080;
const TARGET_SIZE_MB = 2;
const MAX_SIZE_MB = 8;
const INITIAL_QUALITY = 0.8;
const FALLBACK_QUALITY = 0.6;

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif'
];

interface PreparedImage {
  blob: Blob;
  mime: string;
  ext: string;
}

export function isImageFile(mime: string): boolean {
  return ALLOWED_MIME_TYPES.includes(mime.toLowerCase());
}

export function humanSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getExtensionFromMime(mime: string): string {
  switch (mime.toLowerCase()) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/heic':
    case 'image/heif':
      return 'heic';
    default:
      return 'jpg';
  }
}

function calculateDimensions(originalWidth: number, originalHeight: number): { width: number; height: number } {
  if (originalWidth <= MAX_WIDTH && originalHeight <= MAX_HEIGHT) {
    return { width: originalWidth, height: originalHeight };
  }

  const aspectRatio = originalWidth / originalHeight;
  
  if (aspectRatio > 1) {
    // Landscape
    const width = Math.min(originalWidth, MAX_WIDTH);
    const height = Math.round(width / aspectRatio);
    return { width, height };
  } else {
    // Portrait or square
    const height = Math.min(originalHeight, MAX_HEIGHT);
    const width = Math.round(height * aspectRatio);
    return { width, height };
  }
}

async function prepareForUploadMobile(fileOrAsset: any): Promise<PreparedImage> {
  console.log('Processing image on mobile:', fileOrAsset);
  
  let uri: string;
  let originalMime: string;
  
  if (typeof fileOrAsset === 'string') {
    uri = fileOrAsset;
    originalMime = 'image/jpeg'; // Default assumption
  } else if (fileOrAsset.uri) {
    uri = fileOrAsset.uri;
    originalMime = fileOrAsset.type || fileOrAsset.mimeType || 'image/jpeg';
  } else {
    throw new Error('Invalid file format');
  }

  if (!isImageFile(originalMime)) {
    throw new Error(`Unsupported file type: ${originalMime}. Only JPEG, PNG, WebP, and HEIC are allowed.`);
  }

  try {
    // Get image info first
    const imageInfo = await ImageManipulator.manipulateAsync(uri, [], {
      format: ImageManipulator.SaveFormat.JPEG
    });
    
    // Calculate target dimensions
    const { width, height } = calculateDimensions(imageInfo.width || MAX_WIDTH, imageInfo.height || MAX_HEIGHT);
    
    console.log(`Resizing from ${imageInfo.width}x${imageInfo.height} to ${width}x${height}`);
    
    // Process with initial quality
    let result = await ImageManipulator.manipulateAsync(
      uri,
      [
        { resize: { width, height } }
      ],
      {
        compress: INITIAL_QUALITY,
        format: originalMime.includes('png') && !originalMime.includes('jpeg') 
          ? ImageManipulator.SaveFormat.PNG 
          : ImageManipulator.SaveFormat.JPEG,
        base64: false
      }
    );

    // Check file size and compress further if needed
    const response = await fetch(result.uri);
    let blob = await response.blob();
    
    console.log(`Initial processed size: ${humanSize(blob.size)}`);
    
    // If still too large, compress more aggressively
    if (blob.size > TARGET_SIZE_MB * 1024 * 1024) {
      console.log('File too large, compressing further...');
      result = await ImageManipulator.manipulateAsync(
        uri,
        [
          { resize: { width, height } }
        ],
        {
          compress: FALLBACK_QUALITY,
          format: ImageManipulator.SaveFormat.JPEG, // Force JPEG for better compression
          base64: false
        }
      );
      
      const newResponse = await fetch(result.uri);
      blob = await newResponse.blob();
      console.log(`Final compressed size: ${humanSize(blob.size)}`);
    }

    // Final size check
    if (blob.size > MAX_SIZE_MB * 1024 * 1024) {
      throw new Error(`Photo too large (${humanSize(blob.size)}) after compression. Maximum allowed is ${MAX_SIZE_MB}MB.`);
    }

    const finalMime = blob.type || 'image/jpeg';
    const ext = getExtensionFromMime(finalMime);
    
    console.log(`Image processed successfully: ${humanSize(blob.size)}, ${finalMime}`);
    
    return {
      blob,
      mime: finalMime,
      ext
    };
    
  } catch (error) {
    console.error('Image processing error:', error);
    throw new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function prepareForUploadWeb(file: File): Promise<PreparedImage> {
  console.log('Processing image on web:', file.name, file.type, humanSize(file.size));
  
  if (!isImageFile(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}. Only JPEG, PNG, WebP, and HEIC are allowed.`);
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas not supported'));
      return;
    }

    img.onload = () => {
      try {
        // Calculate target dimensions
        const { width, height } = calculateDimensions(img.width, img.height);
        
        console.log(`Resizing from ${img.width}x${img.height} to ${width}x${height}`);
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and resize image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Determine output format
        const shouldUseJPEG = !file.type.includes('png') || file.type.includes('jpeg');
        const outputMime = shouldUseJPEG ? 'image/jpeg' : 'image/png';
        
        // Try with initial quality
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }
          
          console.log(`Initial processed size: ${humanSize(blob.size)}`);
          
          // Check if we need further compression
          if (blob.size > TARGET_SIZE_MB * 1024 * 1024 && outputMime === 'image/jpeg') {
            console.log('File too large, compressing further...');
            
            canvas.toBlob((compressedBlob) => {
              if (!compressedBlob) {
                reject(new Error('Failed to create compressed blob'));
                return;
              }
              
              console.log(`Final compressed size: ${humanSize(compressedBlob.size)}`);
              
              if (compressedBlob.size > MAX_SIZE_MB * 1024 * 1024) {
                reject(new Error(`Photo too large (${humanSize(compressedBlob.size)}) after compression. Maximum allowed is ${MAX_SIZE_MB}MB.`));
                return;
              }
              
              const ext = getExtensionFromMime(outputMime);
              console.log(`Image processed successfully: ${humanSize(compressedBlob.size)}, ${outputMime}`);
              
              resolve({
                blob: compressedBlob,
                mime: outputMime,
                ext
              });
            }, outputMime, FALLBACK_QUALITY);
          } else {
            if (blob.size > MAX_SIZE_MB * 1024 * 1024) {
              reject(new Error(`Photo too large (${humanSize(blob.size)}) after compression. Maximum allowed is ${MAX_SIZE_MB}MB.`));
              return;
            }
            
            const ext = getExtensionFromMime(outputMime);
            console.log(`Image processed successfully: ${humanSize(blob.size)}, ${outputMime}`);
            
            resolve({
              blob,
              mime: outputMime,
              ext
            });
          }
        }, outputMime, INITIAL_QUALITY);
        
      } catch (error) {
        console.error('Canvas processing error:', error);
        reject(new Error(`Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };
    
    // Load the image
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        img.src = e.target.result as string;
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

export async function prepareForUpload(fileOrAsset: any): Promise<PreparedImage> {
  console.log('prepareForUpload called with:', fileOrAsset);
  
  try {
    if (Platform.OS === 'web') {
      // Web: expect File object
      if (!(fileOrAsset instanceof File)) {
        throw new Error('Web platform expects File object');
      }
      return await prepareForUploadWeb(fileOrAsset);
    } else {
      // Mobile: expect asset object or URI string
      return await prepareForUploadMobile(fileOrAsset);
    }
  } catch (error) {
    console.error('prepareForUpload error:', error);
    throw error;
  }
}

export const imagePreprocessor = {
  prepareForUpload,
  isImageFile,
  humanSize
};

export default imagePreprocessor;