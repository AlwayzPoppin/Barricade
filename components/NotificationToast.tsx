
import React from 'react';
import { ICONS } from '../constants';

interface NotificationToastProps {
  id: string;
  title: string;
  message: string;
  onAction: (id: string) => void;
  onDismiss: (id: string) => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({ id, title, message, onAction, onDismiss }) => {
  return (
    <div className="fixed top-6 right-6 z-[100] w-80 glass border border-indigo-500/30 rounded-2xl shadow-2xl shadow-indigo-500/10 animate-in slide-in-from-right-10 duration-500 overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            {ICONS.AI}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-black text-white uppercase tracking-widest mb-1">{title}</h4>
            <p className="text-xs text-slate-400 leading-relaxed">{message}</p>
          </div>
          <button onClick={() => onDismiss(id)} className="text-slate-500 hover:text-white">
            {ICONS.Close}
          </button>
        </div>
        <div className="mt-4 flex gap-2">
          <button 
            onClick={() => onAction(id)}
            className="flex-1 bg-indigo-500 hover:bg-indigo-400 text-white text-[10px] font-black uppercase py-2 rounded-lg transition-all"
          >
            Review Suggestion
          </button>
          <button 
            onClick={() => onDismiss(id)}
            className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] font-black uppercase py-2 rounded-lg transition-all"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationToast;
