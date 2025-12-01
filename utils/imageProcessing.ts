import { ProcessOptions, DEFAULT_CONFIG } from '../types';
import { removeBackgroundByColor, removeBackgroundByEdge } from './backgroundRemoval';

// Helper to load image
export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

// Main processing function
export const processSpriteSheet = async (
  image: HTMLImageElement,
  options: ProcessOptions
): Promise<Blob> => {
  const { rowCount, colCount } = DEFAULT_CONFIG;
  const srcFrameWidth = image.width / colCount;
  const srcFrameHeight = image.height / rowCount;

  // Create offscreen canvas for the full output sprite sheet
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) throw new Error('Cannot get canvas context');

  // Set dimensions to target size * grid size
  canvas.width = options.targetFrameWidth * colCount;
  canvas.height = options.targetFrameHeight * rowCount;

  // Temporary canvas to process individual frames (resizing + bg removal)
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = options.targetFrameWidth;
  tempCanvas.height = options.targetFrameHeight;
  const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });

  if (!tempCtx) throw new Error('Cannot get temp canvas context');

  // Use auto-detected background color
  const bgColor = options.bgColor;
  if (!bgColor) {
    throw new Error("Background color not detected");
  }


  // Iterate through all possible grid positions
  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      // Find action corresponding to row 'r' to get correct offsets
      const actionEntry = Object.entries(DEFAULT_CONFIG.actionMap).find(([, val]) => val.row === r);
      if (!actionEntry) continue; // Skip empty grid cells

      const actionKey = actionEntry[0];
      const actionData = actionEntry[1];

      // Only process frames that are part of an action
      if (c >= actionData.frames) continue;

      const actionOffsets = options.offsets[actionKey] || [];
      const offset = actionOffsets[c] || { x: 0, y: 0 };
      
      // Clear temp
      tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);

      // Draw resized source frame to temp canvas with offset
      tempCtx.drawImage(
        image,
        c * srcFrameWidth, r * srcFrameHeight, srcFrameWidth, srcFrameHeight,
        offset.x, offset.y, options.targetFrameWidth, options.targetFrameHeight
      );

      // Remove Background based on selected mode
      let frameData = tempCtx.getImageData(0, 0, options.targetFrameWidth, options.targetFrameHeight);
      if (options.removalMode === 'edge') {
        frameData = removeBackgroundByEdge(frameData, bgColor, options.tolerance);
      } else {
        frameData = removeBackgroundByColor(frameData, bgColor, options.tolerance);
      }
      tempCtx.putImageData(frameData, 0, 0);


      // Draw processed frame to main canvas
      ctx.drawImage(
        tempCanvas,
        c * options.targetFrameWidth, r * options.targetFrameHeight
      );
    }
  }

  // Compress to < 100KB
  let blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  
  if (!blob) throw new Error('Failed to generate image');

  let scale = 0.9;
  let attempts = 0;
  
  while (blob && blob.size > 100 * 1024 && attempts < 5) {
    const newWidth = Math.floor(canvas.width * scale);
    const newHeight = Math.floor(canvas.height * scale);

    const resizeCanvas = document.createElement('canvas');
    resizeCanvas.width = newWidth;
    resizeCanvas.height = newHeight;
    const resizeCtx = resizeCanvas.getContext('2d');
    
    if (resizeCtx) {
        resizeCtx.drawImage(canvas, 0, 0, newWidth, newHeight);
        blob = await new Promise<Blob | null>(resolve => resizeCanvas.toBlob(resolve, 'image/png'));
    }
    
    scale *= 0.9;
    attempts++;
  }

  if (!blob) throw new Error("Compression failed");
  return blob;
};
