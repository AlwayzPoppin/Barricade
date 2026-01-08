/**
 * File System Service
 * Bridges the renderer process with Electron's file system capabilities
 * Falls back to mock data when not running in Electron
 */

import { FileItem, FolderType } from '../types';
import { analyzeFiles } from './threatDetector';

// Type declarations for the Electron preload API
declare global {
    interface Window {
        barricadeFS?: {
            getDirectories: () => Promise<Record<string, string>>;
            scanAll: () => Promise<FileItem[]>;
            scanDirectory: (dirPath: string) => Promise<FileItem[]>;
            getFileDetails: (filePath: string) => Promise<any>;
            quarantine: (filePath: string, reason: string) => Promise<{ success: boolean; error?: string }>;
            restore: (quarantinedPath: string) => Promise<{ success: boolean; error?: string }>;
            delete: (filePath: string) => Promise<{ success: boolean; error?: string }>;
            shred: (filePath: string) => Promise<{ success: boolean; error?: string }>;
            listQuarantine: () => Promise<any[]>;
            showInFolder: (filePath: string) => Promise<{ success: boolean }>;
            getDiskInfo: () => Promise<{ total: number; free: number; used: number }>;
            vault: (filePath: string, reason: string) => Promise<{ success: boolean; error?: string }>;
            unvault: (fileIds: string[]) => Promise<{ success: boolean; results: any[]; error?: string }>;
            deepScan: (filePath: string) => Promise<{ success: boolean; findings: string[]; threatLevel: string; entropy: string; error?: string }>;
            listVault: () => Promise<any[]>;
            organize: (filePaths: string[], category?: string) => Promise<{ success: boolean; results: any[]; error?: string }>;
        };
        barricadeApp?: {
            notify: (title: string, body: string, id: string) => Promise<{ success: boolean; error?: string }>;
            onNotificationClick: (callback: (id: string) => void) => void;
            onRapidAudit: (callback: () => void) => void;
        };
        barricadePlatform?: {
            isElectron: boolean;
            platform: string;
            arch: string;
        };
    }
}

/**
 * Check if we're running in Electron
 */
export function isElectron(): boolean {
    return !!window.barricadePlatform?.isElectron;
}

/**
 * Get platform information
 */
export function getPlatformInfo() {
    if (window.barricadePlatform) {
        return window.barricadePlatform;
    }
    return {
        isElectron: false,
        platform: 'web',
        arch: 'unknown'
    };
}

/**
 * Scan all user directories for files
 * Returns analyzed files with threat/privacy levels
 */
export async function scanUserDirectories(): Promise<FileItem[]> {
    if (!isElectron() || !window.barricadeFS) {
        console.warn('Not running in Electron, returned empty file list');
        // Add a small delay to simulate scanning
        await new Promise(resolve => setTimeout(resolve, 500));
        return [];
    }

    try {
        console.log('Scanning user directories...');
        const files = await window.barricadeFS.scanAll();
        console.log(`Scanned ${files.length} files`);

        // Analyze files for threats and privacy concerns
        return analyzeFiles(files);
    } catch (error) {
        console.error('Error scanning directories:', error);
        return [];
    }
}

/**
 * Scan a specific directory
 */
export async function scanDirectory(dirPath: string): Promise<FileItem[]> {
    if (!isElectron() || !window.barricadeFS) {
        return [];
    }

    try {
        const files = await window.barricadeFS.scanDirectory(dirPath);
        return analyzeFiles(files);
    } catch (error) {
        console.error('Error scanning directory:', error);
        return [];
    }
}

/**
 * Get detailed information about a file
 */
export async function getFileDetails(filePath: string): Promise<any> {
    if (!isElectron() || !window.barricadeFS) {
        return { error: 'Not running in Electron' };
    }

    return window.barricadeFS.getFileDetails(filePath);
}

/**
 * Move a file to quarantine
 */
export async function quarantineFile(filePath: string, reason: string): Promise<boolean> {
    if (!isElectron() || !window.barricadeFS) {
        console.warn('Quarantine not available in web mode');
        return false;
    }

    try {
        const result = await window.barricadeFS.quarantine(filePath, reason);
        if (result.success) {
            console.log(`File quarantined: ${filePath}`);
            return true;
        } else {
            console.error('Quarantine failed:', result.error);
            return false;
        }
    } catch (error) {
        console.error('Error quarantining file:', error);
        return false;
    }
}

/**
 * Restore a file from quarantine
 */
export async function restoreFromQuarantine(quarantinedPath: string): Promise<boolean> {
    if (!isElectron() || !window.barricadeFS) {
        return false;
    }

    try {
        const result = await window.barricadeFS.restore(quarantinedPath);
        return result.success;
    } catch (error) {
        console.error('Error restoring file:', error);
        return false;
    }
}

/**
 * Delete a file (moves to system trash)
 */
export async function deleteFile(filePath: string): Promise<boolean> {
    if (!isElectron() || !window.barricadeFS) {
        console.warn('Delete not available in web mode');
        return false;
    }

    try {
        const result = await window.barricadeFS.delete(filePath);
        if (result.success) {
            console.log(`File deleted: ${filePath}`);
            return true;
        } else {
            console.error('Delete failed:', result.error);
            return false;
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        return false;
    }
}

/**
 * Securely shred a file (overwrite + delete)
 */
export async function shredFile(filePath: string): Promise<boolean> {
    if (!isElectron() || !window.barricadeFS) {
        console.warn('Shred not available in web mode');
        return false;
    }

    try {
        const result = await window.barricadeFS.shred(filePath);
        if (result.success) {
            console.log(`File shredded: ${filePath}`);
            return true;
        } else {
            console.error('Shred failed:', result.error);
            return false;
        }
    } catch (error) {
        console.error('Error shredding file:', error);
        return false;
    }
}

/**
 * List all quarantined files
 */
export async function listQuarantinedFiles(): Promise<any[]> {
    if (!isElectron() || !window.barricadeFS) {
        return [];
    }

    try {
        return await window.barricadeFS.listQuarantine();
    } catch (error) {
        console.error('Error listing quarantine:', error);
        return [];
    }
}

/**
 * Open file location in system file explorer
 */
export async function showInFolder(filePath: string): Promise<void> {
    if (!isElectron() || !window.barricadeFS) {
        console.warn('Show in folder not available in web mode');
        return;
    }

    await window.barricadeFS.showInFolder(filePath);
}

/**
 * Get system disk information
 */
export async function getDiskInfo(): Promise<{ total: number; used: number; free: number }> {
    if (!isElectron() || !window.barricadeFS) {
        return {
            total: 1024 * 1024 * 1024 * 500,
            used: 1024 * 1024 * 1024 * 350,
            free: 1024 * 1024 * 1024 * 150
        };
    }

    try {
        return await window.barricadeFS.getDiskInfo();
    } catch (error) {
        console.error('Error getting disk info:', error);
        return {
            total: 1024 * 1024 * 1024 * 500,
            used: 1024 * 1024 * 1024 * 350,
            free: 1024 * 1024 * 1024 * 150
        };
    }
}

/**
 * Map folder type enum to directory name
 */
export function folderTypeToPath(folderType: FolderType): string {
    const mapping: Record<FolderType, string> = {
        [FolderType.DOWNLOADS]: 'Downloads',
        [FolderType.SCREENSHOTS]: 'Screenshots',
        [FolderType.DOCUMENTS]: 'Documents',
        [FolderType.DESKTOP]: 'Desktop',
        [FolderType.RECYCLE_BIN]: 'Recycle Bin',
        [FolderType.APPLICATIONS]: 'Applications',
        [FolderType.QUARANTINE]: 'Quarantine',
        [FolderType.VAULT]: 'Vault',
    };
    return mapping[folderType] || 'Other';
}

/**
 * Move a file to the secure vault
 */
export async function vaultFile(filePath: string, reason: string): Promise<boolean> {
    if (!isElectron() || !window.barricadeFS) {
        console.warn('Vault not available in web mode');
        return false;
    }

    try {
        const result = await window.barricadeFS.vault(filePath, reason);
        if (result.success) {
            console.log(`File moved to vault: ${filePath}`);
            return true;
        } else {
            console.error('Vault move failed:', result.error);
            return false;
        }
    } catch (error) {
        console.error('Error moving file to vault:', error);
        return false;
    }
}

/**
 * Restore a file from the vault
 */
export async function unvaultFile(fileIds: string[]): Promise<{ success: boolean; results: any[]; error?: string }> {
    if (!isElectron() || !window.barricadeFS) {
        return { success: false, results: [], error: 'Not in Electron environment' };
    }

    try {
        const result = await window.barricadeFS.unvault(fileIds);
        return result;
    } catch (error) {
        console.error('Error unvaulting file:', error);
        return { success: false, results: [], error: (error as Error).message };
    }
}

/**
 * List all vaulted files
 */
export async function listVaultedFiles(): Promise<any[]> {
    if (!isElectron() || !window.barricadeFS) {
        return [];
    }

    try {
        return await window.barricadeFS.listVault();
    } catch (error) {
        console.error('Error listing vault:', error);
        return [];
    }
}

/**
 * Perform a deep byte-level scan on a file
 */
export async function deepScanFile(filePath: string): Promise<{ success: boolean; findings: string[]; threatLevel: string; entropy: string; error?: string }> {
    if (!isElectron() || !window.barricadeFS) {
        return { success: false, findings: [], threatLevel: 'unknown', entropy: 'unknown', error: 'Not in Electron environment' };
    }
    return await window.barricadeFS.deepScan(filePath);
}

/**
 * Organize files into subfolders
 */
export async function organizeFiles(filePaths: string[], category?: string): Promise<boolean> {
    if (!isElectron() || !window.barricadeFS) {
        return false;
    }

    try {
        const result = await window.barricadeFS.organize(filePaths, category);
        return result.success;
    } catch (error) {
        console.error('Error organizing files:', error);
        return false;
    }
}

/**
 * Show a native system notification
 */
export async function showNativeNotification(title: string, body: string, id: string): Promise<boolean> {
    if (!isElectron() || !window.barricadeApp) {
        return false;
    }

    try {
        const result = await window.barricadeApp.notify(title, body, id);
        return result.success;
    } catch (error) {
        console.error('Error showing native notification:', error);
        return false;
    }
}

/**
 * Handle native notification clicks
 */
export function onNativeNotificationClick(callback: (id: string) => void): void {
    if (isElectron() && window.barricadeApp) {
        window.barricadeApp.onNotificationClick(callback);
    }
}

/**
 * Handle rapid audit triggers from tray
 */
export function onRapidAudit(callback: () => void): void {
    if (isElectron() && window.barricadeApp) {
        window.barricadeApp.onRapidAudit(callback);
    }
}
