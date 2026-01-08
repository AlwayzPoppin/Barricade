
import React from 'react';
import { AppSettings, FolderType } from '../types';
import { ICONS } from '../constants';

interface SettingsViewProps {
    settings: AppSettings;
    onUpdateSettings: (updates: Partial<AppSettings>) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdateSettings }) => {
    const toggleFolder = (folder: FolderType) => {
        const isMonitored = settings.monitoredFolders.includes(folder);
        const newFolders = isMonitored
            ? settings.monitoredFolders.filter((f) => f !== folder)
            : [...settings.monitoredFolders, folder];
        onUpdateSettings({ monitoredFolders: newFolders });
    };

    return (
        <div className="p-6 h-full flex flex-col select-none relative z-10 overflow-y-auto custom-scrollbar">
            <div className="mb-6 flex flex-col">
                <h2 className="text-xl font-bold text-white uppercase tracking-tight">System Configuration</h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Tailor your AI Defense Sentinel's behavior and protocols.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* AI & Sentry Protocols */}
                <div className="glass rounded-3xl border border-slate-700/50 p-6 space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                            {ICONS.AI}
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">AI Sentry Protocols</h3>
                            <p className="text-[10px] text-slate-500 uppercase font-black">Autonomous Heuristics</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-xs font-bold text-slate-200">Proactive Sentry</label>
                                <p className="text-[10px] text-slate-500">Autonomous directory monitoring and suggestions.</p>
                            </div>
                            <button
                                onClick={() => onUpdateSettings({ enableProactiveSentry: !settings.enableProactiveSentry })}
                                className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${settings.enableProactiveSentry ? 'bg-indigo-500' : 'bg-slate-700'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full transition-all duration-300 ${settings.enableProactiveSentry ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-200">Heuristic Sensitivity</label>
                            <div className="flex gap-2">
                                {(['low', 'medium', 'high'] as const).map((level) => (
                                    <button
                                        key={level}
                                        onClick={() => onUpdateSettings({ aiSensitivity: level })}
                                        className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all border ${settings.aiSensitivity === level
                                            ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/20'
                                            : 'bg-slate-800/50 border-slate-700 text-slate-500 hover:text-slate-300'
                                            }`}
                                    >
                                        {level}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between">
                                <label className="text-xs font-bold text-slate-200">Scan Interval</label>
                                <span className="text-[10px] font-mono text-indigo-400">{settings.sentryScanInterval}m</span>
                            </div>
                            <input
                                type="range" min="1" max="60"
                                value={settings.sentryScanInterval}
                                onChange={(e) => onUpdateSettings({ sentryScanInterval: parseInt(e.target.value) })}
                                className="w-full accent-indigo-500 bg-slate-800 rounded-lg h-1.5 appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                </div>

                {/* Interface & Notifications */}
                <div className="glass rounded-3xl border border-slate-700/50 p-6 space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">System Integration</h3>
                            <p className="text-[10px] text-slate-500 uppercase font-black">OS Level Connectivity</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-xs font-bold text-slate-200">Native OS Notifications</label>
                                <p className="text-[10px] text-slate-500">Bridge alerts directly to Windows Action Center.</p>
                            </div>
                            <button
                                onClick={() => onUpdateSettings({ enableNativeNotifications: !settings.enableNativeNotifications })}
                                className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${settings.enableNativeNotifications ? 'bg-emerald-500' : 'bg-slate-700'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full transition-all duration-300 ${settings.enableNativeNotifications ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-xs font-bold text-slate-200">Auto-Organize Downloads</label>
                                <p className="text-[10px] text-slate-500">Automatically tidy the Downloads sector on detection.</p>
                            </div>
                            <button
                                onClick={() => onUpdateSettings({ autoOrganizeDownloads: !settings.autoOrganizeDownloads })}
                                className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${settings.autoOrganizeDownloads ? 'bg-indigo-500' : 'bg-slate-700'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full transition-all duration-300 ${settings.autoOrganizeDownloads ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Security Protocols */}
                <div className="glass rounded-3xl border border-slate-700/50 p-6 space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                            {ICONS.Security}
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Vault Security</h3>
                            <p className="text-[10px] text-slate-500 uppercase font-black">Data Chamber Protection</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <label className="text-xs font-bold text-slate-200">Vault Lock Protocol</label>
                                <p className="text-[10px] text-slate-500">Require PIN for Vault Chamber access.</p>
                            </div>
                            <button
                                onClick={() => onUpdateSettings({ isVaultLocked: !settings.isVaultLocked })}
                                className={`w-12 h-6 rounded-full p-1 transition-all duration-300 ${settings.isVaultLocked ? 'bg-indigo-500' : 'bg-slate-700'}`}
                            >
                                <div className={`w-4 h-4 bg-white rounded-full transition-all duration-300 ${settings.isVaultLocked ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-200">Security PIN</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    maxLength={4}
                                    value={settings.vaultPin || ''}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        if (val.length <= 4) onUpdateSettings({ vaultPin: val });
                                    }}
                                    className="flex-1 bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-2 text-sm font-mono text-indigo-400 focus:outline-none focus:border-indigo-500/50"
                                    placeholder="XXXX"
                                />
                            </div>
                            <p className="text-[9px] text-slate-500 uppercase">Input 4-digit cipher for vault entry.</p>
                        </div>
                    </div>
                </div>

                {/* Monitored Sectors */}
                <div className="glass rounded-3xl border border-slate-700/50 p-6 lg:col-span-1 space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
                            {ICONS.Security}
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-white">Monitored Sectors</h3>
                            <p className="text-[10px] text-slate-500 uppercase font-black">Directory Governance</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {[FolderType.DOWNLOADS, FolderType.SCREENSHOTS, FolderType.DOCUMENTS, FolderType.DESKTOP, FolderType.APPLICATIONS, FolderType.RECYCLE_BIN].map((folder) => (
                            <button
                                key={folder}
                                onClick={() => toggleFolder(folder)}
                                className={`p-3 rounded-2xl flex items-center gap-3 transition-all border ${settings.monitoredFolders.includes(folder)
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                    : 'bg-slate-800/50 border-slate-700 text-slate-500'
                                    }`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${settings.monitoredFolders.includes(folder) ? 'bg-amber-500/20' : 'bg-slate-900'}`}>
                                    {folder === FolderType.DOWNLOADS ? ICONS.Downloads :
                                        folder === FolderType.SCREENSHOTS ? ICONS.Screenshots :
                                            folder === FolderType.APPLICATIONS ? ICONS.Apps : ICONS.Security}
                                </div>
                                <span className="text-[10px] font-bold uppercase">{folder}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-8 p-6 glass border border-indigo-500/30 rounded-3xl bg-indigo-500/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 animate-pulse">
                        {ICONS.Vault}
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-white">Secure Vault Location</h4>
                        <p className="text-xs text-slate-400 font-mono">{settings.vaultStoragePath || 'Standard AppData Location'}</p>
                    </div>
                </div>
                <button className="px-6 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20">
                    Relocate Vault
                </button>
            </div>
        </div>
    );
};

export default SettingsView;
