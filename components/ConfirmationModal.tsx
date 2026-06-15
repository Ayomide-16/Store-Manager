import React from 'react';
import { AlertCircle, X, Loader2 } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'info',
  isLoading = false
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      bg: 'bg-red-50 text-red-900',
      icon: 'bg-red-500 text-white border border-slate-200 rounded-2xl',
      button: 'bg-red-500 text-white border border-slate-200 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)]',
      title: 'text-red-900'
    },
    warning: {
      bg: 'bg-yellow-50 text-yellow-900',
      icon: 'bg-yellow-400 text-slate-900 border border-slate-200 rounded-2xl',
      button: 'bg-yellow-400 text-slate-900 border border-slate-200 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)]',
      title: 'text-yellow-900'
    },
    info: {
      bg: 'bg-white text-slate-900',
      icon: 'bg-blue-600 text-white border border-slate-200 rounded-2xl',
      button: 'bg-blue-600 text-white border border-slate-200 rounded-2xl shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)]',
      title: 'text-slate-900'
    }
  };

  const style = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => !isLoading && onClose()}></div>
      <div className={`relative w-full max-w-sm border border-slate-200 rounded-[2rem] shadow-sm bg-white/80 backdrop-blur-xl ring-1 ring-slate-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden animate-in zoom-in duration-200 p-8 text-center ${style.bg}`}>
        <div className={`w-16 h-16 ${style.icon} flex items-center justify-center mx-auto mb-6 shadow-[0_2px_10px_rgb(0,0,0,0.02)]`}>
          <AlertCircle className="w-8 h-8" />
        </div>
        
        <h3 className={`text-2xl font-semibold tracking-tight font-medium mb-4 ${style.title}`}>{title}</h3>
        <p className="text-sm mb-8 leading-relaxed font-sans font-medium">{message}</p>
        
        <div className="flex flex-col gap-4 mt-8">
          <button 
            disabled={isLoading}
            onClick={onConfirm}
            className={`w-full py-4 font-medium font-bold text-xs  tracking-normal transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${style.button}`}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
          <button 
            disabled={isLoading}
            onClick={onClose}
            className="w-full py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl font-medium font-bold text-xs  tracking-normal shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-[0_2px_10px_rgb(0,0,0,0.02)] transition-all disabled:opacity-50"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;