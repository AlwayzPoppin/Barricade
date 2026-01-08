
export enum FolderType {
  DOWNLOADS = 'Downloads',
  SCREENSHOTS = 'Screenshots',
  DOCUMENTS = 'Documents',
  DESKTOP = 'Desktop',
  RECYCLE_BIN = 'Recycle Bin',
  APPLICATIONS = 'Applications',
  QUARANTINE = 'Quarantine',
  VAULT = 'Vault'
}

export type ThreatLevel = 'safe' | 'suspicious' | 'malicious';
export type PrivacyLevel = 'public' | 'sensitive' | 'critical';

export interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  extension: string;
  lastModified: string;
  folder: FolderType;
  path: string;
  category?: string;
  version?: string;
  lastOpened?: string;
  threatLevel?: ThreatLevel;
  threatType?: string;
  privacyLevel?: PrivacyLevel;
  tags?: string[];
}

export interface StorageStats {
  used: number; // in bytes
  total: number;
  apps: number;
  media: number;
  junk: number;
}

// FIX: Added missing Suggestion interface used by SuggestionCard component
export interface Suggestion {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  folder: string;
  targetFiles: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: Date;
  pendingAction?: {
    type: 'DELETE' | 'ORGANIZE' | 'ARCHIVE' | 'AUTO_ORGANIZE' | 'EMPTY_BIN' | 'LAUNCH_APP' | 'QUARANTINE' | 'SCAN' | 'SHRED' | 'OPTIMIZE' | 'VAULT' | 'UPDATE_SETTINGS' | 'DEEP_SCAN';
    fileIds: string[];
    description: string;
    appName?: string;
  };
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'SCREENSHOTS' | 'STORAGE' | 'SECURITY';
  actionPrompt?: string;
}

export interface AssistantState {
  isScanning: boolean;
  isTyping: boolean;
  lastScanTime: string | null;
  securityStatus: 'protected' | 'scanning' | 'alert';
  integrityScore: number;
  storage: StorageStats;
}

export interface AppSettings {
  aiSensitivity: 'low' | 'medium' | 'high';
  enableNativeNotifications: boolean;
  enableProactiveSentry: boolean;
  sentryScanInterval: number; // in minutes
  autoOrganizeDownloads: boolean;
  monitoredFolders: FolderType[];
  vaultStoragePath: string;
  vaultPin: string; // Hashed or plain for prototype
  isVaultLocked: boolean;
}
