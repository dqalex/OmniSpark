import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { StepInput } from './components/StepInput';
import { StepIdeation } from './components/StepIdeation';
import { StepVisualizer } from './components/StepVisualizer';
import { StepProduction } from './components/StepProduction';
import { SettingsModal } from './components/SettingsModal';
import { AssetLibraryModal } from './components/AssetLibraryModal';
import { ProductInfo, SceneConcept, AppConfig, DEFAULT_CONFIG, LibraryAsset, AssetType, ImageHistoryItem, VideoHistoryItem, AppMode } from './types';
import { updateServiceConfig } from './services/geminiService';

// Placeholder Component for Locked Steps
const LockedPanel: React.FC<{ step: number; title: string; iconColor: string }> = ({ step, title, iconColor }) => (
    <div className="flex-shrink-0 w-[400px] h-full flex flex-col opacity-40 grayscale pointer-events-none select-none">
        <section className="bg-slate-900/30 border border-slate-800/50 rounded-2xl p-6 h-full flex flex-col items-center justify-center border-dashed">
             <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4 text-2xl text-slate-600">
                🔒
             </div>
             <h3 className="text-slate-500 font-bold text-lg mb-2">步骤 {step}: {title}</h3>
             <p className="text-slate-600 text-xs text-center">完成前序步骤后解锁</p>
        </section>
    </div>
);

export default function App() {
  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [selectedConcept, setSelectedConcept] = useState<SceneConcept | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  
  // App Mode State
  const [appMode, setAppMode] = useState<AppMode>('video');

  // Global History State
  const [historyConcepts, setHistoryConcepts] = useState<SceneConcept[]>([]);
  const [historyImages, setHistoryImages] = useState<ImageHistoryItem[]>([]);
  const [historyVideos, setHistoryVideos] = useState<VideoHistoryItem[]>([]);

  // Settings & Library State
  const [appConfig, setAppConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [libraryAssets, setLibraryAssets] = useState<LibraryAsset[]>([]);

  // Initialize Service
  useEffect(() => {
    updateServiceConfig(appConfig);
  }, [appConfig]);

  const handleSaveConfig = (newConfig: AppConfig) => {
    setAppConfig(newConfig);
  };

  const handleAddToLibrary = (type: AssetType, content: any, meta?: any) => {
    const newAsset: LibraryAsset = {
        id: Date.now().toString(),
        type,
        content,
        timestamp: Date.now(),
        meta
    };
    setLibraryAssets(prev => [newAsset, ...prev]);
  };

  const addHistoryConcept = (concepts: SceneConcept[]) => {
      setHistoryConcepts(prev => [...concepts, ...prev]);
  };

  const addHistoryImage = (img: ImageHistoryItem) => {
      setHistoryImages(prev => [img, ...prev]);
      setGeneratedImage(img.base64); // Also set active
  };

  const addHistoryVideo = (vid: VideoHistoryItem) => {
      setHistoryVideos(prev => [vid, ...prev]);
  };

  const handleModeChange = (mode: AppMode) => {
      setAppMode(mode);
      // Reset flow selection when mode changes (optional, but cleaner UI)
      setSelectedConcept(null);
      setGeneratedImage(null);
      // Keep product info
  };

  // Calculate current active step for Stepper
  let currentStep = 1;
  if (product) currentStep = 2;
  if (selectedConcept) currentStep = 3;
  if (generatedImage) currentStep = 4;

  const steps = [
      { id: 1, title: '商品简报', color: 'purple' },
      { id: 2, title: '创意灵感', color: 'blue' },
      { id: 3, title: '视觉设计', color: 'pink' },
      { id: 4, title: '视频制作', color: 'green' },
  ];

  // Filter steps based on mode
  const visibleSteps = appMode === 'video' ? steps : steps.slice(0, 3);

  return (
    <Layout 
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenLibrary={() => setIsLibraryOpen(true)}
        libraryCount={libraryAssets.length}
        currentMode={appMode}
        onModeChange={handleModeChange}
    >
      <div className="flex flex-col h-full gap-4">
          {/* Stepper / Progress Bar */}
          <div className="flex-none px-2 py-2">
            <div className="flex items-center gap-2 max-w-4xl">
                {visibleSteps.map((s, idx) => {
                    const isActive = s.id === currentStep;
                    const isCompleted = s.id < currentStep;
                    
                    let colorClass = "text-slate-500 border-slate-700 bg-slate-900";
                    if (isActive) colorClass = `text-${s.color}-400 border-${s.color}-500 bg-${s.color}-900/20 shadow-[0_0_10px_rgba(100,100,100,0.1)]`;
                    if (isCompleted) colorClass = `text-slate-300 border-slate-600 bg-slate-800`;

                    return (
                        <div key={s.id} className="flex items-center gap-2">
                             <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${colorClass}`}>
                                 <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${isActive ? `bg-${s.color}-500 text-white` : 'bg-slate-700'}`}>
                                     {isCompleted ? '✓' : s.id}
                                 </span>
                                 {s.title}
                             </div>
                             {idx < visibleSteps.length - 1 && (
                                 <div className={`w-8 h-[1px] ${isCompleted ? 'bg-slate-600' : 'bg-slate-800'}`}></div>
                             )}
                        </div>
                    )
                })}
            </div>
          </div>

          {/* Canvas Container */}
          <div className="flex-1 flex flex-row overflow-x-auto overflow-y-hidden gap-6 pb-4 items-start min-w-full custom-scrollbar">
            
            {/* Column 1: Input & Context */}
            <div className="flex-shrink-0 w-[400px] flex flex-col gap-6 h-full overflow-y-auto pr-2 custom-scrollbar">
              <section className={`bg-slate-900/50 backdrop-blur-sm border ${product ? 'border-purple-500/50' : 'border-slate-800'} rounded-2xl p-6 shadow-xl transition-colors duration-500`}>
                <div className="flex items-center gap-3 mb-4 text-purple-400">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-bold">1</div>
                    <h2 className="font-bold text-lg">商品简报</h2>
                </div>
                <StepInput 
                    onNext={(info) => {
                      setProduct(info);
                      // Keep flow, step 2 will handle generation logic based on product change
                    }} 
                />
              </section>
            </div>

            {/* Column 2: Ideation */}
            <div className="flex-shrink-0 w-[400px] h-full flex flex-col animate-fade-in">
                <section className={`bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 shadow-xl flex-1 h-full overflow-y-auto custom-scrollbar ${!product ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="flex items-center gap-3 mb-4 text-blue-400">
                        <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold">2</div>
                        <h2 className="font-bold text-lg">创意灵感</h2>
                    </div>
                    {product ? (
                        <StepIdeation 
                            product={product} 
                            historyConcepts={historyConcepts}
                            onNewConcepts={addHistoryConcept}
                            onSelect={(concept) => {
                                setSelectedConcept(concept);
                                setGeneratedImage(null); 
                            }}
                            selectedId={selectedConcept?.id}
                            onAddToLibrary={handleAddToLibrary}
                            currentMode={appMode} // Pass mode
                        />
                    ) : (
                        <div className="text-center text-slate-500 py-10">请先完成商品简报</div>
                    )}
                </section>
            </div>

            {/* Column 3: Visualization */}
            {selectedConcept ? (
              <div className="flex-shrink-0 w-[500px] h-full flex flex-col animate-fade-in">
                 <section className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 shadow-xl h-full overflow-y-auto custom-scrollbar border-t-4 border-t-pink-500">
                    <div className="flex items-center gap-3 mb-6 text-pink-400 flex-wrap justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-pink-500/20 flex items-center justify-center text-xs font-bold">3</div>
                        <h2 className="font-bold text-lg">视觉设计</h2>
                      </div>
                      <span className="text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400 border border-slate-700">
                        Mode: {appMode.toUpperCase()} | Model: {appConfig.imageModel.includes('flash') ? 'Nano Banana 🍌' : 'Gemini Pro ✨'}
                      </span>
                    </div>
                    <StepVisualizer 
                      concept={selectedConcept}
                      productImages={product?.userImages} // Pass the uploaded images
                      historyImages={historyImages}
                      onAddImage={addHistoryImage}
                      onAddToLibrary={handleAddToLibrary}
                      currentMode={appMode} // Pass mode
                    />
                 </section>
              </div>
            ) : (
                <LockedPanel step={3} title="视觉设计" iconColor="pink" />
            )}

            {/* Column 4: Production (ONLY VIDEO MODE) */}
            {appMode === 'video' && (
                generatedImage && selectedConcept ? (
                <div className="flex-shrink-0 w-[500px] h-full flex flex-col animate-fade-in">
                    <section className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-6 shadow-xl h-full overflow-y-auto custom-scrollbar border-t-4 border-t-green-500">
                    <div className="flex items-center gap-3 mb-6 text-green-400">
                        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center text-xs font-bold">4</div>
                        <h2 className="font-bold text-lg">视频制作</h2>
                    </div>
                    <StepProduction 
                        image={generatedImage}
                        concept={selectedConcept}
                        historyVideos={historyVideos}
                        historyImages={historyImages}
                        onAddVideo={addHistoryVideo}
                        onAddToLibrary={handleAddToLibrary}
                    />
                    </section>
                </div>
                ) : (
                    <LockedPanel step={4} title="视频制作" iconColor="green" />
                )
            )}
          </div>

          <SettingsModal 
            isOpen={isSettingsOpen} 
            onClose={() => setIsSettingsOpen(false)}
            initialConfig={appConfig}
            onSave={handleSaveConfig}
          />

          <AssetLibraryModal
             isOpen={isLibraryOpen}
             onClose={() => setIsLibraryOpen(false)}
             assets={libraryAssets}
          />
      </div>
      
      {/* Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5); 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155; 
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #475569; 
        }
      `}</style>
    </Layout>
  );
}