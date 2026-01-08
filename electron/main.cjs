const { app, BrowserWindow, ipcMain, shell, Notification, Tray, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Determine if we're in development or production
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;
let tray;
let isQuitting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    frame: true,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    icon: path.join(__dirname, '../assets/icon.png')
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '../assets/icon.png');
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Barricade',
      click: () => {
        mainWindow.show();
      }
    },
    {
      label: 'Rapid System Audit',
      click: () => {
        mainWindow.show();
        mainWindow.webContents.send('trigger-rapid-audit');
      }
    },
    { type: 'separator' },
    {
      label: 'Exit Barricade',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Barricade AI Sentinel');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow.show();
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// ============================================
// File System IPC Handlers
// ============================================

// Get user directories based on platform
function getUserDirectories() {
  const home = os.homedir();
  const platform = process.platform;

  const directories = {
    downloads: path.join(home, 'Downloads'),
    documents: path.join(home, 'Documents'),
    desktop: path.join(home, 'Desktop'),
    pictures: path.join(home, 'Pictures'),
  };

  // Screenshots location varies by platform
  if (platform === 'win32') {
    directories.screenshots = path.join(home, 'Pictures', 'Screenshots');
  } else if (platform === 'darwin') {
    directories.screenshots = path.join(home, 'Pictures', 'Screenshots');
  } else {
    directories.screenshots = path.join(home, 'Pictures');
  }

  return directories;
}

// Get quarantine directory
function getQuarantineDir() {
  const appDataDir = app.getPath('userData');
  const quarantineDir = path.join(appDataDir, 'Quarantine');
  if (!fs.existsSync(quarantineDir)) {
    fs.mkdirSync(quarantineDir, { recursive: true });
  }
  return quarantineDir;
}

// Get vault directory (for sensitive documents)
function getVaultDir() {
  const appDataDir = app.getPath('userData');
  const vaultDir = path.join(appDataDir, 'Vault');
  if (!fs.existsSync(vaultDir)) {
    fs.mkdirSync(vaultDir, { recursive: true });
  }
  return vaultDir;
}

// Scan a directory for files
async function scanDirectory(dirPath, maxDepth = 2, currentDepth = 0) {
  const files = [];

  if (currentDepth >= maxDepth) return files;

  try {
    if (!fs.existsSync(dirPath)) return files;

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      // Skip hidden files and system files
      if (entry.name.startsWith('.') || entry.name.startsWith('$')) continue;

      const fullPath = path.join(dirPath, entry.name);

      try {
        if (entry.isFile()) {
          const stats = fs.statSync(fullPath);
          const ext = path.extname(entry.name).toLowerCase();

          files.push({
            id: crypto.randomUUID(),
            name: entry.name,
            path: fullPath,
            size: stats.size,
            extension: ext,
            type: getFileType(ext),
            lastModified: stats.mtime.toISOString(),
            folder: getFolderType(dirPath),
            threatLevel: 'safe',
            privacyLevel: 'public',
            tags: []
          });
        } else if (entry.isDirectory() && currentDepth < maxDepth - 1) {
          // Recursively scan subdirectories
          const subFiles = await scanDirectory(fullPath, maxDepth, currentDepth + 1);
          files.push(...subFiles);
        }
      } catch (err) {
        // Skip files we can't access
        console.warn(`Cannot access: ${fullPath}`, err.message);
      }
    }
  } catch (err) {
    console.error(`Error scanning directory: ${dirPath}`, err.message);
  }

  return files;
}

// Determine file type from extension
function getFileType(ext) {
  const typeMap = {
    // Images
    '.png': 'Image', '.jpg': 'Image', '.jpeg': 'Image', '.gif': 'Image',
    '.webp': 'Image', '.bmp': 'Image', '.svg': 'Image', '.ico': 'Image',
    // Videos
    '.mp4': 'Video', '.avi': 'Video', '.mov': 'Video', '.mkv': 'Video',
    '.wmv': 'Video', '.webm': 'Video',
    // Audio
    '.mp3': 'Audio', '.wav': 'Audio', '.flac': 'Audio', '.aac': 'Audio',
    '.ogg': 'Audio', '.m4a': 'Audio',
    // Documents
    '.pdf': 'Document', '.doc': 'Document', '.docx': 'Document',
    '.xls': 'Document', '.xlsx': 'Document', '.ppt': 'Document',
    '.pptx': 'Document', '.txt': 'Document', '.rtf': 'Document',
    '.odt': 'Document', '.ods': 'Document',
    // Code
    '.js': 'Code', '.ts': 'Code', '.py': 'Code', '.java': 'Code',
    '.cpp': 'Code', '.c': 'Code', '.h': 'Code', '.css': 'Code',
    '.html': 'Code', '.json': 'Code', '.xml': 'Code',
    // Archives
    '.zip': 'Archive', '.rar': 'Archive', '.7z': 'Archive',
    '.tar': 'Archive', '.gz': 'Archive',
    // Executables
    '.exe': 'Executable', '.msi': 'Executable', '.bat': 'Executable',
    '.cmd': 'Executable', '.ps1': 'Executable', '.sh': 'Executable',
    '.app': 'Application', '.dmg': 'Application',
  };

  return typeMap[ext] || 'Other';
}

// Determine folder type from path
function getFolderType(dirPath) {
  const lowerPath = dirPath.toLowerCase();
  if (lowerPath.includes('download')) return 'Downloads';
  if (lowerPath.includes('screenshot')) return 'Screenshots';
  if (lowerPath.includes('document')) return 'Documents';
  if (lowerPath.includes('desktop')) return 'Desktop';
  if (lowerPath.includes('picture')) return 'Pictures';
  if (lowerPath.includes('quarantine')) return 'Quarantine';
  return 'Other';
}

// IPC: Get user directories
ipcMain.handle('fs:get-directories', () => {
  return getUserDirectories();
});

// IPC: Scan all user directories
ipcMain.handle('fs:scan-all', async () => {
  const dirs = getUserDirectories();
  const allFiles = [];

  for (const [name, dirPath] of Object.entries(dirs)) {
    console.log(`Scanning ${name}: ${dirPath}`);
    const files = await scanDirectory(dirPath, 2);
    allFiles.push(...files);
  }

  console.log(`Total files scanned: ${allFiles.length}`);
  return allFiles;
});

// IPC: Scan specific directory
ipcMain.handle('fs:scan-directory', async (event, dirPath) => {
  return await scanDirectory(dirPath, 3);
});

// IPC: Get file details
ipcMain.handle('fs:get-file-details', async (event, filePath) => {
  try {
    const stats = fs.statSync(filePath);
    return {
      size: stats.size,
      created: stats.birthtime.toISOString(),
      modified: stats.mtime.toISOString(),
      accessed: stats.atime.toISOString(),
      isDirectory: stats.isDirectory()
    };
  } catch (err) {
    return { error: err.message };
  }
});

// IPC: Move file to quarantine
ipcMain.handle('fs:quarantine', async (event, filePath, reason) => {
  try {
    const quarantineDir = getQuarantineDir();
    const fileName = path.basename(filePath);
    const timestamp = Date.now();
    const quarantinedName = `${timestamp}_${fileName}.quarantined`;
    const quarantinedPath = path.join(quarantineDir, quarantinedName);

    // Create metadata file
    const metadata = {
      originalPath: filePath,
      originalName: fileName,
      quarantinedAt: new Date().toISOString(),
      reason: reason,
      sha256: await getFileHash(filePath)
    };

    // Move the file
    fs.renameSync(filePath, quarantinedPath);

    // Save metadata
    const metadataPath = quarantinedPath + '.meta.json';
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    return { success: true, quarantinedPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Restore from quarantine
ipcMain.handle('fs:restore', async (event, quarantinedPath) => {
  try {
    const metadataPath = quarantinedPath + '.meta.json';
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

    // Restore to original location
    fs.renameSync(quarantinedPath, metadata.originalPath);

    // Remove metadata file
    fs.unlinkSync(metadataPath);

    return { success: true, restoredPath: metadata.originalPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Delete file
ipcMain.handle('fs:delete', async (event, filePath) => {
  try {
    // Move to system trash instead of permanent delete
    await shell.trashItem(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Secure shred file (overwrite before delete)
ipcMain.handle('fs:shred', async (event, filePath) => {
  try {
    const stats = fs.statSync(filePath);
    const size = stats.size;

    // Overwrite with random data 3 times
    for (let pass = 0; pass < 3; pass++) {
      const randomData = crypto.randomBytes(size);
      fs.writeFileSync(filePath, randomData);
    }

    // Then delete
    fs.unlinkSync(filePath);

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: List quarantined files
ipcMain.handle('fs:list-quarantine', async () => {
  try {
    const quarantineDir = getQuarantineDir();
    const files = fs.readdirSync(quarantineDir);
    const quarantined = [];

    for (const file of files) {
      if (file.endsWith('.meta.json')) continue;
      if (!file.endsWith('.quarantined')) continue;

      const metadataPath = path.join(quarantineDir, file + '.meta.json');
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        quarantined.push({
          ...metadata,
          quarantinedPath: path.join(quarantineDir, file)
        });
      }
    }

    return quarantined;
  } catch (err) {
    return [];
  }
});

// IPC: Open file location in explorer
ipcMain.handle('fs:show-in-folder', async (event, filePath) => {
  shell.showItemInFolder(filePath);
  return { success: true };
});

// IPC: Move file to vault
ipcMain.handle('fs:vault', async (event, filePath, reason) => {
  try {
    const vaultDir = getVaultDir();
    const fileName = path.basename(filePath);
    const timestamp = Date.now();
    const vaultedName = `${timestamp}_${fileName}.vault`;
    const vaultedPath = path.join(vaultDir, vaultedName);

    // Create metadata file
    const metadata = {
      originalPath: filePath,
      originalName: fileName,
      vaultedAt: new Date().toISOString(),
      reason: reason,
      sha256: await getFileHash(filePath)
    };

    // Move the file
    fs.renameSync(filePath, vaultedPath);

    // Save metadata
    const metadataPath = vaultedPath + '.meta.json';
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    return { success: true, vaultedPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Restore from vault
ipcMain.handle('fs:unvault', async (event, vaultedPath) => {
  try {
    const metadataPath = vaultedPath + '.meta.json';
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));

    // Restore to original location
    fs.renameSync(vaultedPath, metadata.originalPath);

    // Remove metadata file
    fs.unlinkSync(metadataPath);

    return { success: true, restoredPath: metadata.originalPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: List vaulted files
ipcMain.handle('fs:list-vault', async () => {
  try {
    const vaultDir = getVaultDir();
    const files = fs.readdirSync(vaultDir);
    const vaulted = [];

    for (const file of files) {
      if (file.endsWith('.meta.json')) continue;
      if (!file.endsWith('.vault')) continue;

      const metadataPath = path.join(vaultDir, file + '.meta.json');
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
        vaulted.push({
          ...metadata,
          vaultedPath: path.join(vaultDir, file)
        });
      }
    }

    return vaulted;
  } catch (err) {
    return [];
  }
});

// IPC: Organize files into folders
ipcMain.handle('fs:organize', async (event, filePaths, category) => {
  try {
    const results = [];
    for (const filePath of filePaths) {
      if (!fs.existsSync(filePath)) continue;

      const dir = path.dirname(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const fileName = path.basename(filePath);

      // Determine target subfolder based on category or type
      let subfolder = category || getFileType(ext);
      const targetDir = path.join(dir, subfolder);

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const targetPath = path.join(targetDir, fileName);

      // If file already exists, add timestamp
      let finalPath = targetPath;
      if (fs.existsSync(targetPath)) {
        const nameWithoutExt = path.parse(fileName).name;
        finalPath = path.join(targetDir, `${nameWithoutExt}_${Date.now()}${ext}`);
      }

      fs.renameSync(filePath, finalPath);
      results.push({ original: filePath, newPath: finalPath, success: true });
    }
    return { success: true, results };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// IPC: Show native system notification
ipcMain.handle('app:notify', (event, { title, body, id }) => {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: title || 'Barricade AI',
      body: body,
      silent: false
    });

    notification.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
        // Send event to renderer to handle the specific notification action
        mainWindow.webContents.send('notification-click', id);
      }
    });

    notification.show();
    return { success: true };
  }
  return { success: false, error: 'Notifications not supported' };
});

// IPC: Get disk information
ipcMain.handle('fs:get-disk-info', async () => {
  try {
    const homeDir = os.homedir();
    const drive = homeDir.substring(0, 3); // "C:\" on Windows

    if (process.platform === 'win32') {
      const output = execSync(`wmic logicaldisk where "DeviceID='${drive.substring(0, 2)}'" get size,freespace /format:list`, { encoding: 'utf8' });
      const lines = output.split('\n');
      let free = 0;
      let total = 0;

      lines.forEach(line => {
        if (line.startsWith('FreeSpace=')) free = parseInt(line.split('=')[1]);
        if (line.startsWith('Size=')) total = parseInt(line.split('=')[1]);
      });

      return { free, total, used: total - free };
    } else {
      const output = execSync('df -b1 /', { encoding: 'utf8' });
      const lines = output.split('\n');
      if (lines.length > 1) {
        const parts = lines[1].split(/\s+/);
        const total = parseInt(parts[1]);
        const used = parseInt(parts[2]);
        const free = parseInt(parts[3]);
        return { total, used, free };
      }
    }
  } catch (err) {
    console.error('Error getting disk info:', err);
  }

  // Fallback
  return { total: 1024 * 1024 * 1024 * 500, free: 1024 * 1024 * 1024 * 100, used: 1024 * 1024 * 1024 * 400 };
});

// Helper: Get file hash
async function getFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', data => hash.update(data));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

// IPC: Perform deep byte-level analysis on a file
ipcMain.handle('fs:deep-scan', async (event, filePath) => {
  try {
    if (!fs.existsSync(filePath)) return { success: false, error: 'File not found' };

    const stats = fs.statSync(filePath);
    if (stats.size > 10 * 1024 * 1024) return { success: false, error: 'File too large for deep scan' };

    const buffer = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();

    let findings = [];
    let threatLevel = 'safe';
    let entropy = 0;

    // Basic Entropy Calculation
    const counts = new Array(256).fill(0);
    for (let i = 0; i < buffer.length; i++) counts[buffer[i]]++;
    for (const count of counts) {
      if (count > 0) {
        const p = count / buffer.length;
        entropy -= p * Math.log2(p);
      }
    }

    if (entropy > 7.5) {
      findings.push('Abnormal High Entropy: Potential encrypted payload detected.');
      threatLevel = 'suspicious';
    }

    // Steganography: Check for data after EOF in JPEGs
    if (ext === '.jpg' || ext === '.jpeg') {
      const eofMarker = Buffer.from([0xFF, 0xD9]);
      const eofIndex = buffer.lastIndexOf(eofMarker);
      if (eofIndex !== -1 && eofIndex < buffer.length - 2) {
        findings.push(`Steganography Marker: ${buffer.length - eofIndex - 2} bytes of hidden data found after image end.`);
        threatLevel = 'malicious';
      }
    }

    // Steganography: Check for data after EOF in PNGs
    if (ext === '.png') {
      const eofMarker = Buffer.from('IEND');
      const eofIndex = buffer.lastIndexOf(eofMarker);
      if (eofIndex !== -1 && eofIndex < buffer.length - 8) {
        findings.push(`Steganography Marker: Data detected after IEND chunk.`);
        threatLevel = 'malicious';
      }
    }

    // Scan for suspicious binary strings
    const suspiciousStrings = ['powershell', 'cmd.exe', 'http://', 'https://', '/tmp/', 'eval(', 'base64'];
    for (const s of suspiciousStrings) {
      if (buffer.toString('utf8').includes(s)) {
        findings.push(`Malicious Marker: Suspicious string "${s}" found in binary.`);
        threatLevel = 'malicious';
      }
    }

    return {
      success: true,
      findings,
      threatLevel,
      entropy: entropy.toFixed(2),
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error('Deep scan error:', err);
    return { success: false, error: err.message };
  }
});

console.log('Barricade AI - Electron Main Process Started');
