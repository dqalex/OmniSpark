import React, { useEffect, useState } from 'react';
import { SceneConcept, AssetType, ImageHistoryItem, AppMode } from '../types';
import { generateSceneImage, editSceneImage, generateStoryboardShots } from '../services/geminiService';
import { Button } from './ui/Button';

interface Props {
  concept: SceneConcept;
  productImages?: string[]; // Updated to accept array
  onAddToLibrary: (type: AssetType, content: any, meta?: any) => void;
  // History
  historyImages: ImageHistoryItem[];
  onAddImage: (img: ImageHistoryItem) => void;
  currentMode: AppMode; // Added
}

interface StoryboardShot {
    label: string;
    base64: string;
    instruction: string;
}

export const StepVisualizer: React.FC<Props> = ({ concept, productImages, onAddToLibrary, historyImages, onAddImage, currentMode }) => {
  const [activeImageId, setActiveImageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  // Editing state
  const [editInstruction, setEditInstruction] = useState('');
  const [uploadRefImage, setUploadRefImage] = useState<string | null>(null);

  // Storyboard Generation State
  const [isSceneConfirmed, setIsSceneConfirmed] = useState(false);
  const [storyboardShots, setStoryboardShots] = useState<StoryboardShot[]>([]);
  const [generatingStoryboard, setGeneratingStoryboard] = useState(false);

  // Single Shot Regeneration State
  const [editingShotIdx, setEditingShotIdx] = useState<number | null>(null);
  const [tempInstruction, setTempInstruction] = useState('');
  const [regeneratingShotIdx, setRegeneratingShotIdx] = useState<number | null>(null);

  // Aspect Ratio State
  const [aspectRatio, setAspectRatio] = useState<string>('9:16');

  // Set default aspect ratio based on mode
  useEffect(() => {
    if (currentMode === 'image') {
        setAspectRatio('1:1');
    } else if (currentMode === 'pdp') {
        setAspectRatio('9:16'); // Vertical for mobile shopping
    } else {
        setAspectRatio('9:16'); // Default for video
    }
  }, [currentMode]);

  // STRICT Filter for current concept and mode
  // This ensures images from other modes or concepts don't leak
  const currentHistoryImages = historyImages.filter(i => i.conceptId === concept.id && i.mode === currentMode);
  
  // Find the active image object
  const activeImage = currentHistoryImages.find(i => i.id === activeImageId);
  
  useEffect(() => {
    // Reset confirmation state when concept changes
    setIsSceneConfirmed(false);
    setStoryboardShots([]);
    setEditingShotIdx(null);
    setActiveImageId(null); // Reset active image

    // If we have history for this concept, auto-select the latest one
    if (currentHistoryImages.length > 0) {
        setActiveImageId(currentHistoryImages[0].id);
    }
  }, [concept.id, currentMode]); 

  const handleGenerateMainVisual = async (overrideRatio?: string) => {
      setLoading(true);
      const ratio = overrideRatio || aspectRatio;
      setStatus(productImages && productImages.length > 0 ? `正在基于产品图生成场景 (${ratio})...` : `正在生成主视觉场景 (${ratio})...`);
      
      try {
        const result = await generateSceneImage(concept.visualPrompt, productImages, ratio);
        const newItem: ImageHistoryItem = {
            id: Date.now().toString(),
            base64: result,
            prompt: concept.visualPrompt,
            productName: concept.productName,
            creativeDirection: concept.creativeDirection,
            conceptTitle: concept.title,
            conceptId: concept.id,
            createdAt: Date.now(),
            mode: currentMode
        };
        onAddImage(newItem);
        setActiveImageId(newItem.id);

      } catch (e: any) {
        console.error(e);
        if (e.toString().includes('403') || e.toString().includes('PERMISSION_DENIED')) {
            setStatus('权限错误 (403): 请在顶部重新选择 API Key');
        } else {
            setStatus(`图片生成失败: ${e.message}`);
        }
      } finally {
        setLoading(false);
      }
  };

  // Function to manually trigger regen when ratio changes
  const handleRatioChange = async (newRatio: string) => {
      setAspectRatio(newRatio);
      handleGenerateMainVisual(newRatio);
  };

  const handleEdit = async () => {
    if (!activeImage || !editInstruction) return;
    setLoading(true);
    setStatus('AI 正在编辑场景...');
    try {
      const result = await editSceneImage(activeImage.base64, editInstruction, uploadRefImage || undefined, aspectRatio);
      
      const newItem: ImageHistoryItem = {
        id: Date.now().toString(),
        base64: result,
        prompt: `Edit: ${editInstruction}`,
        productName: concept.productName,
        creativeDirection: concept.creativeDirection,
        conceptTitle: concept.title,
        conceptId: concept.id,
        createdAt: Date.now(),
        mode: currentMode
      };
      
      onAddImage(newItem);
      setActiveImageId(newItem.id);
      
      setEditInstruction('');
      setUploadRefImage(null);
    } catch (e: any) {
      console.error(e);
      setStatus('编辑失败: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAndGenerateStoryboard = async () => {
      if (!activeImage) return;
      setIsSceneConfirmed(true);
      setGeneratingStoryboard(true);
      
      try {
          const shots = await generateStoryboardShots(activeImage.base64, concept.storyboard, productImages, currentMode, aspectRatio);
          setStoryboardShots(shots);

          // Add these shots to global history too
          shots.forEach(shot => {
             onAddImage({
                id: Date.now().toString() + Math.random(),
                base64: shot.base64,
                prompt: `Storyboard: ${shot.label}`,
                productName: concept.productName,
                creativeDirection: concept.creativeDirection,
                conceptTitle: concept.title,
                conceptId: concept.id,
                createdAt: Date.now(),
                mode: currentMode
             });
          });

      } catch (e) {
          console.error(e);
      } finally {
          setGeneratingStoryboard(false);
      }
  };

  const handleOpenRegen = (index: number, instruction: string) => {
      setEditingShotIdx(index);
      setTempInstruction(instruction);
  };

  const handleRegenerateShot = async (index: number) => {
      if (!activeImage) return;
      
      setEditingShotIdx(null); // Close edit view
      setRegeneratingShotIdx(index); // Show loading on this card
      
      try {
          const refImg = productImages && productImages.length > 0 ? productImages[0] : undefined;
          
          // Re-run with aspectRatio
          const newBase64 = await editSceneImage(activeImage.base64, tempInstruction, refImg, aspectRatio);
          
          setStoryboardShots(prev => {
              const updated = [...prev];
              updated[index] = {
                  ...updated[index],
                  base64: newBase64,
                  instruction: tempInstruction
              };
              return updated;
          });

          // Also update global history for this shot
          onAddImage({
                id: Date.now().toString() + Math.random(),
                base64: newBase64,
                prompt: `Regen Storyboard: ${storyboardShots[index].label}`,
                productName: concept.productName,
                creativeDirection: concept.creativeDirection,
                conceptTitle: concept.title,
                conceptId: concept.id,
                createdAt: Date.now(),
                mode: currentMode
          });

      } catch (e) {
          console.error("Failed to regenerate shot", e);
          alert("分镜生成失败，请重试");
      } finally {
          setRegeneratingShotIdx(null);
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadRefImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleAddToLibrary = (imgBase64: string, prompt: string) => {
      onAddToLibrary('image', imgBase64, { 
          prompt,
          mode: currentMode,
          productName: concept.productName,
          conceptTitle: concept.title
      });
  };

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* 1. Main Visual Preview Area */}
      <div className="flex flex-col gap-2 flex-shrink-0">
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
                {isSceneConfirmed ? '✅ 已锁定主视觉' : '🎨 主视觉设计'}
            </h3>

            <div className="flex items-center gap-2">
                {/* Aspect Ratio Selector - ONLY visible in Video mode and not confirmed */}
                {!isSceneConfirmed && currentMode === 'video' && (
                    <div className="flex bg-slate-900 rounded p-0.5 border border-slate-700">
                        <button 
                            onClick={() => handleRatioChange('9:16')}
                            className={`px-2 py-0.5 text-[10px] rounded ${aspectRatio === '9:16' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            9:16
                        </button>
                        <button 
                            onClick={() => handleRatioChange('16:9')}
                            className={`px-2 py-0.5 text-[10px] rounded ${aspectRatio === '16:9' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        >
                            16:9
                        </button>
                    </div>
                )}
                
                {/* Static Ratio Labels for other modes */}
                {!isSceneConfirmed && currentMode === 'image' && <span className="text-[10px] text-slate-500 border border-slate-800 px-2 rounded">1:1</span>}
                {!isSceneConfirmed && currentMode === 'pdp' && <span className="text-[10px] text-slate-500 border border-slate-800 px-2 rounded">竖屏</span>}

                {isSceneConfirmed && (
                    <button onClick={() => setIsSceneConfirmed(false)} className="text-[10px] text-slate-400 hover:text-white underline">
                        重新编辑
                    </button>
                )}
            </div>
          </div>
          
          <div className={`bg-black rounded-xl border ${isSceneConfirmed ? 'border-green-500/50' : 'border-slate-700'} min-h-[200px] aspect-video flex items-center justify-center relative overflow-hidden group shadow-inner`}>
            {loading && (
            <div className="absolute inset-0 z-10 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
                <div className="w-10 h-10 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-pink-400 font-mono text-xs animate-pulse">{status}</p>
            </div>
            )}
            
            {activeImage ? (
            <img 
                src={activeImage.base64} 
                alt="Main Visual" 
                className="w-full h-full object-contain" 
            />
            ) : (
                !loading && (
                    <div className="flex flex-col items-center justify-center p-6 text-center">
                        <div className="text-4xl mb-3">🎨</div>
                        <p className="text-sm text-slate-300 font-bold mb-2">生成主视觉</p>
                        <p className="text-xs text-slate-500 mb-4">基于选定的创意方案，生成第一版视觉设计稿</p>
                        <Button onClick={() => handleGenerateMainVisual()} className="bg-pink-600 hover:bg-pink-500 border-none">
                            开始生成
                        </Button>
                    </div>
                )
            )}

            {activeImage && (
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                    <Button variant="secondary" className="px-3 py-1 text-xs h-auto bg-black/50 backdrop-blur" onClick={() => handleAddToLibrary(activeImage.base64, activeImage.prompt)}>
                    + 加入库
                    </Button>
                </div>
            )}
          </div>
          
          {/* Indicate if product image is being used */}
          {productImages && productImages.length > 0 && !isSceneConfirmed && (
              <div className="flex items-center gap-2 text-[10px] text-blue-400 bg-blue-900/10 p-2 rounded border border-blue-900/30">
                  <span>ℹ️</span> 正在使用 {productImages.length} 张产品参考图进行生成
              </div>
          )}
      </div>

      {/* 2. Controls / Storyboard Generation */}
      {isSceneConfirmed ? (
         /* Storyboard View */
         <div className="flex-1 flex flex-col min-h-0 animate-fade-in">
             <div className="flex items-center gap-2 mb-3">
                 <h3 className="text-xs font-bold text-pink-400 uppercase tracking-wider">
                     {currentMode === 'video' ? '🎬 分镜镜头 (Storyboard)' : currentMode === 'image' ? '📸 系列创意 (Series)' : '📑 详情页板块 (Sections)'}
                 </h3>
                 {generatingStoryboard && <span className="text-[10px] text-slate-400 animate-pulse">正在根据方案生成...</span>}
             </div>
             
             <div className="grid grid-cols-2 gap-3 overflow-y-auto custom-scrollbar pr-2 pb-2">
                 {generatingStoryboard && storyboardShots.length === 0 && (
                     [1,2,3,4].map(i => (
                         <div key={i} className="aspect-video bg-slate-900/50 rounded-lg animate-pulse border border-slate-800"></div>
                     ))
                 )}

                 {storyboardShots.map((shot, idx) => (
                     <div key={idx} className="relative group rounded-lg overflow-hidden border border-slate-800 bg-black min-h-[120px]">
                         
                         {/* Image */}
                         <img 
                            src={shot.base64} 
                            alt={shot.label} 
                            className={`w-full h-full object-cover transition-opacity cursor-pointer ${regeneratingShotIdx === idx ? 'opacity-30' : 'opacity-80 group-hover:opacity-100'}`}
                            onClick={() => { setActiveImageId(null); }}
                         />

                         {/* Loading Overlay */}
                         {regeneratingShotIdx === idx && (
                             <div className="absolute inset-0 flex items-center justify-center">
                                 <div className="w-6 h-6 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                             </div>
                         )}

                         {/* Edit Overlay */}
                         {editingShotIdx === idx ? (
                             <div className="absolute inset-0 bg-slate-900/95 p-3 flex flex-col z-20">
                                 <h4 className="text-[10px] font-bold text-slate-400 mb-1">编辑生成指令:</h4>
                                 <textarea
                                    value={tempInstruction}
                                    onChange={(e) => setTempInstruction(e.target.value)}
                                    className="flex-1 w-full bg-black border border-slate-700 rounded p-1 text-[10px] text-white resize-none focus:border-pink-500 outline-none mb-2"
                                 />
                                 <div className="flex gap-2">
                                     <button onClick={() => setEditingShotIdx(null)} className="flex-1 bg-slate-800 text-slate-400 text-[10px] py-1 rounded hover:bg-slate-700">取消</button>
                                     <button onClick={() => handleRegenerateShot(idx)} className="flex-1 bg-pink-600 text-white text-[10px] py-1 rounded hover:bg-pink-500">重绘</button>
                                 </div>
                             </div>
                         ) : (
                             /* Hover Actions */
                             <div className="absolute inset-0 flex flex-col justify-between p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto bg-black/40">
                                 <div className="flex justify-end gap-1">
                                    <button 
                                        onClick={() => handleOpenRegen(idx, shot.instruction)}
                                        className="w-6 h-6 rounded bg-blue-600/80 text-white flex items-center justify-center hover:bg-blue-500 backdrop-blur"
                                        title="编辑指令并重绘"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                        </svg>
                                    </button>
                                    <button onClick={() => handleAddToLibrary(shot.base64, shot.label)} className="w-6 h-6 rounded bg-slate-800/80 text-white flex items-center justify-center hover:bg-slate-700 backdrop-blur">+</button>
                                 </div>
                                 
                                 <div>
                                    <div className="text-[10px] text-white font-bold drop-shadow-md mb-1">{shot.label}</div>
                                    {currentMode === 'video' && (
                                        <Button size="sm" className="w-full h-6 px-2 text-[10px] bg-pink-600/80 hover:bg-pink-500 backdrop-blur border-none" onClick={() => onAddImage({
                                            id: Date.now().toString(),
                                            base64: shot.base64,
                                            prompt: shot.label,
                                            productName: concept.productName,
                                            creativeDirection: concept.creativeDirection,
                                            conceptTitle: concept.title,
                                            conceptId: concept.id,
                                            createdAt: Date.now(),
                                            mode: currentMode
                                        })}>
                                            用作视频源
                                        </Button>
                                    )}
                                 </div>
                             </div>
                         )}
                     </div>
                 ))}
             </div>
         </div>
      ) : (
         /* Editing View */
         <div className="flex flex-col gap-4">
            {activeImage && (
             <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                <h3 className="text-xs font-bold text-white mb-3">调整主视觉</h3>
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <label className={`flex-1 cursor-pointer border border-dashed rounded px-3 py-2 text-center transition-colors text-xs flex items-center justify-center gap-2 ${uploadRefImage ? 'bg-green-900/20 border-green-500/50 text-green-400' : 'bg-slate-900 border-slate-700 text-slate-500 hover:border-pink-500/50'}`}>
                            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                            {uploadRefImage ? '图片已加载 (点击更换)' : '上传参考图 (可选)'}
                        </label>
                    </div>
                    <textarea
                        value={editInstruction}
                        onChange={(e) => setEditInstruction(e.target.value)}
                        placeholder="修改指令：例如 '添加霓虹灯光' 或 '把背景换成...'"
                        className="w-full bg-slate-900 border border-slate-700 rounded p-3 text-xs text-white focus:ring-1 focus:ring-pink-500 resize-none"
                        rows={2}
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <Button onClick={handleEdit} disabled={!editInstruction || loading} className="w-full text-xs" variant="secondary">
                            应用修改
                        </Button>
                        <Button 
                            onClick={handleConfirmAndGenerateStoryboard} 
                            disabled={!activeImage || loading} 
                            className="w-full text-xs bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 border-none"
                        >
                            {currentMode === 'video' ? '确定场景 & 生成分镜' : currentMode === 'image' ? '生成系列海报' : '生成详情页切片'}
                        </Button>
                    </div>
                </div>
             </div>
            )}

             {/* Brief History of Edits (Strictly Filtered) */}
             {currentHistoryImages.length > 0 && (
                <div className="flex-1 overflow-y-auto custom-scrollbar pt-2">
                    <h3 className="text-[10px] font-bold text-slate-500 mb-2 uppercase">修改历史</h3>
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {currentHistoryImages.map(img => (
                            <div 
                                key={img.id}
                                onClick={() => setActiveImageId(img.id)}
                                className={`w-16 h-16 flex-shrink-0 rounded border cursor-pointer overflow-hidden ${activeImageId === img.id ? 'border-pink-500 ring-1 ring-pink-500' : 'border-slate-800 opacity-60 hover:opacity-100'}`}
                            >
                                <img src={img.base64} className="w-full h-full object-cover" />
                            </div>
                        ))}
                    </div>
                </div>
             )}
         </div>
      )}
    </div>
  );
};