
import React, { useState, useEffect, useRef, useMemo } from 'react';
import FileListView from './components/FileListView';
import ChatView from './components/ChatView';
import SettingsView from './components/SettingsView';
import VaultPINOverlay from './components/VaultPINOverlay';
import SecurityPulse from './components/SecurityPulse';
import NotificationToast from './components/NotificationToast';
import { createOmniChat } from './services/geminiService';
import { scanUserDirectories, quarantineFile, deleteFile, shredFile, getDiskInfo, vaultFile, unvaultFile, organizeFiles, showNativeNotification, onNativeNotificationClick, onRapidAudit, deepScanFile } from './services/fileSystemService';
import { AppSettings, AssistantState, FileItem, FolderType, ChatMessage, Notification } from './types';
import { ICONS } from './constants';
import { Chat } from '@google/genai';

const App: React.FC = () => {
  const [activePreview, setActivePreview] = useState<FolderType | 'none' | 'settings'>('none');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [diskInfo, setDiskInfo] = useState({ total: 1024 * 1024 * 1024 * 500, used: 0, free: 0 });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [snoozeMap, setSnoozeMap] = useState<Record<string, number>>({});
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const [showVaultPIN, setShowVaultPIN] = useState(false);

  // Refs for background listeners to avoid stale closures
  const settingsRef = useRef(settings);
  const filesRef = useRef(files);
  const notificationsRef = useRef(notifications);
  const snoozeMapRef = useRef(snoozeMap);

  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { filesRef.current = files; }, [files]);
  useEffect(() => { notificationsRef.current = notifications; }, [notifications]);
  useEffect(() => { snoozeMapRef.current = snoozeMap; }, [snoozeMap]);

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('barricade_settings');
    if (saved) return JSON.parse(saved);
    return {
      aiSensitivity: 'medium',
      enableNativeNotifications: true,
      enableProactiveSentry: true,
      sentryScanInterval: 1,
      autoOrganizeDownloads: false,
      monitoredFolders: [FolderType.DOWNLOADS, FolderType.SCREENSHOTS, FolderType.DOCUMENTS],
      vaultStoragePath: '',
      vaultPin: '1234',
      isVaultLocked: true
    };
  });

  const [securityHistory, setSecurityHistory] = useState(() => {
    const saved = localStorage.getItem('barricade_history');
    if (saved) return JSON.parse(saved);
    // Seed data
    const now = new Date();
    return [
      { date: new Date(now.getTime() - 86400000 * 6).toISOString(), score: 95, threats: 1 },
      { date: new Date(now.getTime() - 86400000 * 5).toISOString(), score: 98, threats: 0 },
      { date: new Date(now.getTime() - 86400000 * 4).toISOString(), score: 92, threats: 2 },
      { date: new Date(now.getTime() - 86400000 * 3).toISOString(), score: 96, threats: 0 },
      { date: new Date(now.getTime() - 86400000 * 2).toISOString(), score: 99, threats: 0 },
      { date: new Date(now.getTime() - 86400000 * 1).toISOString(), score: 98, threats: 1 },
      { date: now.toISOString(), score: 100, threats: 0 },
    ];
  });

  useEffect(() => {
    localStorage.setItem('barricade_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('barricade_history', JSON.stringify(securityHistory));
  }, [securityHistory]);

  const stats = useMemo(() => {
    const apps = files.filter(f => f.type === 'Application' || f.type === 'Software').reduce((acc, f) => acc + (f.size || 0), 0);
    const media = files.filter(f => f.type === 'Image' || f.type === 'Video').reduce((acc, f) => acc + (f.size || 0), 0);
    const junk = files.filter(f => f.folder === FolderType.RECYCLE_BIN).reduce((acc, f) => acc + (f.size || 0), 0);
    return { used: diskInfo.used, total: diskInfo.total, apps, media, junk };
  }, [files, diskInfo]);

  const integrityScore = useMemo(() => {
    let score = 98;
    files.forEach(f => {
      if (f.threatLevel === 'malicious') score -= 20;
      if (f.threatLevel === 'suspicious') score -= 5;
      if (f.privacyLevel === 'critical') score -= 10;
    });
    return Math.max(0, score);
  }, [files]);

  const [state, setState] = useState<AssistantState>({
    isScanning: false,
    isTyping: false,
    lastScanTime: null,
    securityStatus: 'protected',
    integrityScore,
    storage: stats
  });

  const chatRef = useRef<Chat | null>(null);

  useEffect(() => {
    const initApp = async () => {
      setIsScanning(true);
      setState(prev => ({ ...prev, isScanning: true, isTyping: true }));

      try {
        // 1. Get real disk info
        const di = await getDiskInfo();
        setDiskInfo(di);

        // 2. Scan real files
        const scannedFiles = await scanUserDirectories();
        setFiles(scannedFiles);

        // 3. Initialize Chat with real files
        const chat = createOmniChat(scannedFiles, settings);
        chatRef.current = chat;

        // 4. Update History
        const malicious = scannedFiles.filter(f => f.threatLevel === 'malicious').length;
        setSecurityHistory(prev => {
          const next = [...prev, { date: new Date().toISOString(), score: integrityScore, threats: malicious }].slice(-7);
          return next;
        });

        // 5. Initial System Greet
        const response = await chat.sendMessage({
          message: `Perform a system audit. System details: Partition size: ${(di.total / (1024 ** 3)).toFixed(0)}GB, Used: ${(di.used / (1024 ** 3)).toFixed(0)}GB. Found ${scannedFiles.length} files. Greet the user as Barricade AI.`
        });
        handleAIResponse(response);
      } catch (err) {
        console.error("Initialization error:", err);
      } finally {
        setIsScanning(false);
        setState(prev => ({ ...prev, isScanning: false, isTyping: false }));
      }
    };

    initApp();

    // ============================================
    // Proactive Sentry Intelligence
    // ============================================
    const sentryInterval = setInterval(async () => {
      if (!settingsRef.current.enableProactiveSentry) return;

      const currentFiles = await scanUserDirectories();
      const screenshots = currentFiles.filter(f => f.folder === FolderType.SCREENSHOTS);
      const unorganizedDownloads = currentFiles.filter(f => f.folder === FolderType.DOWNLOADS);

      const newNotes: Notification[] = [];
      const now = Date.now();
      const SNOOZE_DURATION = 30 * 60 * 1000; // 30 minute snooze

      // 🛑 Screenshot Sentry: Trigger if over 15 screenshots
      const ssSnoozed = (snoozeMapRef.current['SCREENSHOTS'] || 0) + SNOOZE_DURATION > now;
      if (screenshots.length > 15 && !ssSnoozed) {
        newNotes.push({
          id: `ss-${now}`,
          title: 'Screenshot Accumulation',
          message: `I noticed you have ${screenshots.length} screenshots. Would you like me to identify those you might want to discard?`,
          type: 'SCREENSHOTS',
          actionPrompt: `Barricade, I have too many screenshots (${screenshots.length}). Help me audit and delete the ones I don't need.`
        });
      }

      // 🛑 Download Sentry: Trigger if over 10 unorganized files
      const dlSnoozed = (snoozeMapRef.current['STORAGE'] || 0) + SNOOZE_DURATION > now;
      if (unorganizedDownloads.length > 10 && !dlSnoozed) {
        newNotes.push({
          id: `dl-${now}`,
          title: 'Clutter Detected',
          message: 'Your Downloads sector is becoming unorganized. Shall I perform a Smart Organize protocol?',
          type: 'STORAGE',
          actionPrompt: "Barricade, my Downloads are a mess. Please perform a Smart Organize and tidy them up for me."
        });
      }

      if (newNotes.length > 0) {
        setNotifications(prev => [...prev, ...newNotes].slice(-3)); // Keep last 3

        // 🔥 Trigger Native OS Notifications
        if (settingsRef.current.enableNativeNotifications) {
          newNotes.forEach(note => {
            showNativeNotification(note.title, note.message, note.id);
          });
        }
      }
    }, (settingsRef.current.sentryScanInterval || 1) * 60000);

    // 🔥 Listen for Native Notification Clicks (Uses Ref for latest state)
    onNativeNotificationClick((id) => {
      handleNotificationAction(id);
    });

    // 🔥 Listen for Rapid Audit from Tray
    onRapidAudit(() => {
      handleSendMessage("Rapid system audit requested from Command Deck. Perform immediate scan and report findings.");
    });

    return () => clearInterval(sentryInterval);
  }, []);

  const handleAIResponse = (response: any) => {
    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'model',
      text: typeof response.text === 'string' ? response.text : String(response.text || "Defense audit complete."),
      timestamp: new Date()
    };

    if (response.functionCalls && response.functionCalls.length > 0) {
      const fc = response.functionCalls[0];
      if (fc.name === 'privacy_audit') {
        newMsg.pendingAction = {
          type: 'SCAN',
          fileIds: [],
          description: `Barricade is auditing the ${fc.args.folder} sector for data leaks...`
        };
      } else if (fc.name === 'optimize_storage') {
        newMsg.pendingAction = {
          type: 'OPTIMIZE',
          fileIds: files.filter(f => f.folder === FolderType.RECYCLE_BIN || f.size > 100 * 1024 * 1024).map(f => f.id),
          description: "Barricade is identifying bloatware for reclamation."
        };
      } else if (fc.name === 'quarantine_file') {
        newMsg.pendingAction = { type: 'QUARANTINE', fileIds: fc.args.fileIds as string[], description: String(fc.args.reason || 'Manual quarantine request.') };
      } else if (fc.name === 'vault_file') {
        newMsg.pendingAction = { type: 'VAULT', fileIds: fc.args.fileIds as string[], description: String(fc.args.reason || 'Securing sensitive data.') };
      } else if (fc.name === 'organize_files') {
        newMsg.pendingAction = { type: 'ORGANIZE', fileIds: fc.args.fileIds as string[], description: String(fc.args.reason || 'Cleaning up cluttered sector.') };
      } else if (fc.name === 'update_settings') {
        newMsg.pendingAction = {
          type: 'UPDATE_SETTINGS',
          fileIds: [],
          description: `Suggesting system configuration update: ${Object.entries(fc.args).map(([k, v]) => `${k}=${v}`).join(', ')}`,
          appName: JSON.stringify(fc.args) // Hijack appName to store settings updates
        };
      } else if (fc.name === 'deep_scan_file') {
        newMsg.pendingAction = { type: 'DEEP_SCAN', fileIds: [fc.args.fileId as string], description: String(fc.args.reason || 'Performing byte-level forensic audit.') };
      }
    }
    setMessages(prev => [...prev, newMsg]);
  };

  const handleSendMessage = async (text: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text, timestamp: new Date() }]);
    setState(prev => ({ ...prev, isTyping: true }));
    try {
      if (!chatRef.current) return;
      const response = await chatRef.current.sendMessage({ message: text });
      handleAIResponse(response);
    } catch (err) {
      console.error(err);
    } finally {
      setState(prev => ({ ...prev, isTyping: false }));
    }
  };

  const handleNotificationAction = (id: string, snooze = false) => {
    const note = notificationsRef.current.find(n => n.id === id);
    if (note) {
      if (snooze) {
        setSnoozeMap(prev => ({ ...prev, [note.type]: Date.now() }));
      } else if (note.actionPrompt) {
        if (note.type === 'SCREENSHOTS') setActivePreview(FolderType.SCREENSHOTS);
        if (note.type === 'STORAGE') setActivePreview(FolderType.DOWNLOADS);
        handleSendMessage(note.actionPrompt);
        // Also snooze after action to prevent immediate re-trigger
        setSnoozeMap(prev => ({ ...prev, [note.type]: Date.now() }));
      }
    }
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const executeAction = async (messageId: string) => {
    const msg = messages.find(m => m.id === messageId);
    if (!msg?.pendingAction) return;
    const { fileIds, type, description } = msg.pendingAction;

    setState(prev => ({ ...prev, isTyping: true }));
    let successCount = 0;

    try {
      const targetFiles = files.filter(f => fileIds.includes(f.id));

      for (const file of targetFiles) {
        let success = false;
        if (type === 'QUARANTINE') {
          success = await quarantineFile(file.path, description);
          if (success) {
            setFiles(prev => prev.map(f => f.id === file.id ? { ...f, folder: FolderType.QUARANTINE, threatLevel: 'suspicious' } : f));
          }
        } else if (type === 'VAULT') {
          success = await vaultFile(file.path, description);
          if (success) {
            setFiles(prev => prev.map(f => f.id === file.id ? { ...f, folder: FolderType.VAULT, threatLevel: 'safe' } : f));
          }
        } else if (type === 'DELETE') {
          success = await deleteFile(file.path);
          if (success) {
            setFiles(prev => prev.filter(f => f.id !== file.id));
          }
        } else if (type === 'SHRED') {
          success = await shredFile(file.path);
          if (success) {
            setFiles(prev => prev.filter(f => f.id !== file.id));
          }
        } else if (type === 'ORGANIZE') {
          success = await organizeFiles([file.path]);
          if (success) {
            // Re-scan after organization since multiple files might have moved
            const scanned = await scanUserDirectories();
            setFiles(scanned);
          }
        } else if (type === 'UPDATE_SETTINGS' && msg.pendingAction.appName) {
          const updates = JSON.parse(msg.pendingAction.appName);
          setSettings(prev => ({ ...prev, ...updates }));
          success = true;
        } else if (type === 'DEEP_SCAN') {
          const file = files.find(f => f.id === fileId);
          if (file) {
            const results = await deepScanFile(file.path);
            if (results.success) {
              const report = `Forensic results for ${file.name}: Entropy ${results.entropy}. Findings: ${results.findings.join('; ')}`;
              const followUp = await chatRef.current!.sendMessage({ message: report });
              handleAIResponse(followUp);
              success = true;
            }
          }
        }
        if (success) successCount++;
      }

      setMessages(prev => prev.map(m => m.id === messageId ? {
        ...m,
        pendingAction: undefined,
        text: m.text + `\n\n🛡️ Defense Protocol Executed: ${successCount} files processed.`
      } : m));

    } catch (err) {
      console.error("Action execution error:", err);
    } finally {
      setState(prev => ({ ...prev, isTyping: false }));
    }
  };

  const handleSwitchFolder = (folder: FolderType | 'none' | 'settings') => {
    if (folder === FolderType.VAULT && settings.isVaultLocked && !isVaultUnlocked) {
      setShowVaultPIN(true);
    } else {
      setActivePreview(folder);
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-200 overflow-hidden font-sans relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(79,70,229,0.05),transparent)] pointer-events-none"></div>

      {/* Vault PIN Overlay */}
      {showVaultPIN && (
        <VaultPINOverlay
          correctPin={settings.vaultPin}
          onUnlock={() => {
            setIsVaultUnlocked(true);
            setShowVaultPIN(false);
            setActivePreview(FolderType.VAULT);
          }}
          onCancel={() => setShowVaultPIN(false)}
        />
      )}

      {/* Notifications Layer */}
      <div className="pointer-events-none absolute inset-0 z-[100]">
        {notifications.map(n => (
          <div key={n.id} className="pointer-events-auto">
            <NotificationToast
              id={n.id}
              title={n.title}
              message={n.message}
              onAction={handleNotificationAction}
              onDismiss={(id) => handleNotificationAction(id, true)}
            />
          </div>
        ))}
      </div>

      <div className="w-[42%] border-r border-slate-700/50 flex flex-col bg-slate-900/40 relative">
        <header className="p-6 border-b border-slate-700/30">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white shadow-lg shadow-rose-500/30">
                {ICONS.Security}
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white">Barricade</h1>
            </div>
            <div className={`flex flex-col items-end`}>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Defense Status</span>
              <span className={`text-2xl font-black transition-all duration-1000 ${integrityScore > 80 ? 'text-emerald-400' : 'text-rose-400'} ${state.isTyping || isScanning ? 'animate-pulse' : ''}`}>
                {integrityScore}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass p-3 rounded-2xl border-slate-700/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="text-indigo-400">{ICONS.Storage}</div>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">System Load</span>
              </div>
              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full transition-all duration-1000" style={{ width: `${(stats.used / stats.total) * 100}%` }}></div>
              </div>
              <div className="mt-2 text-[10px] text-slate-500 font-mono">
                {(stats.used / (1024 ** 2)).toFixed(0)}MB / {(stats.total / (1024 ** 3)).toFixed(0)}GB
              </div>
            </div>
            <div className="glass p-3 rounded-2xl border-slate-700/50 flex flex-col justify-center items-center text-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Active Leaks</span>
              <span className="text-lg font-black text-rose-400">{files.filter(f => f.privacyLevel === 'critical').length}</span>
            </div>
          </div>
        </header>

        <nav className="px-4 py-2 border-b border-slate-700/30 flex gap-1 overflow-x-auto custom-scrollbar">
          <button onClick={() => handleSwitchFolder('none')} className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all border shrink-0 ${activePreview === 'none' ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:text-slate-300'}`}>
            Command Deck
          </button>
          <div className="w-px h-4 bg-slate-700 mx-1 mt-1.5 self-center"></div>
          {[FolderType.DOWNLOADS, FolderType.SCREENSHOTS, FolderType.DOCUMENTS, FolderType.QUARANTINE, FolderType.VAULT, FolderType.APPLICATIONS].map(folder => (
            <button key={folder} onClick={() => handleSwitchFolder(folder)} className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all border shrink-0 ${activePreview === folder ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:text-slate-300'} ${folder === FolderType.VAULT && settings.isVaultLocked && !isVaultUnlocked ? 'opacity-60 grayscale' : ''}`}>
              {folder === FolderType.VAULT && settings.isVaultLocked && !isVaultUnlocked ? ICONS.Vault : ''} {folder}
            </button>
          ))}
          <div className="w-px h-4 bg-slate-700 mx-1 mt-1.5 self-center"></div>
          <button
            onClick={() => handleSwitchFolder('settings')}
            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all border shrink-0 ${activePreview === 'settings' ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:text-slate-300'}`}
          >
            Settings
          </button>
        </nav>

        <div className="flex-1 overflow-hidden">
          <ChatView messages={messages} isTyping={state.isTyping} files={files} onSendMessage={handleSendMessage} onApproveAction={executeAction} onDeclineAction={() => { }} onSwitchFolder={handleSwitchFolder} />
        </div>
      </div>

      <main className="flex-1 flex flex-col bg-slate-950 overflow-y-auto custom-scrollbar p-6">
        {activePreview === 'settings' ? (
          <SettingsView settings={settings} onUpdateSettings={(up) => setSettings(prev => ({ ...prev, ...up }))} />
        ) : activePreview === 'none' ? (
          <div className="space-y-6 max-w-6xl mx-auto w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <SecurityPulse history={securityHistory} />
              <div className="glass rounded-3xl border border-slate-700/50 p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white mb-1 uppercase tracking-tight">Active Sentinel Stats</h3>
                  <p className="text-[10px] text-slate-500 uppercase font-black mb-6">Autonomous Defense Log</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                    <p className="text-[10px] text-rose-500 uppercase font-black mb-1">Threats Purged</p>
                    <p className="text-2xl font-mono text-white">{securityHistory.reduce((acc, p) => acc + p.threats, 0)}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                    <p className="text-[10px] text-indigo-500 uppercase font-black mb-1">Privacy Audits</p>
                    <p className="text-2xl font-mono text-white">{files.filter(f => f.privacyLevel === 'critical').length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <FileListView folder={activePreview as FolderType} files={files.filter(f => f.folder === activePreview)} onTriggerAI={handleSendMessage} onUpdateFile={(id, up) => setFiles(prev => prev.map(f => f.id === id ? { ...f, ...up } : f))} />
        )}
      </main>
    </div>
  );
};

export default App;
