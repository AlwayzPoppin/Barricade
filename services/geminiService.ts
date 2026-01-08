
import { GoogleGenAI, Type, FunctionDeclaration, Chat } from "@google/genai";
import { FileItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const privacyAuditTool: FunctionDeclaration = {
  name: 'privacy_audit',
  parameters: {
    type: Type.OBJECT,
    description: 'Scans files for sensitive privacy indicators like "unencrypted", "password", "bank", or PII patterns.',
    properties: {
      folder: { type: Type.STRING, description: 'The folder to audit (e.g. "Screenshots").' }
    },
    required: ['folder']
  }
};

const optimizeStorageTool: FunctionDeclaration = {
  name: 'optimize_storage',
  parameters: {
    type: Type.OBJECT,
    description: 'Identifies duplicates or obsolete installers to free up system space.',
    properties: {
      aggressive: { type: Type.BOOLEAN, description: 'Whether to include old application versions in cleanup.' }
    }
  }
};

const searchFilesTool: FunctionDeclaration = {
  name: 'search_files',
  parameters: {
    type: Type.OBJECT,
    description: 'Search for specific files or applications by name, type, or extension.',
    properties: {
      query: { type: Type.STRING, description: 'The search term (e.g., "pdf", "zoom", "installer").' }
    },
    required: ['query']
  }
};

const deleteFilesTool: FunctionDeclaration = {
  name: 'suggest_delete_files',
  parameters: {
    type: Type.OBJECT,
    description: 'Suggest moving files to the Recycle Bin if they seem redundant or cluttered.',
    properties: {
      fileIds: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'The IDs of the files to be recycled.' },
      reason: { type: Type.STRING, description: 'A detailed explanation citing specific file names and why they are redundant.' }
    },
    required: ['fileIds', 'reason']
  }
};

const organizeFilesTool: FunctionDeclaration = {
  name: 'organize_files',
  parameters: {
    type: Type.OBJECT,
    description: 'Suggest organizing files into categorized subfolders (e.g. "Images", "Documents").',
    properties: {
      fileIds: { type: Type.ARRAY, items: { type: Type.STRING } },
      category: { type: Type.STRING, description: 'Optional target folder name (e.g. "Work", "University").' },
      reason: { type: Type.STRING, description: 'Clearly explain which files are being sorted and into what category.' }
    },
    required: ['fileIds', 'reason']
  }
};

const quarantineFileTool: FunctionDeclaration = {
  name: 'quarantine_file',
  parameters: {
    type: Type.OBJECT,
    description: 'Move a suspicious or malicious file to the Quarantine Sector.',
    properties: {
      fileIds: { type: Type.ARRAY, items: { type: Type.STRING } },
      reason: { type: Type.STRING, description: 'CRITICAL: Exhaustively explain the matched heuristic pattern and file name (e.g. "Flagged bad_file.exe due to Trojan:Generic/DoubleExt detection").' }
    },
    required: ['fileIds', 'reason']
  }
};

const vaultFileTool: FunctionDeclaration = {
  name: 'vault_file',
  parameters: {
    type: Type.OBJECT,
    description: 'Move a sensitive document (not malware) to the Secure Vault Chamber for protection.',
    properties: {
      fileIds: { type: Type.ARRAY, items: { type: Type.STRING } },
      reason: { type: Type.STRING, description: 'Explain exactly what sensitive content was found to justify vaulting.' }
    },
    required: ['fileIds', 'reason']
  }
};

const updateSettingsTool: FunctionDeclaration = {
  name: 'update_settings',
  parameters: {
    type: Type.OBJECT,
    description: 'Update the applications internal security and system settings.',
    properties: {
      aiSensitivity: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
      enableNativeNotifications: { type: Type.BOOLEAN },
      enableProactiveSentry: { type: Type.BOOLEAN },
      sentryScanInterval: { type: Type.NUMBER }
    }
  }
};

const deepScanFileTool: FunctionDeclaration = {
  name: 'deep_scan_file',
  parameters: {
    type: Type.OBJECT,
    description: 'Perform a forensic byte-level scan on a suspicious file to detect steganography, hidden payloads, or high entropy.',
    properties: {
      fileId: { type: Type.STRING },
      reason: { type: Type.STRING, description: 'Explain the visual or structural anomaly that warrants a byte-level forensic scan.' }
    },
    required: ['fileId', 'reason']
  }
};

export const createOmniChat = (files: FileItem[], settings?: AppSettings): Chat => {
  const fileContext = files.map(f => ({
    id: f.id,
    name: f.name,
    extension: f.extension,
    folder: f.folder,
    size: f.size,
    type: f.type,
    threatLevel: f.threatLevel || 'safe',
    threatType: f.threatType || 'none',
    privacyLevel: f.privacyLevel || 'public',
    tags: f.tags || []
  }));

  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: `
        1. DEFENSE: Act as an antivirus. Flag malicious patterns, suggest quarantines for threats, and maintain a high system integrity score.
           STRICT REPORTING: For every threat detected, you MUST name the specific file(s) and EXPLAIN the exact heuristic or pattern matched (e.g. "Flagged 'setup_crack.exe' due to 'Potentially Piracy Tool' pattern in Downloads").
        2. PRIVACY/VAULT: Detect PII (Personally Identifiable Information). If a file is sensitive (passwords, banking) but NOT malware, suggest moving it to the 'Secure Vault Chamber' via 'vault_file'. Explain why a file is sensitive.
        3. ORGANIZATION: Monitor cluttered folders (especially Downloads). Suggest 'organize_files' to sort files by type or date into neat subfolders. Be specific about which files will be moved.
        4. CONFIGURATION: You can help the user change their settings using 'update_settings'.
        5. MALWARE IN MEDIA: If asked, confirm that malware CAN be hidden in MP3s or images via steganography or by exploiting media decoder vulnerabilities (e.g. buffer overflows in codecs).
        6. OPTIMIZATION: Monitor storage bloat and suggest 'optimize_storage' when necessary, citing specific large files.
        7. TRANSPARENCY: Avoid vague summaries like "multiple executables flagged". Always provide a granular breakdown. If you are suggesting an action, the 'reason' field in the tool call MUST be detailed and cite specific file names.
        
        USER SETTINGS:
        ${settings ? JSON.stringify(settings) : 'Default Configuration'}

        CONTEXT:
        ${JSON.stringify(fileContext)}
        
        TONE: Vigilant, authoritative yet helpful, and security-first.
      `,
      tools: [{ functionDeclarations: [privacyAuditTool, optimizeStorageTool, searchFilesTool, deleteFilesTool, quarantineFileTool, vaultFileTool, organizeFilesTool, updateSettingsTool, deepScanFileTool] }]
    }
  });
};
