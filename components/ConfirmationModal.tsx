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
      bg: 'bg-rose-50',
      icon: 'bg-rose-100 text-rose-600',
      button: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20',
      title: 'text-rose-900'
    },
    warning: {
      bg: 'bg-amber-50',
      icon: 'bg-amber-100 text-amber-600',
      button: 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20',
      title: 'text-amber-900'
    },
    info: {
      bg: 'bg-indigo-50',
      icon: 'bg-indigo-100 text-indigo-600',
      button: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20',
      title: 'text-indigo-900'
    }
  };

  const style = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => !isLoading && onClose()}></div>
      <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-200 p-8 text-center">
        <div className={`w-16 h-16 ${style.icon} rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner`}>
          <AlertCircle className="w-8 h-8" />
        </div>
        
        <h3 className={`text-xl font-black mb-2 ${style.title}`}>{title}</h3>
        <p className="text-slate-500 text-sm mb-8 leading-relaxed font-medium">{message}</p>
        
        <div className="flex flex-col gap-3">
          <button 
            disabled={isLoading}
            onClick={onConfirm}
            className={`w-full py-4 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 ${style.button}`}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
          <button 
            disabled={isLoading}
            onClick={onClose}
            className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;