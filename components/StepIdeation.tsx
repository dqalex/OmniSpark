import React, { useState } from 'react';
import { ProductInfo, SceneConcept, AssetType, AppMode } from '../types';
import { generateConcepts } from '../services/geminiService';
import { Button } from './ui/Button';

interface Props {
  product: ProductInfo;
  onSelect: (concept: SceneConcept) => void;
  selectedId?: string;
  onAddToLibrary: (type: AssetType, content: any, meta?: any) => void;
  // History props
  historyConcepts: SceneConcept[];
  onNewConcepts: (concepts: SceneConcept[]) => void;
  currentMode: AppMode; // Added
}

export const StepIdeation: React.FC<Props> = ({ 
    product, 
    onSelect, 
    selectedId, 
    onAddToLibrary,
    historyConcepts,
    onNewConcepts,
    currentMode
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Filter history by current Mode to show only relevant concepts
  const filteredConcepts = historyConcepts.filter(c => c.mode === currentMode && c.productName === product.name);

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      // Pass userImages array if available AND currentMode
      const results = await generateConcepts(
          product.name, 
          product.description, 
          product.creativeDirection, 
          product.userImages,
          currentMode
      );
      
      const withMeta = results.map((c, i) => ({
          ...c, 
          id: `${Date.now()}-${i}`,
          productName: product.name,
          creativeDirection: product.creativeDirection,
          createdAt: Date.now(),
          mode: currentMode
      }));
      
      onNewConcepts(withMeta);
    } catch (err: any) {
      console.error(err);
      if (err.toString().includes('403') || err.toString().includes('PERMISSION_DENIED')) {
        setError('API 权限被拒绝 (403)。请点击顶部 "API Key" 按钮重新选择密钥。');
      } else {
        setError(`生成创意失败: ${err.message || '未知错误'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = (concept: SceneConcept, e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToLibrary('concept', concept, { 
        title: concept.title,
        mode: currentMode,
        productName: product.name,
        conceptTitle: concept.title
    });
  };

  const handleGenerateVisual = (concept: SceneConcept, e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(concept);
  };

  const groupedConcepts = filteredConcepts.reduce((groups, concept) => {
      const key = `${concept.productName}::${concept.creativeDirection}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(concept);
      return groups;
  }, {} as Record<string, SceneConcept[]>);

  const sortedGroupKeys = Object.keys(groupedConcepts).sort((a, b) => {
      const timeA = groupedConcepts[a][0].createdAt;
      const timeB = groupedConcepts[b][0].createdAt;
      return timeB - timeA;
  });

  return (
    <div className="flex flex-col h-full">
       {/* Error State */}
       {error && (
         <div className="text-center py-4 bg-red-900/10 rounded-lg border border-red-900/30 px-2 mb-2">
            <p className="text-xs text-red-400 mb-2">{error}</p>
            <Button variant="secondary" size="sm" onClick={() => setError('')} className="text-[10px] py-1 h-auto">
                重置
            </Button>
         </div>
       )}

       {/* Loading State */}
       {loading && (
          <div className="flex flex-col items-center justify-center p-8 mb-4 bg-blue-900/10 rounded-xl border border-blue-900/20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-xs text-slate-400 animate-pulse font-medium">
                正在构思 "{product.name}" 的{currentMode === 'video' ? '视频' : currentMode === 'image' ? '图片' : '详情页'}创意...
            </p>
          </div>
       )}

       <div className="space-y-6 overflow-y-auto custom-scrollbar flex-1 pr-1 pb-4">
          {/* Empty State / Trigger */}
          {filteredConcepts.length === 0 && !loading && (
             <div className="flex flex-col items-center justify-center py-10 px-4 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/20">
                 <div className="text-3xl mb-3">💡</div>
                 <p className="text-sm text-slate-400 font-bold mb-2">
                     {currentMode === 'video' ? '准备生成视频创意' : currentMode === 'image' ? '准备生成图片创意' : '准备生成详情页文案'}
                 </p>
                 <p className="text-xs text-slate-500 mb-6 max-w-[200px]">
                     基于商品简报，AI 将为您生成 3 个{currentMode === 'video' ? '短视频脚本与分镜' : currentMode === 'image' ? '社媒图文方案' : '电商详情页策划'}。
                 </p>
                 <Button onClick={handleGenerate} className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20">
                     ✨ 生成创意方案
                 </Button>
             </div>
          )}
          
          {sortedGroupKeys.map((groupKey) => {
              const [pName, pDirection] = groupKey.split('::');
              const groupItems = groupedConcepts[groupKey];
              
              return (
                  <div key={groupKey} className="space-y-2 animate-fade-in">
                      <div className="sticky top-0 z-20 bg-slate-900/90 backdrop-blur py-1 border-b border-slate-800 flex justify-between items-center">
                          <h3 className="text-xs font-bold text-slate-300 truncate max-w-[200px]">{pName}</h3>
                          <span className="text-[10px] bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded border border-blue-800/50">
                              {pDirection}
                          </span>
                      </div>
                      
                      <div className="space-y-3">
                        {groupItems.map((concept) => (
                            <div 
                                key={concept.id}
                                onClick={() => onSelect(concept)}
                                className={`cursor-pointer group rounded-xl p-4 transition-all duration-200 border text-left relative ${
                                    selectedId === concept.id 
                                    ? 'bg-blue-900/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                                    : 'bg-slate-950 border-slate-800 hover:border-slate-600 hover:bg-slate-900'
                                }`}
                            >
                                <button 
                                onClick={(e) => handleAdd(concept, e)}
                                className="absolute top-3 right-3 z-10 p-1.5 rounded-full hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                title="加入素材库"
                                >
                                    <span className="text-slate-400 hover:text-yellow-400 text-lg leading-none">+</span>
                                </button>

                                <div className="mb-3 pr-8">
                                    <h3 className={`font-bold text-sm ${selectedId === concept.id ? 'text-blue-400' : 'text-slate-200'}`}>
                                        {concept.title}
                                    </h3>
                                </div>
                                
                                <div className="space-y-3 text-xs">
                                    {/* Element 1: Scene */}
                                    <div className="bg-slate-900/50 p-2 rounded border border-slate-800/30">
                                        <span className="text-purple-400 font-bold block mb-0.5">1. 场景 (Scene)</span>
                                        <p className="text-slate-300 leading-relaxed">{concept.description}</p>
                                    </div>
                                    
                                    {/* Element 2: Storyboard */}
                                    <div className="bg-slate-900/50 p-2 rounded border border-slate-800/30">
                                        <span className="text-pink-400 font-bold block mb-0.5">
                                          2. {currentMode === 'video' ? '分镜 (Storyboard)' : currentMode === 'image' ? '图片列表 (Images)' : '详情页切片 (Sections)'}
                                        </span>
                                        <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{concept.storyboard}</p>
                                    </div>

                                    {/* Element 3: Script */}
                                    <div className="bg-slate-900/50 p-2 rounded border border-slate-800/30">
                                        <span className="text-green-400 font-bold block mb-0.5">
                                          3. {currentMode === 'video' ? '口播 (Script)' : currentMode === 'image' ? '文案 (Copy)' : '营销卖点 (Selling Point)'}
                                        </span>
                                        <p className="text-slate-300 leading-relaxed italic">"{concept.script}"</p>
                                    </div>

                                    <div className="pt-2 mt-2 border-t border-slate-800/50 flex justify-end">
                                        <Button 
                                            size="sm" 
                                            variant="secondary"
                                            className="text-[10px] h-7 px-3 bg-blue-600/10 text-blue-400 border-blue-600/30 hover:bg-blue-600 hover:text-white"
                                            onClick={(e) => handleGenerateVisual(concept, e)}
                                        >
                                            🎨 生成视觉场景
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}
                      </div>
                  </div>
              )
          })}
       </div>
    </div>
  );
};