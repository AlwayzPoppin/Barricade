
import React from 'react';
import { Suggestion, FileItem } from '../types';
import { ICONS } from '../constants';

interface SuggestionCardProps {
  suggestion: Suggestion;
  files: FileItem[];
  onApprove: (id: string) => void;
  onDismiss: (id: string) => void;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion, files, onApprove, onDismiss }) => {
  const targetFiles = files.filter(f => suggestion.targetFiles.includes(f.id));

  const priorityColors = {
    low: 'bg-blue-500/20 text-blue-400',
    medium: 'bg-amber-500/20 text-amber-400',
    high: 'bg-rose-500/20 text-rose-400'
  };

  return (
    <div className="glass rounded-2xl p-6 border border-slate-700/50 hover:border-indigo-500/30 transition-all duration-300 group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${priorityColors[suggestion.priority]}`}>
              {suggestion.priority} priority
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-700 text-slate-300">
              {suggestion.folder}
            </span>
          </div>
          <h3 className="text-lg font-bold text-slate-100 group-hover:text-indigo-400 transition-colors">
            {suggestion.title}
          </h3>
        </div>
        <button onClick={() => onDismiss(suggestion.id)} className="text-slate-500 hover:text-slate-300 transition-colors p-1">
          {ICONS.Close}
        </button>
      </div>

      <p className="text-sm text-slate-400 leading-relaxed mb-6">
        {suggestion.description}
      </p>

      <div className="space-y-2 mb-6">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Target Files ({targetFiles.length})</p>
        <div className="flex flex-wrap gap-2">
          {targetFiles.slice(0, 3).map(file => (
            <div key={file.id} className="text-[11px] bg-slate-800/60 border border-slate-700/50 px-2 py-1 rounded-md text-slate-300 truncate max-w-[150px]">
              {file.name}
            </div>
          ))}
          {targetFiles.length > 3 && (
            <div className="text-[11px] bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded-md text-indigo-400">
              +{targetFiles.length - 3} more
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => onApprove(suggestion.id)}
          className="flex-1 flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2.5 rounded-xl font-semibold transition-all transform active:scale-95 shadow-lg shadow-indigo-500/20"
        >
          {ICONS.Check}
          Approve Action
        </button>
        <button
          onClick={() => onDismiss(suggestion.id)}
          className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:bg-slate-800 transition-all font-semibold"
        >
          Ignore
        </button>
      </div>
    </div>
  );
};

export default SuggestionCard;
