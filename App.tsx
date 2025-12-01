import React, { useState } from 'react';
import { ActionType, DEFAULT_CONFIG } from './types';
import SpritePreview from './components/SpritePreview';
import { loadImage, processSpriteSheet } from './utils/imageProcessing';
import OffsetEditor from './components/OffsetEditor';
import StaticOverlayPreview from './components/StaticOverlayPreview';

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [selectedAction, setSelectedAction] = useState<ActionType>(ActionType.Idle);
  
  // Settings
  const [originalFrameSize, setOriginalFrameSize] = useState<{ w: number, h: number } | null>(null);
  const [targetSize, setTargetSize] = useState<{w: number, h: number}>({ w: 64, h: 64 });
  const [tolerance, setTolerance] = useState<number>(10);
  const [autoBgColor, setAutoBgColor] = useState<{r:number, g:number, b:number} | null>(null);
  const [offsets, setOffsets] = useState<Record<string, { x: number, y: number }[]>>({});
  const [removalMode, setRemovalMode] = useState<'edge' | 'color'>('edge');


  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [processedSize, setProcessedSize] = useState<number>(0);

  // Handle File Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      const url = URL.createObjectURL(f);
      try {
        const img = await loadImage(url);
        setImage(img);
        
        const frameW = img.width / DEFAULT_CONFIG.colCount;
        const frameH = img.height / DEFAULT_CONFIG.rowCount;
        setOriginalFrameSize({ w: frameW, h: frameH });
        
        const aspectRatio = frameW / frameH;
        setTargetSize({ h: 128, w: Math.round(128 * aspectRatio) });
        
        // Initialize offsets
        const initialOffsets: Record<string, {x: number; y: number}[]> = {};
        for(const action in DEFAULT_CONFIG.actionMap) {
            const frameCount = DEFAULT_CONFIG.actionMap[action].frames;
            initialOffsets[action] = Array(frameCount).fill(null).map(() => ({ x: 0, y: 0}));
        }
        setOffsets(initialOffsets);


        // Auto detect top-left pixel for BG removal
        const c = document.createElement('canvas');
        c.width = 1; c.height = 1;
        const ctx = c.getContext('2d');
        if (ctx) {
            ctx.drawImage(img, 0, 0, frameW, frameH, 0, 0, 1, 1);
            const p = ctx.getImageData(0,0,1,1).data;
            setAutoBgColor({ r: p[0], g: p[1], b: p[2] });
        }

        // Reset download
        setDownloadUrl(null);
      } catch (err) {
        console.error("Error loading image", err);
        alert("无法加载图片，请重试");
      }
    }
  };

  const handleTargetHeightChange = (h: number) => {
    if (!originalFrameSize) return;
    const aspectRatio = originalFrameSize.w / originalFrameSize.h;
    setTargetSize({
        h: h,
        w: Math.round(h * aspectRatio) || 0
    });
  };

  const handleTargetWidthChange = (w: number) => {
    if (!originalFrameSize) return;
    const aspectRatio = originalFrameSize.w / originalFrameSize.h;
    setTargetSize({
        w: w,
        h: Math.round(w / aspectRatio) || 0
    });
  };

  const handleOffsetChange = (frameIndex: number, axis: 'x' | 'y', value: number) => {
    setOffsets(prev => {
        const newActionOffsets = [...(prev[selectedAction] || [])];
        if (newActionOffsets[frameIndex]) {
            newActionOffsets[frameIndex] = { ...newActionOffsets[frameIndex], [axis]: value };
        }
        return {
            ...prev,
            [selectedAction]: newActionOffsets
        };
    });
  };


  const handleProcess = async () => {
    if (!image) return;
    setIsProcessing(true);
    setDownloadUrl(null);

    try {
        await new Promise(r => setTimeout(r, 100));

        const blob = await processSpriteSheet(image, {
            targetFrameWidth: targetSize.w,
            targetFrameHeight: targetSize.h,
            tolerance: tolerance,
            bgColor: autoBgColor,
            offsets: offsets,
            removalMode: removalMode,
        });

        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setProcessedSize(blob.size);
    } catch (e: any) {
        alert("处理失败: " + e.message);
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-screen-2xl mx-auto font-sans">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-500 bg-clip-text text-transparent mb-2">
          👾 SpriteMaster 精灵图工坊
        </h1>
        <p className="text-slate-500">上传、预览、去背、压缩 - 一站式游戏素材处理</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Upload & Settings */}
        <div className="lg:col-span-4 space-y-6">
            
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              📤 上传素材
            </h2>
            <div className="relative">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer"
              />
              <div className="mt-2 text-xs text-slate-400">
                支持格式: PNG, JPG (建议白色或纯色背景)
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
             <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              ⚙️ 处理设置
            </h2>
            
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">目标帧大小 (px)</label>
                    <div className="flex items-center gap-2">
                        <input 
                            type="number" 
                            value={targetSize.w}
                            onChange={(e) => handleTargetWidthChange(parseInt(e.target.value) || 0)}
                            className="w-full border-slate-300 rounded-md shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200 p-2 border"
                            disabled={!image}
                        />
                        <span className="text-slate-400">x</span>
                         <input 
                            type="number" 
                            value={targetSize.h}
                            onChange={(e) => handleTargetHeightChange(parseInt(e.target.value) || 0)}
                            className="w-full border-slate-300 rounded-md shadow-sm focus:border-purple-500 focus:ring focus:ring-purple-200 p-2 border"
                             disabled={!image}
                        />
                    </div>
                     {originalFrameSize && <p className="text-xs text-slate-400 mt-1">原始尺寸: {originalFrameSize.w}x{originalFrameSize.h}</p>}
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">去背模式</label>
                    <div className="flex items-center space-x-4">
                        <label className="flex items-center cursor-pointer">
                            <input type="radio" name="removalMode" value="edge" checked={removalMode === 'edge'} onChange={() => setRemovalMode('edge')} className="h-4 w-4 text-purple-600 border-gray-300 focus:ring-purple-500"/>
                            <span className="ml-2 text-sm text-slate-600">描边去背 (推荐)</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                            <input type="radio" name="removalMode" value="color" checked={removalMode === 'color'} onChange={() => setRemovalMode('color')} className="h-4 w-4 text-purple-600 border-gray-300 focus:ring-purple-500"/>
                            <span className="ml-2 text-sm text-slate-600">颜色去背</span>
                        </label>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">描边模式能防止误删与背景同色的主体部分。</p>
                </div>


                <div>
                    <div className="flex justify-between mb-1">
                        <label className="text-sm font-medium text-slate-700">去背容差</label>
                        <span className="text-xs text-slate-500">{tolerance}</span>
                    </div>
                    <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={tolerance}
                        onChange={(e) => setTolerance(Number(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                        disabled={!image}
                    />
                    <p className="text-xs text-slate-400 mt-1">值越大，去背范围越广（可能误删主体）</p>
                </div>
                
                {image && (
                    <div className="border-t border-slate-200 pt-4">
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            帧偏移 ({selectedAction})
                        </label>
                        <OffsetEditor
                            image={image}
                            selectedAction={selectedAction}
                            offsets={offsets[selectedAction] || []}
                            onOffsetChange={handleOffsetChange}
                        />
                        <p className="text-xs text-slate-400 mt-2">点击上方精灵图中的一帧进行偏移调整。</p>
                    </div>
                )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
             <button
                onClick={handleProcess}
                disabled={!image || isProcessing}
                className={`w-full py-3 px-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all
                    ${!image 
                        ? 'bg-slate-300 cursor-not-allowed' 
                        : isProcessing 
                            ? 'bg-purple-400 cursor-wait' 
                            : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:scale-[1.02] active:scale-95'
                    }`}
             >
                {isProcessing ? '⏳ 处理中...' : '🚀 生成并压缩'}
             </button>

             {downloadUrl && (
                 <div className="mt-4 pt-4 border-t border-slate-100 animate-fade-in">
                     <p className="text-sm text-green-600 font-semibold mb-2">✅ 处理完成!</p>
                     <p className="text-xs text-slate-500 mb-3">
                         文件大小: {(processedSize / 1024).toFixed(2)} KB 
                         {processedSize > 100 * 1024 && <span className="text-red-500 ml-1">(压缩未达标)</span>}
                     </p>
                     <a 
                        href={downloadUrl}
                        download="processed_sprite.png"
                        className="block w-full text-center py-2 px-4 border-2 border-green-500 text-green-600 rounded-lg hover:bg-green-50 font-semibold transition-colors"
                     >
                        ⬇️ 下载处理后的精灵图
                     </a>
                 </div>
             )}
          </div>
        </div>

        {/* Right Column: Preview */}
        <div className="lg:col-span-8 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 min-h-[500px] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800">🎬 实时预览</h2>
                    
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        {Object.values(ActionType).map((action) => (
                            <button
                                key={action}
                                onClick={() => setSelectedAction(action)}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-all
                                    ${selectedAction === action 
                                        ? 'bg-white text-purple-700 shadow-sm' 
                                        : 'text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {action}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 relative">
                    {!image && (
                         <div className="text-center text-slate-400">
                            <div className="text-6xl mb-4">🖼️</div>
                            <p>请在左侧上传精灵图以开始预览</p>
                            <p className="text-xs mt-2">格式要求：行1待机(4帧) / 行2受击(1帧) / 行3行走(4帧) / 行4攻击(5帧)</p>
                         </div>
                    )}
                    
                    {image && (
                        <div className="flex flex-col items-center justify-start gap-8 w-full">
                            <div className="w-full max-w-md flex justify-center">
                                <SpritePreview 
                                    image={image} 
                                    selectedAction={selectedAction} 
                                    bgColor={autoBgColor}
                                    tolerance={tolerance}
                                    offsets={offsets[selectedAction] || []}
                                    removalMode={removalMode}
                                />
                            </div>
                            <div className="w-full max-w-md flex justify-center">
                                <StaticOverlayPreview
                                    image={image}
                                    selectedAction={selectedAction}
                                    bgColor={autoBgColor}
                                    tolerance={tolerance}
                                    offsets={offsets[selectedAction] || []}
                                    removalMode={removalMode}
                                />
                            </div>
                        </div>
                    )}

                    {image && autoBgColor && (
                        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs text-slate-400 whitespace-nowrap bg-slate-50 px-2 rounded">
                            <span>识别背景色:</span>
                            <div 
                                className="w-4 h-4 rounded-full border border-slate-300 shadow-sm"
                                style={{ backgroundColor: `rgb(${autoBgColor.r},${autoBgColor.g},${autoBgColor.b})`}}
                            />
                        </div>
                    )}
                </div>

                <div className="mt-6 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm leading-relaxed">
                    <p className="font-bold mb-1">💡 使用说明:</p>
                    <ul className="list-disc list-inside space-y-1 text-blue-700/80">
                        <li>上传符合规范的精灵图，系统会自动识别单帧尺寸并设置默认缩放大小。</li>
                        <li>使用“描边去背”模式可防止误删角色主体。如果效果不佳，可切换为“颜色去背”。</li>
                        <li>在“处理设置”中点击精灵图选择单帧，并微调“帧偏移”来消除动画抖动。</li>
                        <li>下方的“帧对齐预览”会将所有帧叠加显示，方便观察对齐效果。</li>
                    </ul>
                </div>
            </div>
        </div>
      </div>
       <style>{`
            .custom-scrollbar::-webkit-scrollbar {
                width: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
                background: #f1f5f9;
                border-radius: 3px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
                background: #94a3b8;
                border-radius: 3px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #64748b;
            }
        `}</style>
    </div>
  );
};

export default App;
