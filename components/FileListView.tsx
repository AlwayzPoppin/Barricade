
import React from 'react';
import { FileItem, FolderType } from '../types';
import { ICONS } from '../constants';

interface FileListViewProps {
  folder: FolderType;
  files: FileItem[];
  onTriggerAI: (command: string) => void;
  onUpdateFile: (fileId: string, updates: Partial<FileItem>) => void;
}

const FileListView: React.FC<FileListViewProps> = ({ folder, files, onTriggerAI, onUpdateFile }) => {
  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleManualQuarantine = (file: FileItem) => {
    onUpdateFile(file.id, { 
      folder: FolderType.QUARANTINE, 
      threatLevel: 'suspicious' 
    });
    onTriggerAI(`I have manually quarantined ${file.name}. Please perform an immediate security audit on this object.`);
  };

  return (
    <div className="p-6 h-full flex flex-col select-none relative z-10">
      <div className="mb-6 flex items-start justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">{folder} Sector</h2>
          </div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            Audit Coverage: {files.length} identified objects
          </p>
        </div>
        <div className="flex gap-2">
          {folder === FolderType.SCREENSHOTS && (
            <button onClick={() => onTriggerAI(`Zenith, audit my Screenshots for PII or sensitive data.`)} className="flex items-center gap-2 bg-rose-500/10 hover:bg-rose-500 border border-rose-500/30 text-rose-400 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black transition-all uppercase">
              {ICONS.Privacy} Privacy Audit
            </button>
          )}
          <button onClick={() => onTriggerAI(`Perform a malware sweep on the ${folder} folder.`)} className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded-xl text-[10px] font-black transition-all uppercase shadow-lg shadow-indigo-500/20">
            {ICONS.Security} Sweep Sector
          </button>
        </div>
      </div>

      <div className="glass rounded-3xl border border-slate-700/50 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto custom-scrollbar flex-1">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-700/50 bg-slate-800/30 sticky top-0 z-10">
                <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-tighter">Object ID</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-tighter">Health / Privacy</th>
                <th className="px-6 py-4 text-[9px] font-black text-slate-500 uppercase tracking-tighter text-right">Directives</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {files.map((file) => (
                <tr key={file.id} className="group hover:bg-slate-800/40 transition-all">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-slate-500 group-hover:text-indigo-400 transition-colors`}>
                        {file.threatLevel === 'malicious' ? ICONS.Warning : ICONS.Downloads}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-200 truncate max-w-[180px]">{file.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono uppercase">{formatSize(file.size)} • {file.extension}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {file.privacyLevel === 'critical' && (
                        <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 text-[9px] font-black uppercase border border-rose-500/20 rounded animate-pulse">
                          Privacy Risk: {file.tags?.[0] || 'Sensitive'}
                        </span>
                      )}
                      {file.threatLevel === 'malicious' && (
                        <span className="px-2 py-0.5 bg-rose-600 text-white text-[9px] font-black uppercase rounded">Malicious</span>
                      )}
                      {file.threatLevel === 'safe' && file.privacyLevel !== 'critical' && (
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase border border-emerald-500/20 rounded">Integrity Verified</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {folder !== FolderType.QUARANTINE && (
                        <button 
                          onClick={() => handleManualQuarantine(file)} 
                          className={`opacity-0 group-hover:opacity-100 p-2 rounded-lg transition-all ${file.threatLevel === 'malicious' ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white' : 'bg-slate-800 text-slate-400 hover:text-indigo-400'}`}
                          title="Quarantine Object"
                        >
                          {ICONS.Quarantine}
                        </button>
                      )}
                      {file.privacyLevel === 'critical' && (
                        <button onClick={() => onTriggerAI(`Shred ${file.name} to prevent data leakage.`)} className="opacity-0 group-hover:opacity-100 p-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white rounded-lg transition-all" title="Secure Shred">
                          {ICONS.Shred}
                        </button>
                      )}
                      <button onClick={() => onTriggerAI(`Show me the metadata for ${file.name}`)} className="opacity-0 group-hover:opacity-100 p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all">
                        {ICONS.AI}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {files.length === 0 && (
                <tr><td colSpan={3} className="py-20 text-center text-slate-600 text-xs italic">Sector empty. Integrity at 100%.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FileListView;
