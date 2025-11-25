
import React from 'react';
import { BookConfig } from '../types';
import { Sparkles, Layers, Pause, Play, Trash2, Settings2, Frame, Baby, ScanFace, Brush, Flower, Ghost, Crown, Smile, Grid } from 'lucide-react';

interface ConfigFormProps {
  config: BookConfig;
  onChange: (config: BookConfig) => void;
  onGenerate: () => void;
  onResume: () => void;
  onStop: () => void;
  onReset: () => void;
  isGenerating: boolean;
  hasPages: boolean;
  hasUnfinishedWork: boolean;
}

export const ConfigForm: React.FC<ConfigFormProps> = ({ 
    config, 
    onChange, 
    onGenerate, 
    onResume, 
    onStop, 
    onReset, 
    isGenerating, 
    hasPages,
    hasUnfinishedWork
}) => {
  
  const handleChange = (key: keyof BookConfig, value: any) => {
    onChange({ ...config, [key]: value });
  };

  const renderMainButton = () => {
    if (isGenerating) {
        return (
            <button
                onClick={onStop}
                className="w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg flex items-center justify-center gap-3 bg-red-500 hover:bg-red-600 transition-all hover:scale-[1.01]"
            >
                <Pause size={20} fill="currentColor" />
                STOP / PAUSE
            </button>
        );
    }

    if (hasPages && hasUnfinishedWork) {
        return (
            <button
                onClick={onResume}
                className="w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg flex items-center justify-center gap-3 bg-orange-500 hover:bg-orange-600 transition-all hover:scale-[1.01]"
            >
                <Play size={20} fill="currentColor" />
                Resume Production
            </button>
        );
    }

    return (
        <button
            onClick={onGenerate}
            className="w-full py-4 rounded-xl font-bold text-lg text-white shadow-lg flex items-center justify-center gap-3 bg-brand-600 hover:bg-brand-700 transition-all hover:scale-[1.01]"
        >
            <Sparkles size={20} />
            {hasPages ? 'Restart New Book' : 'Generate Book'}
        </button>
    );
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-xl border border-stone-200 relative">
      <div className="flex items-center justify-between mb-6 text-brand-600">
        <div className="flex items-center gap-2">
            <Settings2 size={24} />
            <h2 className="text-2xl font-bold">Studio Config</h2>
        </div>
        {hasPages && !isGenerating && (
            <button 
                onClick={onReset}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Reset All"
            >
                <Trash2 size={18} />
            </button>
        )}
      </div>

      <div className="space-y-5">
        {/* Title & Topic */}
        <div className="space-y-4">
            <input
                type="text"
                value={config.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-400 outline-none"
                placeholder="Book Title (e.g. Cozy Cottage)"
                disabled={isGenerating}
            />
            <textarea
                value={config.topic}
                onChange={(e) => handleChange('topic', e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-400 outline-none h-20 resize-none"
                placeholder="Topic description..."
                disabled={isGenerating}
            />
        </div>

        <div className="border-t border-gray-100 my-4"></div>

        {/* Configuration Grid */}
        <div className="grid grid-cols-2 gap-4">
          
          {/* Page Count */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Pages</label>
            <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white">
                <Layers size={16} className="text-gray-400"/>
                <input
                    type="number"
                    min={1}
                    max={50}
                    value={config.pageCount}
                    onChange={(e) => handleChange('pageCount', parseInt(e.target.value))}
                    className="w-full outline-none text-gray-700 font-medium"
                    disabled={isGenerating}
                />
            </div>
          </div>

          {/* Aspect Ratio */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Format</label>
            <div className="flex bg-gray-100 rounded-lg p-1">
                <button 
                    onClick={() => handleChange('aspectRatio', '1:1')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${config.aspectRatio === '1:1' ? 'bg-white shadow text-brand-600' : 'text-gray-500'}`}
                    disabled={isGenerating}
                >
                    1:1
                </button>
                <button 
                    onClick={() => handleChange('aspectRatio', '3:4')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${config.aspectRatio === '3:4' ? 'bg-white shadow text-brand-600' : 'text-gray-500'}`}
                    disabled={isGenerating}
                >
                    3:4
                </button>
            </div>
          </div>
        </div>

        {/* Art Style Selector */}
        <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Art Style</label>
            <div className="grid grid-cols-3 gap-2">
                <button onClick={() => handleChange('artStyle', 'kawaii')} className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition h-20 ${config.artStyle === 'kawaii' ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-brand-200 text-gray-500'}`} disabled={isGenerating}>
                    <Sparkles size={20} className="mb-1" />
                    <span className="text-[10px] font-bold">Kawaii</span>
                </button>
                <button onClick={() => handleChange('artStyle', 'mandala')} className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition h-20 ${config.artStyle === 'mandala' ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-brand-200 text-gray-500'}`} disabled={isGenerating}>
                    <Flower size={20} className="mb-1" />
                    <span className="text-[10px] font-bold">Mandala</span>
                </button>
                <button onClick={() => handleChange('artStyle', 'spooky')} className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition h-20 ${config.artStyle === 'spooky' ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-brand-200 text-gray-500'}`} disabled={isGenerating}>
                    <Ghost size={20} className="mb-1" />
                    <span className="text-[10px] font-bold">Spooky</span>
                </button>
                <button onClick={() => handleChange('artStyle', 'fantasy')} className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition h-20 ${config.artStyle === 'fantasy' ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-brand-200 text-gray-500'}`} disabled={isGenerating}>
                    <Crown size={20} className="mb-1" />
                    <span className="text-[10px] font-bold">Fantasy</span>
                </button>
                <button onClick={() => handleChange('artStyle', 'cartoon')} className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition h-20 ${config.artStyle === 'cartoon' ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-brand-200 text-gray-500'}`} disabled={isGenerating}>
                    <Smile size={20} className="mb-1" />
                    <span className="text-[10px] font-bold">Cartoon</span>
                </button>
                <button onClick={() => handleChange('artStyle', 'pixel')} className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition h-20 ${config.artStyle === 'pixel' ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-brand-200 text-gray-500'}`} disabled={isGenerating}>
                    <Grid size={20} className="mb-1" />
                    <span className="text-[10px] font-bold">Pixel</span>
                </button>
            </div>
        </div>

        {/* Style Mode Selector - Mutually Exclusive */}
        <div>
            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Drawing Complexity</label>
            <div className="grid grid-cols-3 gap-2">
                {/* Standard Mode */}
                <button 
                    onClick={() => handleChange('styleMode', 'standard')}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition h-20 ${config.styleMode === 'standard' ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-brand-200 text-gray-500'}`}
                    disabled={isGenerating}
                >
                    <Brush size={20} className="mb-1" />
                    <span className="text-[10px] font-bold leading-tight">Standard</span>
                </button>

                {/* Baby Mode */}
                <button 
                    onClick={() => handleChange('styleMode', 'baby')}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition h-20 ${config.styleMode === 'baby' ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-brand-200 text-gray-500'}`}
                    disabled={isGenerating}
                >
                    <Baby size={20} className="mb-1" />
                    <span className="text-[10px] font-bold leading-tight">Baby</span>
                </button>

                {/* Classic Pro Mode */}
                <button 
                    onClick={() => handleChange('styleMode', 'classic')}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border-2 transition h-20 ${config.styleMode === 'classic' ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-brand-200 text-gray-500'}`}
                    disabled={isGenerating}
                >
                    <ScanFace size={20} className="mb-1" />
                    <span className="text-[10px] font-bold leading-tight">Classic Pro</span>
                </button>
            </div>
        </div>

        {/* Frames Toggle */}
        <button 
            onClick={() => handleChange('hasFrames', !config.hasFrames)}
            className={`w-full flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition ${config.hasFrames ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-gray-200 hover:border-brand-200 text-gray-500'}`}
            disabled={isGenerating}
        >
            <Frame size={20} />
            <span className="text-xs font-bold">{config.hasFrames ? 'Frames: ON' : 'Frames: OFF'}</span>
        </button>

        {renderMainButton()}
        
      </div>
    </div>
  );
};
