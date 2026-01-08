/**
 * Threat Detection Service
 * Analyzes files for potential security threats and privacy concerns
 */

import { FileItem, ThreatLevel, PrivacyLevel } from '../types';

// Suspicious filename patterns that may indicate threats
const SUSPICIOUS_PATTERNS: RegExp[] = [
    /crack|keygen|patch|activator|loader/i,           // Piracy tools
    /hack|cheat|exploit|bypass/i,                     // Hacking tools
    /\.exe\.txt$|\.pdf\.exe$|\.doc\.exe$/i,          // Double extensions
    /\.scr$|\.pif$|\.com$/i,                          // Dangerous extensions
    /temp.*\.exe$/i,                                   // Temp executables
    /setup.*crack/i,                                   // Cracked installers
];

// Known malware naming patterns
const MALICIOUS_PATTERNS: RegExp[] = [
    /trojan|malware|virus|ransomware|worm/i,
    /cryptolocker|wannacry|petya|locky/i,
    /keylog|spyware|adware|rootkit/i,
    /fakealert|rogue|scareware/i,
];

// Privacy-critical patterns
const PRIVACY_CRITICAL_PATTERNS: RegExp[] = [
    /password|passwd|credential|secret/i,
    /apikey|api_key|api-key|token/i,
    /\.kdbx$|\.key$|id_rsa|\.pem$/i,                  // Key files
    /bank|ssn|social.?security|taxreturn/i,
    /credit.?card|cvv|pin.?code/i,
    /private.?key|secret.?key/i,
];

// Privacy-sensitive patterns
const PRIVACY_SENSITIVE_PATTERNS: RegExp[] = [
    /medical|health|insurance|hipaa/i,
    /legal|contract|agreement|nda/i,
    /payroll|salary|compensation|w2|1099/i,
    /invoice|receipt|statement/i,
    /personal|private|confidential/i,
    /backup|export|dump/i,
];

// Suspicious file locations (Windows paths)
const SUSPICIOUS_LOCATIONS: RegExp[] = [
    /\\AppData\\Local\\Temp\\.*\.exe$/i,
    /\\Temp\\.*\.exe$/i,
    /\\ProgramData\\.*\.exe$/i,
    /\\Users\\Public\\.*\.exe$/i,
];

/**
 * Analyze a file for potential threats
 */
export function analyzeThreatLevel(file: FileItem): ThreatLevel {
    const { name, path, extension } = file;
    const fullPath = path || '';

    // Check for malicious patterns first (highest priority)
    for (const pattern of MALICIOUS_PATTERNS) {
        if (pattern.test(name)) {
            return 'malicious';
        }
    }

    // Check suspicious locations for executables
    if (extension === '.exe') {
        for (const pattern of SUSPICIOUS_LOCATIONS) {
            if (pattern.test(fullPath)) {
                return 'suspicious';
            }
        }
    }

    // Check suspicious filename patterns
    for (const pattern of SUSPICIOUS_PATTERNS) {
        if (pattern.test(name)) {
            return 'suspicious';
        }
    }

    // Executables downloaded from internet are worth flagging
    if (['.exe', '.msi', '.bat', '.cmd', '.ps1', '.vbs', '.js'].includes(extension.toLowerCase())) {
        if (fullPath.toLowerCase().includes('download')) {
            return 'suspicious';
        }
    }

    return 'safe';
}

/**
 * Analyze a file for privacy concerns
 */
export function analyzePrivacyLevel(file: FileItem): PrivacyLevel {
    const { name, extension } = file;

    // Check critical privacy patterns
    for (const pattern of PRIVACY_CRITICAL_PATTERNS) {
        if (pattern.test(name)) {
            return 'critical';
        }
    }

    // Key and certificate files are always critical
    if (['.pem', '.key', '.pfx', '.p12', '.kdbx', '.keychain'].includes(extension.toLowerCase())) {
        return 'critical';
    }

    // Check sensitive privacy patterns
    for (const pattern of PRIVACY_SENSITIVE_PATTERNS) {
        if (pattern.test(name)) {
            return 'sensitive';
        }
    }

    // Documents and spreadsheets in certain folders might be sensitive
    if (['.pdf', '.doc', '.docx', '.xls', '.xlsx'].includes(extension.toLowerCase())) {
        if (name.toLowerCase().includes('tax') ||
            name.toLowerCase().includes('financial') ||
            name.toLowerCase().includes('statement')) {
            return 'sensitive';
        }
    }

    return 'public';
}

/**
 * Generate tags for a file based on analysis
 */
export function generateFileTags(file: FileItem): string[] {
    const tags: string[] = [];
    const { name, extension, size } = file;

    // Size-based tags
    if (size > 1024 * 1024 * 100) {
        tags.push('Large File');
    }
    if (size > 1024 * 1024 * 1000) {
        tags.push('Very Large');
    }

    // Content-based tags
    if (/password|credential/i.test(name)) {
        tags.push('Contains Credentials');
    }
    if (/bank|financial/i.test(name)) {
        tags.push('Financial Data');
    }
    if (/screenshot|screen.?cap/i.test(name)) {
        tags.push('Screenshot');
    }
    if (/backup|bak$/i.test(name)) {
        tags.push('Backup File');
    }

    // Type-based tags
    if (['.exe', '.msi'].includes(extension.toLowerCase())) {
        tags.push('Executable');
    }
    if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(extension.toLowerCase())) {
        tags.push('Archive');
    }

    // Threat indicators
    if (/crack|keygen|patch/i.test(name)) {
        tags.push('Potential Piracy Tool');
    }
    if (/\.exe\..*$/i.test(name)) {
        tags.push('Double Extension');
    }

    return tags;
}

/**
 * Get threat type description for malicious/suspicious files
 */
export function getThreatType(file: FileItem): string | undefined {
    const { name, path } = file;
    const fullPath = path || '';

    for (const pattern of MALICIOUS_PATTERNS) {
        if (pattern.test(name)) {
            return 'Malware:Generic/Suspicious';
        }
    }

    if (/crack|keygen/i.test(name)) {
        return 'PUP:Win32/Keygen';
    }

    if (/\.exe\./i.test(name)) {
        return 'Trojan:Generic/DoubleExt';
    }

    if (fullPath.toLowerCase().includes('temp') && name.endsWith('.exe')) {
        return 'Suspicious:Temp/Executable';
    }

    return undefined;
}

/**
 * Analyze an array of files and enrich with threat/privacy data
 */
export function analyzeFiles(files: FileItem[]): FileItem[] {
    return files.map(file => ({
        ...file,
        threatLevel: analyzeThreatLevel(file),
        privacyLevel: analyzePrivacyLevel(file),
        threatType: getThreatType(file),
        tags: generateFileTags(file),
    }));
}

/**
 * Get security summary for a set of files
 */
export function getSecuritySummary(files: FileItem[]) {
    const malicious = files.filter(f => f.threatLevel === 'malicious').length;
    const suspicious = files.filter(f => f.threatLevel === 'suspicious').length;
    const critical = files.filter(f => f.privacyLevel === 'critical').length;
    const sensitive = files.filter(f => f.privacyLevel === 'sensitive').length;

    // Calculate integrity score (0-100)
    let score = 100;
    score -= malicious * 25;  // Each malicious file costs 25 points
    score -= suspicious * 5;   // Each suspicious file costs 5 points
    score -= critical * 10;    // Each critical privacy file costs 10 points
    score -= sensitive * 2;    // Each sensitive file costs 2 points

    return {
        totalFiles: files.length,
        maliciousCount: malicious,
        suspiciousCount: suspicious,
        criticalPrivacyCount: critical,
        sensitivePrivacyCount: sensitive,
        integrityScore: Math.max(0, Math.min(100, score)),
        status: malicious > 0 ? 'alert' : suspicious > 0 ? 'warning' : 'protected'
    };
}
