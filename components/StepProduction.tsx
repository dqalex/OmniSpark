import React, { useState, useEffect } from 'react';
import { SceneConcept, AssetType, VideoHistoryItem, ImageHistoryItem } from '../types';
import { generateStoryVideo, fetchVideoUrl } from '../services/geminiService';
import { Button } from './ui/Button';

interface AIStudioClient {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

interface Props {
  image?: string; // Kept for legacy compatibility
  concept: SceneConcept;
  onAddToLibrary: (type: AssetType, content: any, meta?: any) => void;
  // History
  historyVideos: VideoHistoryItem[];
  onAddVideo: (vid: VideoHistoryItem) => void;
  historyImages?: ImageHistoryItem[];
}

export const StepProduction: React.FC<Props> = ({ 
    concept, 
    onAddToLibrary, 
    historyVideos, 
    onAddVideo,
    historyImages = []
}) => {
  const [activeVideo, setActiveVideo] = useState<VideoHistoryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [hasKey, setHasKey] = useState(false);
  
  // Script Editing State
  const [currentScript, setCurrentScript] = useState(concept.script);
  
  // Image Selection State (Multi-select)
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());

  // Filter images relevant to this concept AND video mode (production is only for video mode)
  const relevantImages = historyImages.filter(img => img.conceptId === concept.id && img.mode === 'video');

  // Initialize selection
  useEffect(() => {
      setCurrentScript(concept.script);
      if (relevantImages.length > 0) {
          setSelectedImageIds(new Set([relevantImages[0].id]));
      } else {
          setSelectedImageIds(new Set());
      }
  }, [concept.id, relevantImages.length]);

  const getAiStudio = (): AIStudioClient | undefined => (window as any).aistudio;

  useEffect(() => {
    const checkKey = async () => {
      const aiStudio = getAiStudio();
      if (aiStudio && await aiStudio.hasSelectedApiKey()) {
        setHasKey(true);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    const aiStudio = getAiStudio();
    if (aiStudio) {
      await aiStudio.openSelectKey();
      setHasKey(true);
    }
  };

  const toggleImageSelection = (id: string) => {
      const newSet = new Set(selectedImageIds);
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          // Limit to 3 (Veo Limit)
          if (newSet.size >= 3) {
              alert("Veo 模型目前最多支持 3 张参考图。请先取消一个选择。");
              return;
          }
          newSet.add(id);
      }
      setSelectedImageIds(newSet);
  };

  const handleGenerateVideo = async () => {
    if (selectedImageIds.size === 0) {
        alert("请至少选择一张参考图片");
        return;
    }

    setLoading(true);
    setStatus('正在初始化 Veo 模型 (Reference Mode)...');
    try {
      // Collect selected base64s
      const selectedImgs = relevantImages
          .filter(img => selectedImageIds.has(img.id))
          .map(img => img.base64);

      const uri = await generateStoryVideo(currentScript, selectedImgs);
      
      setStatus('正在下载视频流...');
      const blobUrl = await fetchVideoUrl(uri);
      
      const newVideo: VideoHistoryItem = {
          id: Date.now().toString(),
          uri: uri,
          blobUrl: blobUrl,
          productName: concept.productName,
          creativeDirection: concept.creativeDirection,
          conceptTitle: concept.title,
          createdAt: Date.now(),
          mode: 'video'
      };

      onAddVideo(newVideo);
      setActiveVideo(newVideo);

    } catch (e: any) {
      console.error("Veo Generation Error:", e);
      const errorMsg = e.toString();
      
      if (
        errorMsg.includes('Requested entity was not found') || 
        errorMsg.includes('403') || 
        errorMsg.includes('PERMISSION_DENIED')
      ) {
        setHasKey(false);
        setStatus('API Key 权限不足或无效，请重新选择。');
      } else {
        setStatus(`生成失败: ${e.message || '未知错误'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddToLibrary = () => {
      if (activeVideo) {
          onAddToLibrary('video', activeVideo.blobUrl, { 
              prompt: currentScript,
              mode: 'video',
              productName: concept.productName,
              conceptTitle: concept.title
          });
      }
  };

  if (!hasKey) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center bg-slate-900/50 rounded-xl border border-slate-700 p-6">
        <h2 className="text-sm font-bold text-white mb-2">需要生成权限</h2>
        <Button onClick={handleSelectKey} size="sm" className="w-full text-xs">选择 API Key</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      
      {/* 1. Preview Area */}
      <div className="bg-black rounded-xl overflow-hidden border border-slate-700 aspect-video relative flex items-center justify-center shadow-lg group flex-shrink-0">
        {loading ? (
          <div className="text-center z-10 px-4">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-green-400 font-mono text-xs">{status}</p>
          </div>
        ) : activeVideo ? (
          <video 
            src={activeVideo.blobUrl} 
            controls 
            autoPlay 
            loop 
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="text-center flex flex-col items-center">
             <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-500">▶</div>
             <p className="text-xs text-slate-500 mb-1">预览就绪</p>
             <p className="text-[10px] text-slate-600">选择下方分镜与脚本后开始生成</p>
          </div>
        )}

        {activeVideo && (
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="secondary" className="px-3 py-1 text-xs h-auto bg-black/50 backdrop-blur" onClick={handleAddToLibrary}>
                   + 加入库
                </Button>
            </div>
        )}
      </div>

      {/* 2. Controls Area (Script + Images) */}
      <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
          {/* Left: Script Editor */}
          <div className="flex flex-col gap-2 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
              <h3 className="text-xs font-bold text-green-400 flex items-center gap-2">
                  <span>📝</span> 编辑口播脚本
              </h3>
              <textarea
                  value={currentScript}
                  onChange={(e) => setCurrentScript(e.target.value)}
                  className="flex-1 w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-slate-300 focus:ring-1 focus:ring-green-500 resize-none custom-scrollbar"
                  placeholder="输入视频旁白/口播脚本..."
              />
          </div>

          {/* Right: Image Selector */}
          <div className="flex flex-col gap-2 bg-slate-950/50 p-3 rounded-xl border border-slate-800">
              <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-pink-400 flex items-center gap-2">
                      <span>🖼️</span> 选择参考分镜 ({selectedImageIds.size}/3)
                  </h3>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar grid grid-cols-2 gap-2 content-start">
                  {relevantImages.length === 0 && (
                      <div className="col-span-2 text-center text-slate-600 text-[10px] py-4">
                          暂无视觉素材，请返回上一步生成。
                      </div>
                  )}
                  {relevantImages.map(img => (
                      <div 
                        key={img.id}
                        onClick={() => toggleImageSelection(img.id)}
                        className={`aspect-video rounded overflow-hidden border relative cursor-pointer group transition-all ${selectedImageIds.has(img.id) ? 'border-green-500 ring-1 ring-green-500 opacity-100' : 'border-slate-800 opacity-60 hover:opacity-100'}`}
                      >
                          <img src={img.base64} className="w-full h-full object-cover" />
                          {/* Checkmark overlay */}
                          {selectedImageIds.has(img.id) && (
                              <div className="absolute top-1 right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center text-black text-[10px] font-bold">
                                  ✓
                              </div>
                          )}
                          <div className="absolute bottom-0 inset-x-0 bg-black/70 p-1 truncate text-[8px] text-slate-300">
                              {img.prompt.substring(0, 20)}...
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </div>

      {/* 3. Generate Button */}
      <div className="flex flex-col gap-2">
         {!activeVideo && !loading && (
            <Button onClick={handleGenerateVideo} disabled={selectedImageIds.size === 0 || !currentScript} className="w-full py-3 bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-500 hover:to-teal-500 border-none shadow-lg shadow-green-900/20">
              <span className="text-lg mr-2">🎬</span> 生成完整视频 (Veo)
            </Button>
         )}

         {activeVideo && (
             <div className="grid grid-cols-2 gap-2">
                 <Button variant="secondary" onClick={() => { setActiveVideo(null); handleGenerateVideo(); }} className="text-xs">
                    重新生成
                 </Button>
                 <a href={activeVideo.blobUrl} download="bizarre_ad.mp4" className="w-full">
                    <Button className="w-full text-xs">下载视频</Button>
                 </a>
             </div>
         )}
      </div>

       {/* 4. Categorized History (Collapsible or Small) */}
       <div className="h-32 flex-shrink-0 overflow-y-auto custom-scrollbar border-t border-slate-800 pt-2">
          <h3 className="text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-wider">历史生成记录</h3>
          <div className="space-y-2">
               {/* Group by Product/Concept */}
               {Array.from(new Set(historyVideos.filter(v => v.mode === 'video').map(v => v.productName + v.conceptTitle))).map(key => {
                   const groupVids = historyVideos.filter(v => (v.productName + v.conceptTitle) === key && v.mode === 'video');
                   const meta = groupVids[0];
                   return (
                       <div key={key} className="space-y-1">
                            <div className="text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded inline-block mb-1">
                                {meta.productName}
                            </div>
                            <div className="grid grid-cols-1 gap-1">
                                {groupVids.map((vid, idx) => (
                                    <div 
                                        key={vid.id} 
                                        onClick={() => setActiveVideo(vid)}
                                        className={`flex items-center gap-3 p-2 rounded cursor-pointer border ${activeVideo?.id === vid.id ? 'bg-green-900/20 border-green-500' : 'bg-slate-900 border-slate-800 hover:border-slate-600'}`}
                                    >
                                        <div className="w-6 h-6 bg-black rounded flex items-center justify-center text-[8px] text-slate-500">Vid</div>
                                        <div className="flex-1">
                                            <div className="text-[10px] text-slate-400">Ver {groupVids.length - idx}</div>
                                            <div className="text-[8px] text-slate-600">{new Date(vid.createdAt).toLocaleTimeString()}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                       </div>
                   )
               })}
          </div>
       </div>
    </div>
  );
};