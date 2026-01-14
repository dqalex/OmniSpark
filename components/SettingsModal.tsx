import React, { useState, useEffect } from 'react';
import { AppConfig, DEFAULT_CONFIG } from '../types';
import { Button } from './ui/Button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: AppConfig) => void;
  initialConfig: AppConfig;
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialConfig }) => {
  const [config, setConfig] = useState<AppConfig>(initialConfig);

  useEffect(() => {
    setConfig(initialConfig);
  }, [initialConfig, isOpen]);

  if (!isOpen) return null;

  const handleChange = (key: keyof AppConfig, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>⚙️</span> 模型与服务配置
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">✕</button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar space-y-8">
          
          {/* Text Section */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-purple-400 uppercase tracking-wider border-b border-purple-500/20 pb-2">
              1. 文本与创意生成 (Text Generation)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Model (模型)</label>
                <select 
                  value={config.textModel}
                  onChange={(e) => handleChange('textModel', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="gemini-3-flash-preview">Gemini 3 Flash (Fast & Recommended)</option>
                  <option value="gemini-3-pro-preview">Gemini 3 Pro (High Reasoning)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">API Key (Optional)</label>
                <input 
                  type="password" 
                  value={config.textKey}
                  onChange={(e) => handleChange('textKey', e.target.value)}
                  placeholder="Default System Key"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600"
                />
              </div>
            </div>
          </section>

          {/* Image Section */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-pink-400 uppercase tracking-wider border-b border-pink-500/20 pb-2">
              2. 视觉设计与生成 (Image Generation)
            </h3>
            <div className="bg-pink-900/10 border border-pink-500/20 rounded-lg p-3 text-xs text-pink-300 mb-2">
               💡 默认使用 <strong>Nano Banana (Flash Image)</strong>，速度快且免费。如需高清细节，请切换至 Pro 并配置 Key。
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Model (模型)</label>
                <select 
                  value={config.imageModel}
                  onChange={(e) => handleChange('imageModel', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="gemini-2.5-flash-image">Nano Banana (Gemini 2.5 Flash Image)</option>
                  <option value="gemini-3-pro-image-preview">Gemini 3 Pro Image (High Quality)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">API Key (Optional)</label>
                <input 
                  type="password" 
                  value={config.imageKey}
                  onChange={(e) => handleChange('imageKey', e.target.value)}
                  placeholder="Default System Key"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600"
                />
              </div>
            </div>
          </section>

          {/* Video Section */}
          <section className="space-y-4">
            <h3 className="text-sm font-bold text-green-400 uppercase tracking-wider border-b border-green-500/20 pb-2">
              3. 视频制作 (Video Generation)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Model (模型)</label>
                <select 
                  value={config.videoModel}
                  onChange={(e) => handleChange('videoModel', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="veo-3.1-fast-generate-preview">Veo Fast (Preview)</option>
                  <option value="veo-3.1-generate-preview">Veo (High Quality)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">API Key (Required for Veo)</label>
                <input 
                  type="password" 
                  value={config.videoKey}
                  onChange={(e) => handleChange('videoKey', e.target.value)}
                  placeholder="Enter your paid API Key"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600"
                />
              </div>
            </div>
          </section>

        </div>

        <div className="p-5 border-t border-slate-800 flex justify-end gap-3 bg-slate-900/50">
          <Button variant="secondary" onClick={onClose}>取消</Button>
          <Button onClick={handleSave}>保存配置</Button>
        </div>
      </div>
    </div>
  );
};