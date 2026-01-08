const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('barricadeFS', {
    // Get user directories (Downloads, Documents, etc.)
    getDirectories: () => ipcRenderer.invoke('fs:get-directories'),

    // Scan all user directories for files
    scanAll: () => ipcRenderer.invoke('fs:scan-all'),

    // Scan a specific directory
    scanDirectory: (dirPath) => ipcRenderer.invoke('fs:scan-directory', dirPath),

    // Get detailed file information
    getFileDetails: (filePath) => ipcRenderer.invoke('fs:get-file-details', filePath),

    // Move a file to quarantine
    quarantine: (filePath, reason) => ipcRenderer.invoke('fs:quarantine', filePath, reason),

    // Restore a file from quarantine
    restore: (quarantinedPath) => ipcRenderer.invoke('fs:restore', quarantinedPath),

    // Delete a file (moves to system trash)
    delete: (filePath) => ipcRenderer.invoke('fs:delete', filePath),

    // Securely shred a file (overwrite + delete)
    shred: (filePath) => ipcRenderer.invoke('fs:shred', filePath),

    // List all quarantined files
    listQuarantine: () => ipcRenderer.invoke('fs:list-quarantine'),

    // Vault actions (for sensitive documents)
    vault: (fileIds) => ipcRenderer.invoke('fs:vault', fileIds),
    unvault: (fileIds) => ipcRenderer.invoke('fs:unvault', fileIds),
    deepScan: (filePath) => ipcRenderer.invoke('fs:deep-scan', filePath),
    listVault: () => ipcRenderer.invoke('fs:list-vault'),

    // Organize files
    organize: (filePaths, category) => ipcRenderer.invoke('fs:organize', filePaths, category),

    // Open file location in system file explorer
    showInFolder: (filePath) => ipcRenderer.invoke('fs:show-in-folder', filePath),

    // Get real system disk info
    getDiskInfo: () => ipcRenderer.invoke('fs:get-disk-info'),
});

contextBridge.exposeInMainWorld('barricadeApp', {
    notify: (title, body, id) => ipcRenderer.invoke('app:notify', { title, body, id }),
    onNotificationClick: (callback) => ipcRenderer.on('notification-click', (event, id) => callback(id)),
    onRapidAudit: (callback) => ipcRenderer.on('trigger-rapid-audit', () => callback())
});

// Also expose platform info
contextBridge.exposeInMainWorld('barricadePlatform', {
    isElectron: true,
    platform: process.platform,
    arch: process.arch,
});

console.log('Barricade AI - Preload script loaded');
