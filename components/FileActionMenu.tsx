
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
        className={buttonStyles}
      >
        {icon || (type === 'import' ? <Upload className="w-4 h-4" /> : <Download className="w-4 h-4" />)}
        {label}
        <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 animate-in fade-in zoom-in duration-200 py-2">
          <button 
            onClick={() => { onAction('csv'); setIsOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors"
          >
            <FileText className="w-4 h-4 text-slate-400" />
            CSV Format
          </button>
          <button 
            onClick={() => { onAction('xlsx'); setIsOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors"
          >
            <Table className="w-4 h-4 text-emerald-500" />
            Excel Format (.xlsx)
          </button>
          {showPdf && (
            <button 
              onClick={() => { onAction('pdf'); setIsOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3 transition-colors"
            >
              <Printer className="w-4 h-4 text-indigo-500" />
              Print / PDF
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FileActionMenu;
