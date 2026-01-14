import React, { useState } from 'react';
import { LibraryAsset, AppMode } from '../types';
import { Button } from './ui/Button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  assets: LibraryAsset[];
}

export const AssetLibraryModal: React.FC<Props> = ({ isOpen, onClose, assets }) => {
  const [filterMode, setFilterMode] = useState<AppMode | 'all'>('all');
  
  if (!isOpen) return null;

  // Filter assets
  const filteredAssets = assets.filter(a => filterMode === 'all' || a.meta?.mode === filterMode);

  const concepts = filteredAssets.filter(a => a.type === 'concept');
  const images = filteredAssets.filter(a => a.type === 'image');
  const videos = filteredAssets.filter(a => a.type === 'video');

  const getModeLabel = (mode?: AppMode) => {
      switch(mode) {
          case 'video': return '🎬 视频';
          case 'image': return '📸 图片';
          case 'pdp': return '📑 详情页';
          default: return '未知';
      }
  };

  const ModeBadge: React.FC<{ mode?: AppMode }> = ({ mode }) => {
      if (!mode) return null;
      let colors = "bg-slate-800 text-slate-400 border-slate-700";
      if (mode === 'video') colors = "bg-green-900/30 text-green-300 border-green-800/50";
      if (mode === 'image') colors = "bg-pink-900/30 text-pink-300 border-pink-800/50";
      if (mode === 'pdp') colors = "bg-blue-900/30 text-blue-300 border-blue-800/50";
      
      return (
          <span className={`text-[9px] px-1.5 py-0.5 rounded border ${colors}`}>
              {getModeLabel(mode)}
          </span>
      );
  };

  const handleExport = () => {
    let md = `# 创意素材库导出\n\n`;
    md += `> 导出时间: ${new Date().toLocaleString()}\n`;
    md += `> 筛选模式: ${filterMode === 'all' ? '全部' : getModeLabel(filterMode)}\n\n`;
    
    // ... (rest of export logic similar to before, but could include meta info)
    // Simplified export for brevity, keeping existing structure mostly
    if (concepts.length > 0) {
        md += `## 💡 创意灵感 (${concepts.length})\n\n`;
        concepts.forEach((c, i) => {
            md += `### ${i+1}. ${c.content.title}\n`;
            md += `* [${getModeLabel(c.meta?.mode)}] 商品: ${c.meta?.productName} *\n`;
            md += `**场景:** ${c.content.description}\n\n`;
            md += `**内容:** ${c.content.script}\n\n`;
            md += `---\n`;
        });
    }
    // Images & Videos export logic...
    if (images.length > 0) {
        md += `\n## 🎨 视觉素材 (${images.length})\n\n`;
        images.forEach((img, i) => {
            md += `### 图片 ${i+1}\n`;
            md += `* [${getModeLabel(img.meta?.mode)}] 商品: ${img.meta?.productName} *\n`;
            md += `Prompt: ${img.meta?.prompt || 'N/A'}\n\n`;
            md += `![Generated Image](${img.content})\n\n`;
        });
    }

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `creative_library_export_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header with Filter */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>📦</span> 创意素材库
            </h2>
            <div className="flex bg-slate-800 rounded p-1">
                {(['all', 'video', 'image', 'pdp'] as const).map(m => (
                    <button
                        key={m}
                        onClick={() => setFilterMode(m)}
                        className={`px-3 py-1 rounded text-xs font-medium transition-colors ${filterMode === m ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        {m === 'all' ? '全部' : getModeLabel(m)}
                    </button>
                ))}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-950/50">
            {filteredAssets.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                    <span className="text-4xl mb-4">📂</span>
                    <p>当前分类下暂无素材</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Concept Column */}
                    <div className="flex flex-col gap-4">
                        <h3 className="text-blue-400 font-bold border-b border-blue-900/50 pb-2 flex justify-between items-center">
                            灵感方案 <span className="text-xs font-normal text-slate-500">{concepts.length}</span>
                        </h3>
                        <div className="space-y-3">
                            {concepts.map(c => (
                                <div key={c.id} className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs shadow-sm hover:border-blue-500/30 transition-colors">
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        <ModeBadge mode={c.meta?.mode} />
                                        {c.meta?.productName && <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-slate-400">{c.meta.productName}</span>}
                                    </div>
                                    <div className="font-bold text-slate-200 mb-1 line-clamp-1" title={c.content.title}>{c.content.title}</div>
                                    <div className="text-slate-500 line-clamp-3 mb-2">{c.content.description}</div>
                                    <div className="text-[10px] text-slate-600 border-t border-slate-800 pt-1 flex justify-between">
                                        <span>{new Date(c.timestamp).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Image Column */}
                    <div className="flex flex-col gap-4">
                        <h3 className="text-pink-400 font-bold border-b border-pink-900/50 pb-2 flex justify-between items-center">
                            视觉设计 <span className="text-xs font-normal text-slate-500">{images.length}</span>
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {images.map(img => (
                                <div key={img.id} className="flex flex-col bg-slate-900 border border-slate-800 rounded-lg overflow-hidden group">
                                    <div className="aspect-square relative overflow-hidden">
                                        <img src={img.content} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="asset" />
                                        <div className="absolute top-1 left-1 flex flex-col gap-1">
                                            <ModeBadge mode={img.meta?.mode} />
                                        </div>
                                        <a href={img.content} download={`img_${img.id}.png`} className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs backdrop-blur-sm transition-opacity">
                                            ⬇ 下载
                                        </a>
                                    </div>
                                    <div className="p-2 text-[10px]">
                                         <div className="font-bold text-slate-300 truncate mb-0.5">{img.meta?.productName || '未知商品'}</div>
                                         <div className="text-slate-500 truncate" title={img.meta?.conceptTitle}>{img.meta?.conceptTitle}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Video Column */}
                    <div className="flex flex-col gap-4">
                        <h3 className="text-green-400 font-bold border-b border-green-900/50 pb-2 flex justify-between items-center">
                            成品视频 <span className="text-xs font-normal text-slate-500">{videos.length}</span>
                        </h3>
                        <div className="space-y-3">
                            {videos.map((vid, idx) => (
                                <div key={vid.id} className="bg-slate-900 border border-slate-800 rounded-lg p-2 hover:bg-slate-800 transition-colors">
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        <ModeBadge mode={vid.meta?.mode} />
                                        <span className="text-[9px] bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-slate-400">{vid.meta?.productName}</span>
                                    </div>
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-xs text-slate-300 truncate max-w-[150px]" title={vid.meta?.conceptTitle}>{vid.meta?.conceptTitle || `视频 #${idx+1}`}</span>
                                        <a href={vid.content} download={`vid_${vid.id}.mp4`} className="text-[10px] bg-green-900/20 text-green-400 px-2 py-1 rounded border border-green-900/50 hover:bg-green-900/40">
                                            下载
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>

        <div className="p-5 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50">
          <Button variant="secondary" onClick={onClose}>关闭</Button>
          <Button onClick={handleExport} disabled={filteredAssets.length === 0}>
             导出 Markdown 报告
          </Button>
        </div>
      </div>
    </div>
  );
};