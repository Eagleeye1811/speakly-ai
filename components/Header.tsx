import React from 'react';
import { ChevronLeft, Mic2 } from 'lucide-react';

interface HeaderProps {
  onHome: () => void;
  isSessionActive: boolean;
}

export default function Header({ onHome, isSessionActive }: HeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isSessionActive ? (
            <button 
              onClick={onHome}
              className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-600 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          ) : (
             <div className="bg-blue-600 p-2 rounded-lg text-white">
               <Mic2 className="w-5 h-5" />
             </div>
          )}
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            CommCoach AI
          </h1>
        </div>
        
        <div className="text-sm font-medium text-slate-500">
           {isSessionActive ? (
             <span className="flex items-center gap-2 text-red-500 animate-pulse">
               <span className="w-2 h-2 bg-red-500 rounded-full"></span>
               Live Session
             </span>
           ) : (
             <span>Ready to practice</span>
           )}
        </div>
      </div>
    </header>
  );
}