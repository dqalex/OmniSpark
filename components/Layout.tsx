import React from 'react';
import { AppMode } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  onOpenSettings: () => void;
  onOpenLibrary: () => void;
  libraryCount?: number;
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
    children, 
    onOpenSettings, 
    onOpenLibrary, 
    libraryCount = 0,
    currentMode,
    onModeChange
}) => {
  
  const handleKeySelection = async () => {
    const aiStudio = (window as any).aistudio;
    if (aiStudio?.openSelectKey) {
      await aiStudio.openSelectKey();
    }
  };

  const modeOptions: { id: AppMode; label: string; icon: string }[] = [
      { id: 'video', label: '视频创意', icon: '🎬' },
      { id: 'image', label: '图片创意', icon: '📸' },
      { id: 'pdp', label: '商品详情页', icon: '📑' }
  ];

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-purple-500 selection:text-white overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
      <header className="flex-none h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 z-50">
        <div className="max-w-full px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Logo Icon */}
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg blur opacity-75 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative w-full h-full bg-slate-900 rounded-lg flex items-center justify-center border border-slate-700">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                            <path fillRule="evenodd" d="M9.315 7.584C12.195 3.883 16.695 1.5 21.75 1.5a.75.75 0 01.75.75c0 5.056-2.383 9.555-6.084 12.436h.001c-1.226 1.642-2.06 4.311-2.128 6.545a.75.75 0 01-1.49.07 10.5 10.5 0 010-1.237l-2.829-2.828a10.5 10.5 0 01-1.238 0 .75.75 0 01.07-1.49c2.234-.068 4.904-.902 6.545-2.128.872.872 1.64 1.842 2.28 2.898a.75.75 0 001.285-.772 15.426 15.426 0 01-4.22-4.908l-.346-.576a15.428 15.428 0 01-4.909-4.22.75.75 0 00-.772 1.285c1.056.64 2.026 1.408 2.898 2.28.324-.324.63-.666.915-1.026zM4.5 20.25a.75.75 0 01.75-.75h.75c.414 0 .75.336.75.75v.75a.75.75 0 01-.75.75h-.75a.75.75 0 01-.75-.75v-.75zM2.25 18a.75.75 0 01.75-.75h.75c.414 0 .75.336.75.75v.75a.75.75 0 01-.75.75h-.75a.75.75 0 01-.75-.75v-.75zM2.25 20.25a.75.75 0 01.75-.75h.75c.414 0 .75.336.75.75v.75a.75.75 0 01-.75.75h-.75a.75.75 0 01-.75-.75v-.75z" clipRule="evenodd" />
                        </svg>
                    </div>
                </div>
                
                <div className="flex flex-col justify-center">
                    <h1 className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">
                    OmniSpark AI
                    </h1>
                </div>
            </div>

            {/* Mode Switcher */}
            <div className="bg-slate-800/50 p-1 rounded-lg flex items-center border border-slate-700">
                {modeOptions.map(opt => {
                    const isActive = currentMode === opt.id;
                    return (
                        <button
                            key={opt.id}
                            onClick={() => onModeChange(opt.id)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                                isActive 
                                ? 'bg-slate-700 text-white shadow-sm' 
                                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                            }`}
                        >
                            <span>{opt.icon}</span>
                            <span>{opt.label}</span>
                        </button>
                    )
                })}
            </div>
          </div>

          <div className="flex items-center gap-4">
             <button
               onClick={onOpenLibrary}
               className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:border-slate-500 rounded-lg text-xs font-medium transition-all group"
             >
                <span className="group-hover:text-yellow-400 transition-colors">★ 创意库</span>
                {libraryCount > 0 && (
                    <span className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black px-1.5 rounded-full text-[10px] font-bold">{libraryCount}</span>
                )}
             </button>

             <button
               onClick={onOpenSettings}
               className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all"
               title="配置设置"
             >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
               </svg>
             </button>
            <button 
              onClick={handleKeySelection}
              className="text-[10px] font-mono text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 rounded px-2 py-1 transition-colors"
              title="Veo API Key Selection"
            >
              API KEY
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-hidden p-6 relative">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
        {children}
      </main>
    </div>
  );
};