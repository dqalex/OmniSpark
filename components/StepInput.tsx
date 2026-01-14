import React, { useState, useEffect } from 'react';
import { ProductInfo, ProductHistoryItem } from '../types';
import { Button } from './ui/Button';
import { generateProductDescription } from '../services/geminiService';

interface Props {
  onNext: (info: ProductInfo) => void;
}

const DIRECTIONS = [
  '猎奇吸睛',
  '强化用户痛点',
  '产品效果展示',
  '情感共鸣',
  '未来科技感'
];

const HISTORY_KEY = 'bizarre_ad_product_history';
const MAX_IMAGES = 4;

export const StepInput: React.FC<Props> = ({ onNext }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [direction, setDirection] = useState(DIRECTIONS[0]);
  const [isAiWriting, setIsAiWriting] = useState(false);
  const [userImages, setUserImages] = useState<string[]>([]);
  
  // Product Library State
  const [history, setHistory] = useState<ProductHistoryItem[]>([]);

  // Load history on mount
  useEffect(() => {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) {
          try {
              const parsed = JSON.parse(saved);
              // Migrate old history items that might have single 'userImage'
              const migrated = parsed.map((item: any) => ({
                  ...item,
                  userImages: item.userImages || (item.userImage ? [item.userImage] : [])
              }));
              setHistory(migrated);
          } catch (e) {
              console.error("Failed to parse product history", e);
          }
      }
  }, []);

  const saveToHistory = () => {
      const newItem: ProductHistoryItem = {
          id: Date.now().toString(),
          name,
          description,
          userImages: userImages,
          timestamp: Date.now(),
          isPinned: false
      };

      setHistory(prev => {
          // Check for exact duplicates (Name + Desc + Images)
          // Simplified check: just name and description + image count
          const existingIndex = prev.findIndex(item => 
              item.name === newItem.name && 
              item.description === newItem.description && 
              JSON.stringify(item.userImages) === JSON.stringify(newItem.userImages)
          );

          let updatedHistory = [...prev];

          if (existingIndex > -1) {
              // Exact match found: update timestamp (move to top of its section)
              // Preserve pinned status
              const existingItem = updatedHistory[existingIndex];
              updatedHistory.splice(existingIndex, 1);
              updatedHistory.unshift({
                  ...existingItem,
                  timestamp: Date.now()
              });
          } else {
              // No exact match: Add new item
              updatedHistory.unshift(newItem);
          }

          // Persist
          localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
          return updatedHistory;
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name && description && direction) {
      saveToHistory(); // Auto-record
      onNext({ 
          name, 
          description, 
          creativeDirection: direction,
          userImages: userImages.length > 0 ? userImages : undefined 
      });
    }
  };

  const handleAiWrite = async () => {
    if (!name) return;
    setIsAiWriting(true);
    try {
        const desc = await generateProductDescription(name);
        setDescription(desc);
    } catch (e) {
        console.error(e);
    } finally {
        setIsAiWriting(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
          const remainingSlots = MAX_IMAGES - userImages.length;
          // Cast explicitly to allow iteration and file access without type errors
          const filesToProcess = Array.from(files).slice(0, remainingSlots);
          
          filesToProcess.forEach((file) => {
              const reader = new FileReader();
              reader.onloadend = () => {
                  setUserImages(prev => {
                      if (prev.length >= MAX_IMAGES) return prev;
                      return [...prev, reader.result as string];
                  });
              };
              // Ensure file is treated as Blob/File
              reader.readAsDataURL(file as Blob);
          });
      }
      e.target.value = '';
  };

  const removeImage = (index: number) => {
      setUserImages(prev => prev.filter((_, i) => i !== index));
  };

  // Library Actions
  const handleApply = (item: ProductHistoryItem) => {
      setName(item.name);
      setDescription(item.description);
      setUserImages(item.userImages || []);
  };

  const handlePin = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setHistory(prev => {
          const updated = prev.map(item => 
              item.id === id ? { ...item, isPinned: !item.isPinned } : item
          );
          localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
          return updated;
      });
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setHistory(prev => {
          const updated = prev.filter(item => item.id !== id);
          localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
          return updated;
      });
  };

  // Sort: Pinned first, then by timestamp descending
  const sortedHistory = [...history].sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      return b.timestamp - a.timestamp;
  });

  return (
    <div className="flex flex-col h-full gap-6">
        {/* Form Section */}
        <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in flex-shrink-0">
        <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">商品名称</label>
            <div className="relative">
                <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-purple-500 focus:outline-none transition-all placeholder-slate-600"
                placeholder="例如：全自动复古咖啡机"
                required
                />
            </div>
        </div>

        <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">商品参考图 (可选 1-{MAX_IMAGES} 张)</label>
            <div className="grid grid-cols-4 gap-2">
                {userImages.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-slate-700 group">
                         <img src={img} alt={`Product ${idx}`} className="w-full h-full object-cover" />
                         <button 
                            type="button"
                            onClick={() => removeImage(idx)}
                            className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs"
                         >
                             删除
                         </button>
                    </div>
                ))}
                
                {userImages.length < MAX_IMAGES && (
                    <label className="cursor-pointer border border-dashed border-slate-700 hover:border-purple-500 hover:bg-slate-900 transition-colors rounded-lg aspect-square flex flex-col items-center justify-center text-center gap-1 group">
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" multiple />
                        <span className="text-xl group-hover:scale-110 transition-transform">📷</span>
                        <span className="text-[8px] text-slate-500 group-hover:text-purple-400">添加图片</span>
                    </label>
                )}
            </div>
            <p className="text-[10px] text-slate-600 mt-1">
                * 上传不同视角的图片，帮助模型更全面理解产品形态。
            </p>
        </div>

        <div>
            <div className="flex justify-between items-end mb-1">
                <label className="block text-xs font-medium text-slate-400">商品描述</label>
                <button
                    type="button"
                    onClick={handleAiWrite}
                    disabled={!name || isAiWriting}
                    className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    {isAiWriting ? (
                        <>
                            <span className="w-3 h-3 border border-purple-400 border-t-transparent rounded-full animate-spin"></span>
                            AI 撰写中...
                        </>
                    ) : (
                        <>
                            <span>✨</span> AI 帮我写描述
                        </>
                    )}
                </button>
            </div>
            <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-purple-500 focus:outline-none transition-all placeholder-slate-600"
            placeholder="例如：这款咖啡机采用复古设计，一键全自动萃取，3秒速热，让您在家也能享受咖啡馆级的美味..."
            required
            />
        </div>

        <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">创意方向</label>
            <div className="flex flex-wrap gap-2">
            {DIRECTIONS.map((d) => (
                <button
                key={d}
                type="button"
                onClick={() => setDirection(d)}
                className={`px-3 py-1.5 rounded-full text-xs transition-all border ${
                    direction === d 
                    ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.3)]' 
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                }`}
                >
                {d}
                </button>
            ))}
            </div>
        </div>

        <Button type="submit" className="w-full text-sm py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 border-none mt-4">
            生成创意方案
        </Button>
        </form>

        {/* Product Library Section */}
        <div className="flex-1 min-h-0 flex flex-col border-t border-slate-800 pt-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                📦 商品库 ({history.length})
            </h3>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                {sortedHistory.length === 0 ? (
                    <div className="text-center py-8 text-slate-600 text-xs border border-dashed border-slate-800 rounded-lg">
                        暂无商品记录，生成方案后自动保存
                    </div>
                ) : (
                    sortedHistory.map(item => (
                        <div 
                            key={item.id} 
                            className={`group relative bg-slate-900/50 border rounded-lg p-3 transition-all hover:bg-slate-900 hover:border-purple-500/50 ${item.isPinned ? 'border-purple-500/30 bg-purple-900/5' : 'border-slate-800'}`}
                        >
                            <div className="flex gap-3">
                                {/* Thumbnail */}
                                <div className="w-12 h-12 flex-shrink-0 bg-black rounded border border-slate-700 overflow-hidden relative">
                                    {item.userImages && item.userImages.length > 0 ? (
                                        <>
                                            <img src={item.userImages[0]} alt={item.name} className="w-full h-full object-cover" />
                                            {item.userImages.length > 1 && (
                                                <div className="absolute bottom-0 right-0 bg-black/70 text-white text-[8px] px-1 rounded-tl">
                                                    +{item.userImages.length - 1}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
                                    )}
                                </div>
                                
                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <h4 className={`text-xs font-bold truncate pr-4 ${item.isPinned ? 'text-purple-300' : 'text-slate-200'}`}>
                                            {item.isPinned && <span className="mr-1">📌</span>}
                                            {item.name}
                                        </h4>
                                    </div>
                                    <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">
                                        {item.description}
                                    </p>
                                </div>
                            </div>

                            {/* Actions Overlay */}
                            <div className="absolute top-2 right-2 flex flex-col gap-1">
                                <button 
                                    onClick={(e) => handlePin(item.id, e)}
                                    className={`p-1 rounded hover:bg-slate-700 transition-colors ${item.isPinned ? 'text-purple-400' : 'text-slate-600 opacity-0 group-hover:opacity-100'}`}
                                    title={item.isPinned ? "取消置顶" : "置顶常用"}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                    </svg>
                                </button>
                            </div>

                            <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button 
                                    size="sm" 
                                    variant="secondary" 
                                    className="flex-1 h-6 text-[10px] py-0 border-purple-500/30 text-purple-300 hover:bg-purple-900/20"
                                    onClick={() => handleApply(item)}
                                >
                                    覆盖填单
                                </Button>
                                <button 
                                    onClick={(e) => handleDelete(item.id, e)}
                                    className="px-2 h-6 rounded bg-red-900/20 text-red-400 hover:bg-red-900/40 text-[10px]"
                                    title="删除记录"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    </div>
  );
};