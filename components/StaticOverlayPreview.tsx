import React, { useRef, useEffect } from 'react';
import { ActionType, DEFAULT_CONFIG } from '../types';
import { removeBackgroundByColor, removeBackgroundByEdge } from '../utils/backgroundRemoval';

interface StaticOverlayPreviewProps {
  image: HTMLImageElement | null;
  selectedAction: ActionType;
  bgColor: { r: number, g: number, b: number } | null;
  tolerance: number;
  offsets: { x: number, y: number }[];
  removalMode: 'edge' | 'color';
}

const StaticOverlayPreview: React.FC<StaticOverlayPreviewProps> = ({
  image,
  selectedAction,
  bgColor,
  tolerance,
  offsets,
  removalMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const { colCount, rowCount, actionMap } = DEFAULT_CONFIG;
    const actionData = actionMap[selectedAction];
    const frameWidth = image.width / colCount;
    const frameHeight = image.height / rowCount;

    canvas.width = frameWidth;
    canvas.height = frameHeight;
    
    // 清空并绘制棋盘格背景
    ctx.clearRect(0, 0, frameWidth, frameHeight);
    const cellSize = 10;
    for (let r = 0; r < frameHeight / cellSize; r++) {
      for (let c = 0; c < frameWidth / cellSize; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#e2e8f0' : '#ffffff';
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
      }
    }

    // 用于处理每一帧的临时画布
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = frameWidth;
    tempCanvas.height = frameHeight;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    if (!tempCtx) return;

    // 循环遍历动作的所有帧
    for (let i = 0; i < actionData.frames; i++) {
      tempCtx.clearRect(0, 0, frameWidth, frameHeight);

      const srcX = i * frameWidth;
      const srcY = actionData.row * frameHeight;
      const offset = offsets[i] || { x: 0, y: 0 };

      // 将带偏移的帧绘制到临时画布
      tempCtx.drawImage(image, srcX, srcY, frameWidth, frameHeight, offset.x, offset.y, frameWidth, frameHeight);
      
      // 移除背景
      if (bgColor) {
        let imageData = tempCtx.getImageData(0, 0, frameWidth, frameHeight);
        if (removalMode === 'edge') {
          imageData = removeBackgroundByEdge(imageData, bgColor, tolerance);
        } else {
          imageData = removeBackgroundByColor(imageData, bgColor, tolerance);
        }
        tempCtx.putImageData(imageData, 0, 0);
      }
      
      // 将处理后的帧绘制到主画布上
      ctx.globalAlpha = 0.75; // 使用一点透明度以便观察重叠
      ctx.drawImage(tempCanvas, 0, 0);
      ctx.globalAlpha = 1.0;
    }
  }, [image, selectedAction, bgColor, tolerance, offsets, removalMode]);

  if (!image) {
    return null; // 如果没有图片则不渲染
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="border border-slate-300 rounded-lg overflow-hidden shadow-sm bg-white">
        <canvas ref={canvasRef} className="max-w-full h-auto object-contain" style={{ imageRendering: 'pixelated', maxHeight: '400px' }} />
      </div>
      <div className="text-xs text-slate-500 font-mono">
        帧对齐预览 (重叠)
      </div>
    </div>
  );
};

export default StaticOverlayPreview;
