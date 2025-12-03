import React, { useRef, useEffect } from 'react';
import { ActionType, DEFAULT_CONFIG } from '../types';

interface OffsetEditorProps {
  image: HTMLImageElement;
  selectedAction: ActionType;
  offsets: { x: number; y: number }[];
  onOffsetChange: (frameIndex: number, axis: 'x' | 'y', value: number) => void;
  selectedFrame: number;
  onFrameSelect: (index: number) => void;
}

const OffsetEditor: React.FC<OffsetEditorProps> = ({
  image,
  selectedAction,
  offsets,
  onOffsetChange,
  selectedFrame,
  onFrameSelect,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { colCount, rowCount, actionMap } = DEFAULT_CONFIG;
  const frameWidth = image.width / colCount;
  const frameHeight = image.height / rowCount;
  const actionData = actionMap[selectedAction];

  // 绘制带有高亮的画布
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = image.width;
    canvas.height = image.height;

    // 绘制完整精灵图
    ctx.drawImage(image, 0, 0);
    
    // 为非活动行添加半透明遮罩
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    for(let r = 0; r < rowCount; r++) {
        if (r !== actionData.row) {
            ctx.fillRect(0, r * frameHeight, image.width, frameHeight);
        }
    }

    // 高亮活动行
    ctx.strokeStyle = '#6d28d9'; // purple-700
    ctx.lineWidth = 4;
    ctx.strokeRect(2, actionData.row * frameHeight + 2, image.width - 4, frameHeight - 4);

    // 高亮选中的帧
    if (selectedFrame < actionData.frames) {
        ctx.strokeStyle = '#0ea5e9'; // sky-500
        ctx.lineWidth = 4;
        ctx.strokeRect(
            selectedFrame * frameWidth + 2,
            actionData.row * frameHeight + 2,
            frameWidth - 4,
            frameHeight - 4
        );
    }

  }, [image, selectedAction, selectedFrame, actionData, frameWidth, frameHeight, rowCount]);
  
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const clickedCol = Math.floor(x / frameWidth);
    const clickedRow = Math.floor(y / frameHeight);

    if (clickedRow === actionData.row && clickedCol < actionData.frames) {
        onFrameSelect(clickedCol);
    }
  };

  const currentOffset = offsets[selectedFrame] || { x: 0, y: 0 };

  return (
    <div>
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="w-full h-auto border border-slate-300 rounded-lg cursor-pointer"
        style={{ imageRendering: 'pixelated' }}
        aria-label="精灵图帧选择器"
      />
      <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
         <div className="space-y-2">
            <span className="font-mono text-sm font-semibold text-slate-600">帧 {selectedFrame + 1}</span>
            <div className="grid grid-cols-[2rem_1fr] items-center gap-x-2 text-sm">
                <label htmlFor={`offset-x-editor`} className="text-slate-500 text-right font-medium">X:</label>
                <input
                    id={`offset-x-editor`}
                    type="number"
                    value={currentOffset.x}
                    onChange={(e) => onOffsetChange(selectedFrame, 'x', parseInt(e.target.value) || 0)}
                    className="w-full border-slate-300 rounded-md shadow-sm p-1 border text-center"
                />
            </div>
            <div className="grid grid-cols-[2rem_1fr] items-center gap-x-2 text-sm">
                <label htmlFor={`offset-y-editor`} className="text-slate-500 text-right font-medium">Y:</label>
                <input
                    id={`offset-y-editor`}
                    type="number"
                    value={currentOffset.y}
                    onChange={(e) => onOffsetChange(selectedFrame, 'y', parseInt(e.target.value) || 0)}
                    className="w-full border-slate-300 rounded-md shadow-sm p-1 border text-center"
                />
            </div>
        </div>
      </div>
    </div>
  );
};

export default OffsetEditor;
