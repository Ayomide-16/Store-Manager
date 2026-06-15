
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, FileText, Table, Upload, Download, Printer } from 'lucide-react';

interface FileActionMenuProps {
  label: string;
  type: 'import' | 'export';
  onAction: (format: 'csv' | 'xlsx' | 'pdf') => void;
  className?: string;
  icon?: React.ReactNode;
  showPdf?: boolean;
}

const FileActionMenu: React.FC<FileActionMenuProps> = ({ label, type, onAction, className, icon, showPdf }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const baseStyles = "relative inline-block text-left no-print";
  const buttonStyles = className || "px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-all active:scale-95 text-xs";

  return (
    <div className={baseStyles} ref={menuRef}>
      <button 
        type="button" 
        onClick={() => setIsOpen(!isOpen)}
        className={className || "px-4 py-2 border border-slate-200 rounded-2xl text-slate-900 bg-white font-medium font-bold text-[10px]  tracking-normal flex items-center gap-2 shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-sm transition-all"}
      >
        {icon || (type === 'import' ? <Upload className="w-4 h-4" /> : <Download className="w-4 h-4" />)}
        {label}
        <ChevronDown className={`w-4 h-4 ml-1 transition-transform border-l-2 border-slate-200 pl-1 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 shadow-[0_2px_10px_rgb(0,0,0,0.02)] z-50 animate-in fade-in zoom-in duration-200">
          <button 
            onClick={() => { onAction('csv'); setIsOpen(false); }}
            className="w-full text-left px-5 py-4 text-xs font-medium font-bold  text-slate-900 hover:bg-white/60 backdrop-blur-3xl border-b-2 border-slate-200 flex items-center gap-3 transition-colors"
          >
            <FileText className="w-5 h-5 text-slate-900" />
            CSV Format
          </button>
          <button 
            onClick={() => { onAction('xlsx'); setIsOpen(false); }}
            className={`w-full text-left px-5 py-4 text-xs font-medium font-bold  text-slate-900 hover:bg-white/60 backdrop-blur-3xl ${showPdf ? 'border-b-2 border-slate-200' : ''} flex items-center gap-3 transition-colors`}
          >
            <Table className="w-5 h-5 text-blue-500" />
            Excel Format (.xlsx)
          </button>
          {showPdf && (
            <button 
              onClick={() => { onAction('pdf'); setIsOpen(false); }}
              className="w-full text-left px-5 py-4 text-xs font-medium font-bold  text-slate-900 hover:bg-white/60 backdrop-blur-3xl flex items-center gap-3 transition-colors bg-blue-600 text-white hover:text-slate-900"
            >
              <Printer className="w-5 h-5" />
              Print / PDF
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FileActionMenu;
