import React, { useRef, useEffect, useState } from 'react';
import { ActionType, DEFAULT_CONFIG } from '../types';
import { removeBackgroundByColor, removeBackgroundByEdge } from '../utils/backgroundRemoval';


interface SpritePreviewProps {
  image: HTMLImageElement | null;
  selectedAction: ActionType;
  className?: string;
  bgColor: { r: number, g: number, b: number } | null;
  tolerance: number;
  offsets: { x: number, y: number }[];
  removalMode: 'edge' | 'color';
}

const SpritePreview: React.FC<SpritePreviewProps> = ({ 
  image, 
  selectedAction, 
  className,
  bgColor,
  tolerance,
  offsets,
  removalMode
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const frameIndexRef = useRef(0); // 使用 ref 来处理动画循环
  const lastTimeRef = useRef<number>(0);
  const [displayFrameIndex, setDisplayFrameIndex] = useState(0); // 仅用于UI显示

  const FPS = 8;
  const interval = 1000 / FPS;

  // 当动作或图片变化时，重置帧索引
  useEffect(() => {
    frameIndexRef.current = 0;
    setDisplayFrameIndex(0);
    lastTimeRef.current = 0;
  }, [selectedAction, image]);

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

    let isCancelled = false;

    const render = (time: number) => {
      if (isCancelled) return;

      if (actionData.frames > 1 && time - lastTimeRef.current > interval) {
        lastTimeRef.current = time;
        frameIndexRef.current = (frameIndexRef.current + 1) % actionData.frames;
        setDisplayFrameIndex(frameIndexRef.current);
      }

      ctx.clearRect(0, 0, frameWidth, frameHeight);
      
      const cellSize = 10;
      for(let r=0; r<frameHeight/cellSize; r++) {
        for(let c=0; c<frameWidth/cellSize; c++) {
            ctx.fillStyle = (r+c)%2 === 0 ? '#e2e8f0' : '#ffffff';
            ctx.fillRect(c*cellSize, r*cellSize, cellSize, cellSize);
        }
      }

      const currentFrame = frameIndexRef.current;
      const srcX = currentFrame * frameWidth;
      const srcY = actionData.row * frameHeight;
      const offset = (offsets && offsets[currentFrame]) ? offsets[currentFrame] : { x: 0, y: 0 };

      const tempC = document.createElement('canvas');
      tempC.width = frameWidth;
      tempC.height = frameHeight;
      const tempCtx = tempC.getContext('2d', { willReadFrequently: true });
      
      if (tempCtx) {
          tempCtx.drawImage(image, srcX, srcY, frameWidth, frameHeight, offset.x, offset.y, frameWidth, frameHeight);
          
          if (bgColor) {
             let idata = tempCtx.getImageData(0,0, frameWidth, frameHeight);
             if (removalMode === 'edge') {
                idata = removeBackgroundByEdge(idata, bgColor, tolerance);
             } else {
                idata = removeBackgroundByColor(idata, bgColor, tolerance);
             }
             tempCtx.putImageData(idata, 0, 0);
          }
          
          ctx.drawImage(tempC, 0, 0);
      }

      requestRef.current = requestAnimationFrame(render);
    };

    requestRef.current = requestAnimationFrame(render);

    return () => {
      isCancelled = true;
      cancelAnimationFrame(requestRef.current);
    };
  }, [image, selectedAction, bgColor, tolerance, offsets, removalMode]); // 移除了对帧索引的依赖

  if (!image) {
    return (
      <div className={`flex items-center justify-center bg-slate-200 rounded-lg border-2 border-dashed border-slate-400 text-slate-500 ${className}`}>
        <p>无预览</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="border border-slate-300 rounded-lg overflow-hidden shadow-sm bg-white">
         <canvas ref={canvasRef} className="max-w-full h-auto object-contain" style={{ imageRendering: 'pixelated', maxHeight: '400px' }} />
      </div>
      <div className="text-xs text-slate-500 font-mono">
        动画预览 | 动作: {selectedAction} | 帧: {displayFrameIndex + 1}
      </div>
    </div>
  );
};

export default SpritePreview;
