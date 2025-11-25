import React, { useState, useCallback, useRef } from 'react';
import { BookConfig, BookState, GeneratedPage, PageType } from './types';
import { ConfigForm } from './components/ConfigForm';
import { BookPreview } from './components/BookPreview';
import { generateImage, generatePagePrompt } from './services/gemini';
import { Palette, Info, AlertCircle, FileDown, Layers } from 'lucide-react';
import JSZip from 'jszip';
import jsPDF from 'jspdf';

const DEFAULT_CONFIG: BookConfig = {
  title: "Cozy Cottage Cuties",
  topic: "Cute animals in cozy cottages drinking tea",
  pageCount: 5,
  style: "Kawaii Cottagecore",
  aspectRatio: '3:4',
  styleMode: 'standard', // Default mode
  hasFrames: true
};

export default function App() {
  const [bookState, setBookState] = useState<BookState>({
    config: DEFAULT_CONFIG,
    pages: [],
    isGenerating: false,
    currentStep: 'idle'
  });

  // We use a ref to control the stopping mechanism synchronously in the loop
  const shouldStopRef = useRef(false);

  // --- ACTIONS ---

  const stopGeneration = useCallback(() => {
    shouldStopRef.current = true;
    setBookState(prev => ({ 
      ...prev, 
      isGenerating: false, 
      currentStep: 'Production paused.' 
    }));
  }, []);

  const resetBook = useCallback(() => {
    stopGeneration();
    setBookState(prev => ({
      ...prev,
      pages: [],
      currentStep: 'Studio ready.',
      isGenerating: false
    }));
  }, [stopGeneration]);

  // --- CORE GENERATION LOOP ---
  const generateBook = useCallback(async (isResuming: boolean = false) => {
    if (bookState.isGenerating) return;

    shouldStopRef.current = false;
    let currentPages: GeneratedPage[] = [];

    // 1. Setup Pages
    if (isResuming && bookState.pages.length > 0) {
      currentPages = [...bookState.pages];
      // Sync page count if changed
      const totalDesired = bookState.config.pageCount + 2; 
      if (currentPages.length < totalDesired) {
         const insertIndex = currentPages.length - 1; // Before back cover
         for (let i = currentPages.length - 1; i < totalDesired - 1; i++) {
            currentPages.splice(insertIndex, 0, {
                id: `page-${Date.now()}-${i}`,
                type: PageType.INTERIOR,
                pageNumber: 0, // Will recalculate
                imageUrl: '',
                prompt: '',
                status: 'pending'
            });
         }
      }
      setBookState(prev => ({ ...prev, pages: currentPages, isGenerating: true }));
    } else {
      // New Book
      currentPages.push({ id: 'cover', type: PageType.COVER, imageUrl: '', prompt: '', status: 'pending' });
      for (let i = 0; i < bookState.config.pageCount; i++) {
        currentPages.push({ id: `p-${i}`, type: PageType.INTERIOR, pageNumber: i + 1, imageUrl: '', prompt: '', status: 'pending' });
      }
      currentPages.push({ id: 'back', type: PageType.BACK_COVER, imageUrl: '', prompt: '', status: 'pending' });
      
      setBookState(prev => ({ ...prev, pages: currentPages, isGenerating: true, currentStep: 'Initializing...' }));
    }

    // 2. Loop
    // Recalculate numbering just in case of reorders
    currentPages.forEach((p, idx) => {
        if (p.type === PageType.INTERIOR) p.pageNumber = idx; 
    });

    for (let i = 0; i < currentPages.length; i++) {
        // Critical Check: Stop before processing
        if (shouldStopRef.current) break;

        const page = currentPages[i];
        if (page.status === 'completed') continue;

        // Update UI
        setBookState(prev => {
            const newPages = [...prev.pages];
            newPages[i] = { ...newPages[i], status: 'generating' };
            return { ...prev, pages: newPages, currentStep: `Generating Page ${i+1}/${currentPages.length}...` };
        });

        try {
            // Heartbeat Wait (prevents API flooding)
            // 2500ms is the sweet spot for Gemini Flash Image to allow refills of the bucket
            await new Promise(r => setTimeout(r, 2500));
            if (shouldStopRef.current) break;

            // Generate Prompt if missing
            let promptText = page.prompt;
            if (!promptText) {
                promptText = await generatePagePrompt(bookState.config, i, bookState.config.pageCount);
                // Update Prompt in state
                setBookState(prev => {
                    const ps = [...prev.pages];
                    ps[i].prompt = promptText;
                    return { ...prev, pages: ps };
                });
            }

            if (shouldStopRef.current) break;

            // Generate Image
            const imgUrl = await generateImage(promptText, page.type, bookState.config);
            
            if (shouldStopRef.current) break;

            // Save Success
            setBookState(prev => {
                const ps = [...prev.pages];
                ps[i] = { ...ps[i], imageUrl: imgUrl, status: 'completed' };
                return { ...prev, pages: ps };
            });

        } catch (e) {
            console.error(e);
            if (shouldStopRef.current) break;
            setBookState(prev => {
                const ps = [...prev.pages];
                ps[i].status = 'failed';
                return { ...prev, pages: ps };
            });
        }
    }

    setBookState(prev => ({ ...prev, isGenerating: false, currentStep: shouldStopRef.current ? 'Paused' : 'Done' }));

  }, [bookState.config, bookState.pages, bookState.isGenerating]);

  // --- SINGLE PAGE REGENERATE ---
  const regenerateSinglePage = async (pageId: string) => {
    if (bookState.isGenerating) return;

    const pageIndex = bookState.pages.findIndex(p => p.id === pageId);
    if (pageIndex === -1) return;

    setBookState(prev => ({ ...prev, isGenerating: true, currentStep: 'Regenerating page...' }));
    
    // Set specific page to generating
    setBookState(prev => {
        const ps = [...prev.pages];
        ps[pageIndex].status = 'generating';
        return { ...prev, pages: ps };
    });

    try {
        const page = bookState.pages[pageIndex];
        // Reuse prompt but maybe add a tiny seed variation in backend if possible, 
        // Gemini handles randomness naturally.
        const imgUrl = await generateImage(page.prompt, page.type, bookState.config);
        
        setBookState(prev => {
            const ps = [...prev.pages];
            ps[pageIndex] = { ...ps[pageIndex], imageUrl: imgUrl, status: 'completed' };
            return { ...prev, pages: ps, isGenerating: false, currentStep: 'Ready' };
        });
    } catch (e) {
        setBookState(prev => {
            const ps = [...prev.pages];
            ps[pageIndex].status = 'failed';
            return { ...prev, pages: ps, isGenerating: false, currentStep: 'Error' };
        });
    }
  };

  // --- REORDERING ---
  const handleReorder = (fromIndex: number, toIndex: number) => {
    setBookState(prev => {
        const newPages = [...prev.pages];
        const [movedPage] = newPages.splice(fromIndex, 1);
        newPages.splice(toIndex, 0, movedPage);
        
        // Recalculate internal page numbers for UI consistency
        // Note: We don't change the content prompt, just the order
        return { ...prev, pages: newPages };
    });
  };

  // --- EXPORT PDF ---
  const exportPDF = async () => {
    if (bookState.pages.length === 0) return;
    
    // A4 Dimensions in mm
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = 210;
    const pageHeight = 297;

    for (let i = 0; i < bookState.pages.length; i++) {
        const page = bookState.pages[i];
        if (i > 0) doc.addPage();

        if (page.status === 'completed' && page.imageUrl) {
            try {
                // Calculate dimensions based on aspect ratio config
                let imgW = pageWidth;
                let imgH = pageHeight;
                
                // For 1:1, we want it centered square
                if (bookState.config.aspectRatio === '1:1') {
                    imgH = pageWidth; // Square
                }

                const yOffset = (pageHeight - imgH) / 2;

                doc.addImage(page.imageUrl, 'PNG', 0, yOffset, imgW, imgH);
                
                // Optional: Add small page number at bottom if interior
                if (page.type === PageType.INTERIOR) {
                    doc.setFontSize(10);
                    doc.setTextColor(150);
                    doc.text(`${i}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
                }

            } catch (e) {
                console.error("Error adding page to PDF", e);
            }
        }
    }

    doc.save(`${bookState.config.title.replace(/\s+/g, '_')}.pdf`);
  };

  // --- EXPORT ZIP ---
  const exportZIP = async () => {
      const zip = new JSZip();
      const folder = zip.folder("images");
      bookState.pages.forEach((p, i) => {
          if (p.imageUrl.startsWith('data:')) {
             folder?.file(`image_${i}.png`, p.imageUrl.split(',')[1], {base64: true});
          }
      });
      const content = await zip.generateAsync({type:"blob"});
      const link = document.createElement('a');
      link.href = URL.createObjectURL(content);
      link.download = "images.zip";
      link.click();
  };

  const hasPages = bookState.pages.length > 0;
  const isDone = bookState.pages.every(p => p.status === 'completed' || p.status === 'failed') && hasPages;
  const hasUnfinishedWork = bookState.pages.some(p => p.status !== 'completed');

  return (
    <div className="min-h-screen flex flex-col bg-stone-50 font-sans">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50 shadow-sm h-16">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-brand-600 p-1.5 rounded-lg">
                <Palette className="text-white" size={20} />
            </div>
            <h1 className="text-xl font-extrabold text-gray-800">Coloring Book <span className="text-brand-600">Factory</span></h1>
          </div>
          <div className="flex gap-2">
             {hasPages && (
                 <>
                    <button onClick={exportZIP} className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700">
                        <Layers size={16}/> ZIP
                    </button>
                    <button onClick={exportPDF} className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold bg-brand-600 text-white rounded-lg hover:bg-brand-700 shadow-md">
                        <FileDown size={16}/> PDF
                    </button>
                 </>
             )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 gap-6 grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-4 space-y-6">
            <ConfigForm 
                config={bookState.config} 
                onChange={(c) => setBookState(prev => ({ ...prev, config: c }))}
                onGenerate={() => generateBook(false)}
                onResume={() => generateBook(true)}
                onStop={stopGeneration}
                onReset={resetBook}
                isGenerating={bookState.isGenerating}
                hasPages={hasPages}
                hasUnfinishedWork={hasUnfinishedWork}
            />

            <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm text-sm">
                <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-gray-600 flex items-center gap-2"><Info size={14}/> Status</span>
                    <span className="text-brand-600 font-medium truncate max-w-[150px]">{bookState.currentStep}</span>
                </div>
                {hasPages && (
                     <div className="w-full bg-gray-100 rounded-full h-2">
                         <div className="bg-brand-500 h-2 rounded-full transition-all duration-500" style={{ width: `${(bookState.pages.filter(p=>p.status==='completed').length / bookState.pages.length)*100}%` }}></div>
                     </div>
                )}
            </div>

            {!process.env.API_KEY && (
                <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-xs text-red-700">
                   <AlertCircle size={14} className="inline mr-1"/> Check Vercel API_KEY.
                </div>
            )}
        </div>

        <div className="lg:col-span-8">
           <BookPreview 
                pages={bookState.pages} 
                isGenerating={bookState.isGenerating} 
                onRegeneratePage={regenerateSinglePage}
                onReorderPages={handleReorder}
           />
        </div>
      </main>
    </div>
  );
}