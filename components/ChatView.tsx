
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, FileItem, FolderType } from '../types';
import { ICONS } from '../constants';
import { ZenithLiveManager, LiveSessionState } from '../services/liveService';

interface ChatViewProps {
  messages: ChatMessage[];
  isTyping: boolean;
  files: FileItem[];
  onSendMessage: (text: string) => void;
  onApproveAction: (messageId: string) => void;
  onDeclineAction: (messageId: string) => void;
  onSwitchFolder: (folder: FolderType) => void;
}

const ChatView: React.FC<ChatViewProps> = ({ messages, isTyping, files, onSendMessage, onApproveAction, onDeclineAction, onSwitchFolder }) => {
  const [input, setInput] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<LiveSessionState['status']>('idle');
  const [liveTranscript, setLiveTranscript] = useState<{ role: string, text: string } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const liveManager = useRef<ZenithLiveManager | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isTyping, liveTranscript]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      onSendMessage(input);
      setInput('');
    }
  };

  const toggleLiveMode = async () => {
    if (liveStatus === 'active' || liveStatus === 'connecting') {
      liveManager.current?.stop();
      setLiveStatus('idle');
      return;
    }

    if (!liveManager.current) {
      liveManager.current = new ZenithLiveManager(
        (text, role) => setLiveTranscript({ role, text }),
        (status) => setLiveStatus(status)
      );
    }
    await liveManager.current.start();
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
    return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
  };

  const filteredItems = files.filter(f => {
    const matchesSearch = searchTerm.trim() === '' ||
      f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.extension.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = !filterType || f.type.toLowerCase() === filterType.toLowerCase();
    return matchesSearch && matchesFilter;
  }).slice(0, 15);

  const getFileIcon = (file: FileItem) => {
    if (file.folder === FolderType.APPLICATIONS) return ICONS.Apps;
    const ext = file.extension.toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(ext)) return ICONS.FileImage;
    if (['.pdf'].includes(ext)) return ICONS.FilePDF;
    if (['.exe', '.app', '.bat'].includes(ext)) return ICONS.FileExecutable;
    return ICONS.Downloads;
  };

  return (
    <div className="flex flex-col h-full w-full p-4 lg:p-6 relative">
      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pb-4 px-2">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'glass text-slate-200 rounded-tl-none border-slate-700/50'}`}>{msg.text}</div>
              {msg.pendingAction && (
                <div className={`mt-3 w-full glass border rounded-2xl p-4 ${msg.pendingAction.type === 'VAULT' || msg.pendingAction.type === 'ORGANIZE' || msg.pendingAction.type === 'UPDATE_SETTINGS' || msg.pendingAction.type === 'DEEP_SCAN' ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-rose-500/30 bg-rose-500/5'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${msg.pendingAction.type === 'VAULT' || msg.pendingAction.type === 'ORGANIZE' || msg.pendingAction.type === 'UPDATE_SETTINGS' || msg.pendingAction.type === 'DEEP_SCAN' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-rose-500/20 text-rose-400'}`}>
                      {msg.pendingAction.type === 'LAUNCH_APP' ? ICONS.Launch : msg.pendingAction.type === 'VAULT' ? ICONS.Vault : msg.pendingAction.type === 'ORGANIZE' ? ICONS.Downloads : msg.pendingAction.type === 'UPDATE_SETTINGS' ? ICONS.Storage : msg.pendingAction.type === 'DEEP_SCAN' ? ICONS.AI : ICONS.Security}
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-widest ${msg.pendingAction.type === 'VAULT' || msg.pendingAction.type === 'ORGANIZE' || msg.pendingAction.type === 'UPDATE_SETTINGS' || msg.pendingAction.type === 'DEEP_SCAN' ? 'text-indigo-400' : 'text-rose-400'}`}>
                      {msg.pendingAction.type === 'LAUNCH_APP' ? 'Barricade Launch' : msg.pendingAction.type === 'VAULT' ? 'Vault Chamber' : msg.pendingAction.type === 'ORGANIZE' ? 'Smart Organize' : msg.pendingAction.type === 'UPDATE_SETTINGS' ? 'System Config' : msg.pendingAction.type === 'DEEP_SCAN' ? 'Forensic Audit' : 'Barricade Shield'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-4">{String(msg.pendingAction.description)}</p>
                  <div className="flex gap-2">
                    <button onClick={() => onApproveAction(msg.id)} className="flex-1 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold py-2 rounded-xl transition-all">Execute</button>
                    <button onClick={() => onDeclineAction(msg.id)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-2 rounded-xl transition-all">Ignore</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {liveStatus !== 'idle' && (
          <div className="flex flex-col items-center gap-4 py-8 glass rounded-3xl border-indigo-500/30 animate-in zoom-in-95 duration-300">
            <div className="relative w-24 h-24 flex items-center justify-center">
              <div className={`absolute inset-0 rounded-full bg-indigo-500/10 blur-xl ${liveStatus === 'active' ? 'animate-pulse' : ''}`}></div>
              <div className="flex items-end gap-1 h-12">
                {[1, 2, 3, 4, 5, 6, 7].map(i => (
                  <div key={i}
                    className={`w-1.5 bg-indigo-400 rounded-full transition-all duration-300 ${liveStatus === 'active' ? 'animate-[bounce_1s_infinite]' : 'h-2'}`}
                    style={{ animationDelay: `${i * 0.1}s`, height: liveStatus === 'active' ? `${Math.random() * 100}%` : '8px' }}
                  ></div>
                ))}
              </div>
            </div>
            <div className="text-center">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2 block">
                {liveStatus === 'connecting' ? 'Initiating Pulse...' : 'Barricade Live Active'}
              </span>
              {liveTranscript && (
                <p className="text-xs text-slate-300 italic px-6 line-clamp-2">"{liveTranscript.text}"</p>
              )}
            </div>
          </div>
        )}

        {(isTyping || liveStatus === 'connecting') && <div className="flex justify-start"><div className="glass px-5 py-4 rounded-2xl rounded-tl-none border-slate-700/50 flex gap-1.5"><div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></div><div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></div></div></div>}
      </div>

      {isSearchOpen && (
        <div className="mb-4 bg-slate-900/90 border border-slate-700/50 rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300 backdrop-blur-xl">
          <div className="p-4 border-b border-slate-700/50 flex items-center justify-between bg-slate-800/20">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded bg-rose-600/20 flex items-center justify-center text-rose-500">{ICONS.Security}</div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-100">Barricade Scan Results</span>
            </div>
            <button onClick={() => { setIsSearchOpen(false); setSearchTerm(''); setFilterType(null); }} className="p-1 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-white transition-colors">{ICONS.Close}</button>
          </div>

          <div className="p-4">
            <input autoFocus type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Query system files..." className="w-full bg-slate-800/50 border border-slate-700/50 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 mb-3" />

            <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2">
              {filteredItems.map(item => (
                <button key={item.id} onClick={() => { onSwitchFolder(item.folder); onSendMessage(`Barricade, analyze ${item.name}.`); setIsSearchOpen(false); }} className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/30 hover:bg-slate-700/50 group transition-all">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-slate-400 group-hover:text-indigo-400">{getFileIcon(item)}</div>
                    <div className="flex flex-col items-start min-w-0">
                      <span className="text-xs font-bold text-slate-200 truncate">{item.name}</span>
                      <span className="text-[9px] text-indigo-400 uppercase font-bold">{item.folder}</span>
                    </div>
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono">{formatSize(item.size)}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 relative flex gap-2">
        <button
          type="button"
          onClick={toggleLiveMode}
          className={`p-4 rounded-2xl border transition-all duration-300 shadow-xl ${liveStatus === 'active' ? 'bg-rose-500 text-white border-rose-400 animate-pulse' : 'bg-slate-900/50 text-slate-500 border-slate-700/50 hover:text-indigo-400 hover:border-indigo-500/30'}`}
          title="Voice Command"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>
        <button type="button" onClick={() => setIsSearchOpen(!isSearchOpen)} className={`p-4 rounded-2xl border transition-all duration-300 shadow-xl ${isSearchOpen ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-slate-900/50 text-slate-500 border-slate-700/50 hover:text-indigo-400 hover:border-indigo-500/30'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </button>
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Issue Barricade Command..." className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-2xl px-5 py-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50" />
        <button type="submit" className="px-6 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl transition-all active:scale-95 flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
        </button>
      </form>
    </div>
  );
};

export default ChatView;
