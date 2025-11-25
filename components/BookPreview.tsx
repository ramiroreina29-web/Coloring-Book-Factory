import React, { useState, useRef, useEffect } from 'react';
import { GeneratedPage, PageType } from '../types';
import { Download, ChevronLeft, ChevronRight, Printer, AlertCircle, RefreshCw, Move } from 'lucide-react';

interface BookPreviewProps {
  pages: GeneratedPage[];
  isGenerating: boolean;
  onRegeneratePage: (pageId: string) => void;
  onReorderPages: (fromIndex: number, toIndex: number) => void;
}

export const BookPreview: React.FC<BookPreviewProps> = ({ 
    pages, 
    isGenerating,
    onRegeneratePage,
    onReorderPages
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Drag and Drop State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const currentPage = pages[currentIndex];

  useEffect(() => {
    if (scrollContainerRef.current && pages[currentIndex]) {
        const activeElement = scrollContainerRef.current.children[currentIndex] as HTMLElement;
        if (activeElement) {
            const container = scrollContainerRef.current;
            const newLeft = activeElement.offsetLeft - (container.clientWidth / 2) + (activeElement.clientWidth / 2);
            container.scrollTo({ left: newLeft, behavior: 'smooth' });
        }
    }
  }, [currentIndex, pages.length]);

  const handleNext = () => {
    if (currentIndex < pages.length - 1) setCurrentIndex(prev => prev + 1);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
  };

  // Drag and Drop Logic
  const handleDragStart = (e: React.DragEvent, index: number) => {
    // Only allow dragging Interior pages
    if (pages[index].type !== PageType.INTERIOR) {
        e.preventDefault();
        return;
    }
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault(); // Necessary for onDrop to fire
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    if (pages[targetIndex].type !== PageType.INTERIOR) return; // Can't drop on cover

    if (draggedIndex !== targetIndex) {
        onReorderPages(draggedIndex, targetIndex);
        // If we moved the currently selected page, follow it
        if (currentIndex === draggedIndex) setCurrentIndex(targetIndex);
    }
    setDraggedIndex(null);
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
        console.error("Download failed", e);
        window.open(url, '_blank');
    }
  };

  if (pages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-stone-50 rounded-2xl border-2 border-dashed border-stone-200 p-10 min-h-[500px]">
        <div className="w-24 h-24 mb-4 bg-stone-100 rounded-full flex items-center justify-center">
            <Printer size={40} className="text-stone-300" />
        </div>
        <p className="text-xl font-semibold">Ready to print</p>
        <p className="text-sm mt-2 text-center">Configure your book and start production to see preview.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Toolbar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-stone-100">
        <h3 className="font-bold text-gray-700">
            {currentPage?.type === PageType.COVER ? 'Cover' : 
             currentPage?.type === PageType.BACK_COVER ? 'Back Cover' : 
             `Page ${currentPage?.pageNumber}`}
        </h3>
        <div className="flex gap-2">
            {!isGenerating && currentPage.status !== 'pending' && currentPage.status !== 'generating' && (
                 <button
                    onClick={() => onRegeneratePage(currentPage.id)}
                    className="flex items-center gap-2 px-3 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition text-sm font-semibold"
                    title="Regenerate this specific page"
                 >
                    <RefreshCw size={16} />
                    <span className="hidden sm:inline">Regenerate</span>
                 </button>
            )}
            <button 
                onClick={() => handleDownload(currentPage.imageUrl, `page-${currentIndex + 1}.png`)}
                disabled={currentPage.status !== 'completed'}
                className="p-2 text-brand-600 hover:bg-brand-50 rounded-lg transition disabled:opacity-50"
                title="Download PNG"
            >
                <Download size={20} />
            </button>
        </div>
      </div>

      {/* Main Preview */}
      <div className="flex-1 relative flex items-center justify-center bg-stone-200/50 rounded-2xl border border-stone-200 overflow-hidden min-h-[400px]">
        
        {/* Navigation Buttons */}
        <button 
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="absolute left-2 sm:left-4 z-10 p-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:bg-white disabled:opacity-30 transition"
        >
            <ChevronLeft size={24} />
        </button>

        <button 
            onClick={handleNext}
            disabled={currentIndex === pages.length - 1}
            className="absolute right-2 sm:right-4 z-10 p-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:bg-white disabled:opacity-30 transition"
        >
            <ChevronRight size={24} />
        </button>

        {/* Page Content */}
        <div className="relative w-full h-full flex items-center justify-center p-4">
            <div className={`relative shadow-2xl bg-white transition-all duration-300 max-h-full ${
                // Rough aspect ratio classes for display
                pages[0].prompt.includes('aspectRatio') && !pages[0].imageUrl ? 'aspect-[3/4]' : 'aspect-auto h-full'
            }`}>
                 {/* 
                   We render image as regular img to respect its natural aspect ratio returned by AI.
                   But we constrain max height.
                 */}
                {currentPage.status === 'pending' || currentPage.status === 'generating' ? (
                    <div className="w-[300px] h-[400px] flex flex-col items-center justify-center bg-gray-50 px-4 text-center">
                        <div className="animate-spin h-10 w-10 border-4 border-brand-200 border-t-brand-500 rounded-full mb-4"></div>
                        <p className="text-sm text-gray-500 animate-pulse">
                            {currentPage.status === 'pending' ? 'Waiting in queue...' : 'Inking page...'}
                        </p>
                    </div>
                ) : currentPage.status === 'failed' ? (
                    <div className="w-[300px] h-[400px] flex flex-col items-center justify-center bg-red-50 px-6 text-center border-2 border-red-100 border-dashed">
                        <AlertCircle size={48} className="text-red-400 mb-3" />
                        <p className="text-lg font-bold text-red-600">Generation Failed</p>
                        <p className="text-xs text-red-500 mt-2">Safety filter or API limit.</p>
                        <button 
                            onClick={() => onRegeneratePage(currentPage.id)}
                            className="mt-4 px-4 py-2 bg-red-100 text-red-600 rounded-full text-xs font-bold hover:bg-red-200"
                        >
                            Try Again
                        </button>
                    </div>
                ) : (
                    <img 
                        src={currentPage.imageUrl} 
                        alt="Page" 
                        className="max-h-full max-w-full object-contain shadow-md"
                    />
                )}
            </div>
        </div>
      </div>

      {/* Thumbnails Carousel */}
      <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-sm">
         <div className="flex items-center justify-between mb-2 px-1">
             <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Timeline (Drag to Reorder)</span>
         </div>
         <div 
            ref={scrollContainerRef}
            className="flex gap-3 overflow-x-auto pb-2 px-1 snap-x scroll-smooth"
            style={{ scrollbarWidth: 'thin' }} // Firefox
         >
            {pages.map((page, idx) => (
                <div
                    key={page.id}
                    draggable={page.type === PageType.INTERIOR && !isGenerating}
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    onClick={() => setCurrentIndex(idx)}
                    className={`relative flex-shrink-0 cursor-pointer group snap-center ${
                        page.type === PageType.INTERIOR && !isGenerating ? 'cursor-grab active:cursor-grabbing' : ''
                    }`}
                >
                    <div className={`w-16 h-20 sm:w-20 sm:h-24 rounded-md overflow-hidden border-2 transition-all ${
                        currentIndex === idx ? 'border-brand-500 ring-2 ring-brand-200 scale-105 z-10' : 'border-gray-200'
                    } ${draggedIndex === idx ? 'opacity-50' : 'opacity-100'}`}>
                        {page.status === 'completed' ? (
                            <img src={page.imageUrl} className="w-full h-full object-cover" alt="" />
                        ) : (
                            <div className="w-full h-full bg-gray-50 flex items-center justify-center">
                                <div className={`w-2 h-2 rounded-full ${page.status === 'generating' ? 'bg-brand-400 animate-bounce' : 'bg-gray-300'}`}></div>
                            </div>
                        )}
                        
                        {/* Status Overlay */}
                        {page.status === 'failed' && (
                            <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                                <AlertCircle size={12} className="text-red-600" />
                            </div>
                        )}
                    </div>
                    
                    {/* Page Number Label */}
                    <div className="text-[10px] text-center mt-1 font-bold text-gray-400">
                        {page.type === PageType.COVER ? 'COV' : page.type === PageType.BACK_COVER ? 'BCK' : idx}
                    </div>

                    {/* Drag Handle Indicator */}
                    {page.type === PageType.INTERIOR && !isGenerating && (
                        <div className="absolute top-0 right-0 p-0.5 bg-black/30 rounded-bl-md opacity-0 group-hover:opacity-100 transition">
                            <Move size={10} className="text-white" />
                        </div>
                    )}
                </div>
            ))}
         </div>
      </div>
    </div>
  );
};