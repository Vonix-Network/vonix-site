'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    Server, RefreshCw, Play, Square, RotateCcw, Skull,
    Cpu, HardDrive, Activity, Wifi, WifiOff, Terminal, Send,
    FolderOpen, Database, Archive, Settings2, ChevronRight, Clock,
    Globe, ArrowDown, ArrowUp, Maximize2, Minimize2, ChevronDown,
    File, Folder, ArrowLeft, Plus, Trash2, Edit, Save, X, Download,
    Copy, Lock, Unlock, Calendar
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface PterodactylServer {
    identifier: string;
    uuid: string;
    name: string;
    description?: string;
    node: string;
    allocation?: { ip: string; port: number };
    limits?: { memory: number; disk: number; cpu: number };
    featureLimits?: { databases: number; allocations: number; backups: number };
}

interface ServerResources {
    currentState: 'running' | 'starting' | 'stopping' | 'offline';
    isSuspended: boolean;
    resources: {
        memoryBytes: number;
        cpuAbsolute: number;
        diskBytes: number;
        networkRxBytes: number;
        networkTxBytes: number;
        uptime: number;
    };
}

interface FileItem {
    name: string;
    mode: string;
    size: number;
    isFile: boolean;
    isSymlink: boolean;
    mimetype: string;
    createdAt: string;
    modifiedAt: string;
}

interface DatabaseItem {
    id: string;
    name: string;
    username: string;
    host: string;
    port: number;
    connectionsFrom: string;
}

interface BackupItem {
    uuid: string;
    name: string;
    bytes: number;
    isSuccessful: boolean;
    isLocked: boolean;
    createdAt: string;
    completedAt: string;
}

interface StartupVariable {
    name: string;
    description: string;
    envVariable: string;
    defaultValue: string;
    serverValue: string;
    isEditable: boolean;
    rules: string;
}

interface StatsHistory {
    timestamp: number;
    cpu: number;
    memory: number;
    networkRx: number;
    networkTx: number;
}

type TabType = 'console' | 'files' | 'databases' | 'backups' | 'startup';

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatUptime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h}h ${m}m ${s}s`;
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString();
}

function getTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks ago`;
    return `${Math.floor(seconds / 2592000)} months ago`;
}

function SparklineChart({ data, color, height = 60 }: { data: number[]; color: string; height?: number }) {
    if (data.length < 2) {
        return (
            <svg viewBox={`0 0 100 ${height}`} className="w-full" style={{ height }}>
                <line x1="0" y1={height - 1} x2="100" y2={height - 1} stroke={color} strokeWidth="1" strokeOpacity="0.3" />
            </svg>
        );
    }

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1; // Avoid division by zero if all values are the same
    const padding = height * 0.1; // 10% padding top and bottom
    const chartHeight = height - (padding * 2);
    const width = 100;

    const points = data.map((value, i) => {
        const x = (i / (data.length - 1)) * width;
        // Normalize value to 0-1 range, then scale to chart height with padding
        const normalized = (value - min) / range;
        const y = padding + chartHeight - (normalized * chartHeight);
        return `${x},${y}`;
    }).join(' ');

    const gradientId = `gradient-${Math.random().toString(36).substr(2, 9)}`;

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
            <defs>
                <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.05" />
                </linearGradient>
            </defs>
            <polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#${gradientId})`} />
            <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

const navItems: { id: TabType; label: string; icon: any; description: string }[] = [
    { id: 'console', label: 'Console', icon: Terminal, description: 'Server console & commands' },
    { id: 'files', label: 'Files', icon: FolderOpen, description: 'File manager' },
    { id: 'databases', label: 'Databases', icon: Database, description: 'MySQL databases' },
    { id: 'backups', label: 'Backups', icon: Archive, description: 'Backup management' },
    { id: 'startup', label: 'Startup', icon: Settings2, description: 'Startup configuration' },
];

export default function ServerPanelPage() {
    const [servers, setServers] = useState<PterodactylServer[]>([]);
    const [selectedServer, setSelectedServer] = useState<PterodactylServer | null>(null);
    const [resources, setResources] = useState<ServerResources | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPterodactylConfigured, setIsPterodactylConfigured] = useState(false);
    const [actionInProgress, setActionInProgress] = useState<string | null>(null);
    const [command, setCommand] = useState('');
    const [consoleLines, setConsoleLines] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [wsError, setWsError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('console');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showServerDropdown, setShowServerDropdown] = useState(false);
    const [statsHistory, setStatsHistory] = useState<StatsHistory[]>([]);

    // Files state
    const [currentPath, setCurrentPath] = useState('/');
    const [files, setFiles] = useState<FileItem[]>([]);
    const [filesLoading, setFilesLoading] = useState(false);
    const [editingFile, setEditingFile] = useState<string | null>(null);
    const [fileContent, setFileContent] = useState('');
    const [newFolderName, setNewFolderName] = useState('');
    const [showNewFolder, setShowNewFolder] = useState(false);

    // Databases state
    const [databases, setDatabases] = useState<DatabaseItem[]>([]);
    const [databasesLoading, setDatabasesLoading] = useState(false);
    const [newDbName, setNewDbName] = useState('');
    const [showNewDb, setShowNewDb] = useState(false);

    // Backups state
    const [backups, setBackups] = useState<BackupItem[]>([]);
    const [backupsLoading, setBackupsLoading] = useState(false);
    const [newBackupName, setNewBackupName] = useState('');
    const [showNewBackup, setShowNewBackup] = useState(false);
    const [backupTab, setBackupTab] = useState<'user' | 'system'>('user');

    // Computed backup categories
    // User backups have human-readable names, system backups have hash-like or empty names
    const userBackups = backups.filter(b => b.name && !/^[a-f0-9]{32,}$/i.test(b.name));
    const systemBackups = backups.filter(b => !b.name || /^[a-f0-9]{32,}$/i.test(b.name));

    // Categorize system backups by age
    const now = Date.now();
    const hourlyBackups = systemBackups.filter(b => {
        const age = now - new Date(b.createdAt).getTime();
        return age < 24 * 60 * 60 * 1000; // Last 24 hours
    });
    const weeklyBackups = systemBackups.filter(b => {
        const age = now - new Date(b.createdAt).getTime();
        return age >= 24 * 60 * 60 * 1000 && age < 7 * 24 * 60 * 60 * 1000; // 1-7 days
    });
    const dailyBackups = systemBackups.filter(b => {
        const age = now - new Date(b.createdAt).getTime();
        return age >= 7 * 24 * 60 * 60 * 1000; // Older than 7 days
    });

    // Startup state
    const [startupVariables, setStartupVariables] = useState<StartupVariable[]>([]);
    const [startupLoading, setStartupLoading] = useState(false);
    const [editingVariable, setEditingVariable] = useState<string | null>(null);
    const [variableValue, setVariableValue] = useState('');

    const wsRef = useRef<any>(null);
    const [wsConnected, setWsConnected] = useState(false);
    const [wsConnecting, setWsConnecting] = useState(false);
    const consoleEndRef = useRef<HTMLDivElement>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const consoleContainerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Console scroll tracking
    const [isAtBottom, setIsAtBottom] = useState(true);
    const [hasNewLogs, setHasNewLogs] = useState(false);
    const isAtBottomRef = useRef(true); // Ref for use in callbacks

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowServerDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Console scroll handling
    const handleConsoleScroll = useCallback(() => {
        if (!consoleContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = consoleContainerRef.current;
        const atBottom = scrollHeight - scrollTop - clientHeight < 50;
        setIsAtBottom(atBottom);
        isAtBottomRef.current = atBottom;
        if (atBottom) setHasNewLogs(false);
    }, []);

    const scrollToBottom = useCallback(() => {
        consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        setHasNewLogs(false);
        setIsAtBottom(true);
        isAtBottomRef.current = true;
    }, []);

    // Auto-scroll when new logs arrive (only if user is at bottom)
    useEffect(() => {
        if (isAtBottom && consoleContainerRef.current) {
            consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [consoleLines, isAtBottom]);

    useEffect(() => {
        fetchServers();
        return () => {
            const ref = wsRef.current as any;
            if (ref?.close) ref.close();
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        };
    }, []);

    const fetchServers = async () => {
        try {
            const configRes = await fetch('/api/admin/pterodactyl');
            if (configRes.ok) {
                const configData = await configRes.json();
                setIsPterodactylConfigured(configData.configured);
                if (!configData.configured) {
                    setIsLoading(false);
                    return;
                }
            }
            const res = await fetch('/api/admin/pterodactyl/servers');
            if (res.ok) {
                const data = await res.json();
                setServers(data.servers || []);
                if (data.servers?.length > 0 && !selectedServer) {
                    setSelectedServer(data.servers[0]);
                }
            }
        } catch (err) {
            console.error('Failed to fetch servers:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchServerResources = useCallback(async () => {
        if (!selectedServer) return;
        try {
            const res = await fetch(`/api/admin/pterodactyl/server/${selectedServer.identifier}`);
            if (res.ok) {
                const data = await res.json();
                setResources(data.resources);
                if (data.resources) {
                    setStatsHistory(prev => [...prev, {
                        timestamp: Date.now(),
                        cpu: data.resources.resources.cpuAbsolute,
                        memory: data.resources.resources.memoryBytes,
                        networkRx: data.resources.resources.networkRxBytes,
                        networkTx: data.resources.resources.networkTxBytes,
                    }].slice(-60));
                }
            }
        } catch (err) { }
    }, [selectedServer]);

    // Files functions
    const fetchFiles = async (path: string = '/') => {
        if (!selectedServer) return;
        setFilesLoading(true);
        try {
            const res = await fetch(`/api/admin/pterodactyl/server/${selectedServer.identifier}/files?directory=${encodeURIComponent(path)}`);
            if (res.ok) {
                const data = await res.json();
                setFiles(data.files || []);
                setCurrentPath(path);
            }
        } catch (err) {
            setError('Failed to load files');
        } finally {
            setFilesLoading(false);
        }
    };

    const openFile = async (fileName: string) => {
        if (!selectedServer) return;
        const filePath = currentPath === '/' ? `/${fileName}` : `${currentPath}/${fileName}`;
        try {
            const res = await fetch(`/api/admin/pterodactyl/server/${selectedServer.identifier}/files/contents?file=${encodeURIComponent(filePath)}`);
            if (res.ok) {
                const data = await res.json();
                setFileContent(data.content);
                setEditingFile(filePath);
            }
        } catch (err) {
            setError('Failed to open file');
        }
    };

    const saveFile = async () => {
        if (!selectedServer || !editingFile) return;
        try {
            const res = await fetch(`/api/admin/pterodactyl/server/${selectedServer.identifier}/files/contents?file=${encodeURIComponent(editingFile)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: fileContent }),
            });
            if (res.ok) {
                setEditingFile(null);
                setFileContent('');
            } else {
                setError('Failed to save file');
            }
        } catch (err) {
            setError('Failed to save file');
        }
    };

    const deleteFile = async (fileName: string) => {
        if (!selectedServer || !confirm(`Delete ${fileName}?`)) return;
        try {
            const res = await fetch(`/api/admin/pterodactyl/server/${selectedServer.identifier}/files`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete', root: currentPath, files: [fileName] }),
            });
            if (res.ok) fetchFiles(currentPath);
            else setError('Failed to delete');
        } catch (err) {
            setError('Failed to delete');
        }
    };

    const createFolder = async () => {
        if (!selectedServer || !newFolderName.trim()) return;
        try {
            const res = await fetch(`/api/admin/pterodactyl/server/${selectedServer.identifier}/files`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'create-folder', root: currentPath, name: newFolderName }),
            });
            if (res.ok) {
                setShowNewFolder(false);
                setNewFolderName('');
                fetchFiles(currentPath);
            }
        } catch (err) {
            setError('Failed to create folder');
        }
    };

    // Databases functions
    const fetchDatabases = async () => {
        if (!selectedServer) return;
        setDatabasesLoading(true);
        try {
            const res = await fetch(`/api/admin/pterodactyl/server/${selectedServer.identifier}/databases`);
            if (res.ok) {
                const data = await res.json();
                setDatabases(data.databases || []);
            }
        } catch (err) {
            setError('Failed to load databases');
        } finally {
            setDatabasesLoading(false);
        }
    };

    const createDatabase = async () => {
        if (!selectedServer || !newDbName.trim()) return;
        try {
            const res = await fetch(`/api/admin/pterodactyl/server/${selectedServer.identifier}/databases`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ database: newDbName }),
            });
            if (res.ok) {
                setShowNewDb(false);
                setNewDbName('');
                fetchDatabases();
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to create database');
            }
        } catch (err) {
            setError('Failed to create database');
        }
    };

    const deleteDatabase = async (id: string) => {
        if (!selectedServer || !confirm('Delete this database?')) return;
        try {
            const res = await fetch(`/api/admin/pterodactyl/server/${selectedServer.identifier}/databases?id=${id}`, { method: 'DELETE' });
            if (res.ok) fetchDatabases();
            else setError('Failed to delete database');
        } catch (err) {
            setError('Failed to delete database');
        }
    };

    // Backups functions
    const fetchBackups = async () => {
        if (!selectedServer) return;
        setBackupsLoading(true);
        try {
            const res = await fetch(`/api/admin/pterodactyl/server/${selectedServer.identifier}/backups`);
            if (res.ok) {
                const data = await res.json();
                setBackups(data.backups || []);
            }
        } catch (err) {
            setError('Failed to load backups');
        } finally {
            setBackupsLoading(false);
        }
    };

    const createBackup = async () => {
        if (!selectedServer) return;
        try {
            const res = await fetch(`/api/admin/pterodactyl/server/${selectedServer.identifier}/backups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newBackupName || undefined }),
            });
            if (res.ok) {
                setShowNewBackup(false);
                setNewBackupName('');
                fetchBackups();
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to create backup');
            }
        } catch (err) {
            setError('Failed to create backup');
        }
    };

    const deleteBackup = async (uuid: string) => {
        if (!selectedServer || !confirm('Delete this backup?')) return;
        try {
            const res = await fetch(`/api/admin/pterodactyl/server/${selectedServer.identifier}/backups?uuid=${uuid}`, { method: 'DELETE' });
            if (res.ok) fetchBackups();
            else setError('Failed to delete backup');
        } catch (err) {
            setError('Failed to delete backup');
        }
    };

    // Startup functions
    const fetchStartup = async () => {
        if (!selectedServer) return;
        setStartupLoading(true);
        try {
            const res = await fetch(`/api/admin/pterodactyl/server/${selectedServer.identifier}/startup`);
            if (res.ok) {
                const data = await res.json();
                setStartupVariables(data.variables || []);
            }
        } catch (err) {
            setError('Failed to load startup variables');
        } finally {
            setStartupLoading(false);
        }
    };

    const updateVariable = async (key: string) => {
        if (!selectedServer) return;
        try {
            const res = await fetch(`/api/admin/pterodactyl/server/${selectedServer.identifier}/startup`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key, value: variableValue }),
            });
            if (res.ok) {
                setEditingVariable(null);
                fetchStartup();
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to update variable');
            }
        } catch (err) {
            setError('Failed to update variable');
        }
    };

    // Load tab data when switching
    useEffect(() => {
        if (!selectedServer) return;
        if (activeTab === 'files') fetchFiles(currentPath);
        else if (activeTab === 'databases') fetchDatabases();
        else if (activeTab === 'backups') fetchBackups();
        else if (activeTab === 'startup') fetchStartup();
    }, [activeTab, selectedServer]);

    const connectConsole = useCallback((server: PterodactylServer) => {
        if (wsConnecting) return;
        setWsConnecting(true);
        setWsError(null);

        const eventSource = new EventSource(`/api/admin/pterodactyl/server/${server.identifier}/console`);
        wsRef.current = eventSource;

        eventSource.addEventListener('connected', () => { setWsConnected(true); setWsConnecting(false); });
        eventSource.addEventListener('output', (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.line) {
                    setConsoleLines(prev => [...prev, data.line].slice(-500));
                    // If user is not at bottom, show new logs indicator
                    if (!isAtBottomRef.current) {
                        setHasNewLogs(true);
                    }
                }
            } catch (e) { }
        });
        eventSource.addEventListener('stats', (event) => {
            try {
                const stats = JSON.parse(event.data);
                setResources(prev => prev ? {
                    ...prev, currentState: stats.state,
                    resources: {
                        memoryBytes: stats.memory_bytes || 0, cpuAbsolute: stats.cpu_absolute || 0,
                        diskBytes: stats.disk_bytes || 0, networkRxBytes: stats.network?.rx_bytes || 0,
                        networkTxBytes: stats.network?.tx_bytes || 0, uptime: stats.uptime || 0,
                    },
                } : null);
                setStatsHistory(prev => [...prev, {
                    timestamp: Date.now(), cpu: stats.cpu_absolute || 0, memory: stats.memory_bytes || 0,
                    networkRx: stats.network?.rx_bytes || 0, networkTx: stats.network?.tx_bytes || 0,
                }].slice(-60));
            } catch (e) { }
        });
        eventSource.addEventListener('disconnected', () => { setWsConnected(false); setWsConnecting(false); });
        eventSource.onerror = () => {
            setWsConnected(false); setWsConnecting(false);
            if (eventSource.readyState === EventSource.CLOSED) setWsError('Console connection closed.');
        };
        eventSource.addEventListener('token_expired', () => { eventSource.close(); setTimeout(() => connectConsole(server), 1000); });
    }, [wsConnecting]);

    useEffect(() => {
        if (selectedServer) {
            const currentRef = wsRef.current as any;
            if (currentRef?.close) currentRef.close();
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            setWsConnected(false); setWsConnecting(false); setWsError(null);
            setConsoleLines([]); setStatsHistory([]); setResources(null);
            setCurrentPath('/'); setFiles([]); setEditingFile(null);
            fetchServerResources(); connectConsole(selectedServer);
            const interval = setInterval(fetchServerResources, 3000);
            return () => {
                clearInterval(interval);
                const ref = wsRef.current as any;
                if (ref?.close) ref.close();
                if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            };
        }
    }, [selectedServer]);

    const sendPowerAction = async (action: 'start' | 'stop' | 'restart' | 'kill') => {
        if (!selectedServer) return;
        setActionInProgress(action);
        try {
            const res = await fetch(`/api/admin/pterodactyl/server/${selectedServer.identifier}/power`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
            });
            if (!res.ok) { const data = await res.json(); setError(data.error || `Failed to ${action} server`); }
        } catch (err) { setError('Network error'); }
        finally { setActionInProgress(null); }
    };

    const sendConsoleCommand = async () => {
        if (!selectedServer || !command.trim()) return;
        try {
            const res = await fetch(`/api/admin/pterodactyl/server/${selectedServer.identifier}/command`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: command.trim() }),
            });
            if (res.ok) { setConsoleLines(prev => [...prev, `> ${command}`]); setCommand(''); }
            else { const data = await res.json(); setError(data.error || 'Failed to send command'); }
        } catch (err) { setError('Failed to send command'); }
    };

    if (isLoading) return <div className="flex items-center justify-center min-h-[400px]"><RefreshCw className="w-8 h-8 animate-spin text-neon-cyan" /></div>;

    if (!isPterodactylConfigured) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold gradient-text">Server Panel</h1>
                <Card variant="glass" className="text-center py-12">
                    <CardContent>
                        <Server className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h3 className="text-xl font-bold mb-2">Pterodactyl Not Configured</h3>
                        <p className="text-muted-foreground mb-4">Configure your Pterodactyl panel settings first.</p>
                        <Button variant="gradient" onClick={() => window.location.href = '/admin/pterodactyl'}>Go to Settings</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (servers.length === 0) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold gradient-text">Server Panel</h1>
                <Card variant="glass" className="text-center py-12">
                    <CardContent>
                        <Server className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <h3 className="text-xl font-bold mb-2">No Servers Found</h3>
                        <p className="text-muted-foreground mb-4">Your API key doesn't have access to any servers.</p>
                        <Button variant="gradient" onClick={fetchServers}><RefreshCw className="w-4 h-4 mr-2" /> Retry</Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex h-[calc(100vh-100px)] gap-4">
            {/* Sidebar */}
            <div className="w-64 flex-shrink-0 flex flex-col gap-4">
                {/* Server Selector */}
                <div className="relative" ref={dropdownRef}>
                    <button onClick={() => setShowServerDropdown(!showServerDropdown)}
                        className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-card/50 border border-border rounded-lg hover:border-neon-cyan/50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                            <Server className="w-5 h-5 text-neon-cyan flex-shrink-0" />
                            <div className="text-left min-w-0">
                                <p className="font-medium truncate">{selectedServer?.name || 'Select Server'}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                    {selectedServer?.allocation ? `${selectedServer.allocation.ip}:${selectedServer.allocation.port}` : 'No server selected'}
                                </p>
                            </div>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showServerDropdown ? 'rotate-180' : ''}`} />
                    </button>
                    {showServerDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-xl z-50 max-h-64 overflow-auto">
                            {servers.map((server) => (
                                <button key={server.identifier} onClick={() => { setSelectedServer(server); setShowServerDropdown(false); }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-neon-cyan/10 transition-colors ${selectedServer?.identifier === server.identifier ? 'bg-neon-cyan/20' : ''}`}>
                                    <Server className="w-4 h-4 text-neon-purple" />
                                    <div className="text-left min-w-0">
                                        <p className="font-medium truncate">{server.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{server.allocation ? `${server.allocation.ip}:${server.allocation.port}` : server.node}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Server Status */}
                {selectedServer && resources && (
                    <Card variant="glass" className="p-4">
                        <div className="flex items-center justify-between mb-3">
                            <Badge variant={resources.currentState === 'running' ? 'success' : resources.currentState === 'starting' || resources.currentState === 'stopping' ? 'warning' : 'error'}>
                                {resources.currentState === 'running' ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
                                {resources.currentState}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{formatUptime(resources.resources.uptime / 1000)}</span>
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-muted-foreground">CPU</span><span className="text-yellow-500">{resources.resources.cpuAbsolute.toFixed(1)}%</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">RAM</span><span className="text-green-500">{formatBytes(resources.resources.memoryBytes)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">Disk</span><span className="text-blue-500">{formatBytes(resources.resources.diskBytes)}</span></div>
                        </div>
                        <div className="grid grid-cols-4 gap-1 mt-4">
                            <Button variant="neon-outline" size="sm" className="px-2" onClick={() => sendPowerAction('start')} disabled={actionInProgress !== null || resources.currentState === 'running'}>
                                {actionInProgress === 'start' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                            </Button>
                            <Button variant="neon-outline" size="sm" className="px-2" onClick={() => sendPowerAction('restart')} disabled={actionInProgress !== null}>
                                {actionInProgress === 'restart' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                            </Button>
                            <Button variant="neon-outline" size="sm" className="px-2" onClick={() => sendPowerAction('stop')} disabled={actionInProgress !== null || resources.currentState === 'offline'}>
                                {actionInProgress === 'stop' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Square className="w-3 h-3" />}
                            </Button>
                            <Button variant="ghost" size="sm" className="px-2 text-error" onClick={() => sendPowerAction('kill')} disabled={actionInProgress !== null || resources.currentState === 'offline'}>
                                <Skull className="w-3 h-3" />
                            </Button>
                        </div>
                    </Card>
                )}

                {/* Navigation */}
                <nav className="flex-1 space-y-1">
                    {navItems.map((item) => (
                        <button key={item.id} onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${activeTab === item.id ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30' : 'hover:bg-card text-muted-foreground hover:text-foreground'}`}>
                            <item.icon className="w-4 h-4" /><span className="font-medium">{item.label}</span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0 flex flex-col">
                {error && (
                    <div className="p-3 rounded-lg bg-error/10 border border-error text-error text-sm flex justify-between mb-4">
                        <span>{error}</span><button onClick={() => setError(null)}>×</button>
                    </div>
                )}

                {/* Console Tab */}
                {activeTab === 'console' && selectedServer && (
                    <>
                        <Card variant="neon-glow" className={`flex-1 flex flex-col ${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
                            <CardHeader className="py-2 px-4 flex-row items-center justify-between border-b border-border">
                                <div className="flex items-center gap-3">
                                    <Terminal className="w-5 h-5" /><span className="font-semibold">Console</span>
                                    <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-success' : wsConnecting ? 'bg-warning animate-pulse' : 'bg-error'}`} />
                                    <span className="text-xs text-muted-foreground">{wsConnected ? 'Connected' : wsConnecting ? 'Connecting...' : 'Disconnected'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {!wsConnected && !wsConnecting && <Button variant="ghost" size="sm" onClick={() => selectedServer && connectConsole(selectedServer)} className="text-xs"><RefreshCw className="w-3 h-3 mr-1" /> Reconnect</Button>}
                                    <Button variant="ghost" size="sm" onClick={() => setIsFullscreen(!isFullscreen)}>{isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</Button>
                                </div>
                            </CardHeader>
                            <div ref={consoleContainerRef} onScroll={handleConsoleScroll} className="flex-1 bg-[#0a0a0a] font-mono text-xs overflow-auto p-3 max-h-[500px] relative">
                                {consoleLines.length === 0 ? (
                                    <div className="text-muted-foreground text-center py-8 space-y-2">
                                        {wsConnected ? <p>Waiting for console output...</p> : wsError ? <><p className="text-yellow-500">⚠️ {wsError}</p><p className="text-xs">You can still send commands below.</p></> : wsConnecting ? <p>Connecting...</p> : <p>Console not connected</p>}
                                    </div>
                                ) : consoleLines.map((line, i) => (
                                    <div key={i} className="text-gray-300 whitespace-pre-wrap break-all leading-5 hover:bg-white/5 px-1"
                                        dangerouslySetInnerHTML={{
                                            __html: line.replace(/\x1b\[[0-9;]*m/g, '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\[(INFO|WARN|ERROR|DEBUG)\]/gi, (match) => {
                                                const level = match.slice(1, -1).toUpperCase();
                                                const colors: Record<string, string> = { INFO: '#3b82f6', WARN: '#eab308', ERROR: '#ef4444', DEBUG: '#6b7280' };
                                                return `<span style="color: ${colors[level] || '#9ca3af'}">[${level}]</span>`;
                                            })
                                        }} />
                                ))}
                                <div ref={consoleEndRef} />

                                {/* Scroll to Bottom Button */}
                                {!isAtBottom && (
                                    <button
                                        onClick={scrollToBottom}
                                        className="absolute bottom-4 right-4 p-2 bg-card/90 hover:bg-card border border-border rounded-full shadow-lg transition-all hover:scale-105"
                                        title="Scroll to bottom"
                                    >
                                        <ArrowDown className="w-4 h-4" />
                                        {hasNewLogs && (
                                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-neon-cyan rounded-full animate-pulse" />
                                        )}
                                    </button>
                                )}
                            </div>
                            <div className="p-2 border-t border-border bg-background/50">
                                <div className="flex gap-2">
                                    <div className="flex-1 relative">
                                        <ChevronRight className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-neon-cyan" />
                                        <Input value={command} onChange={(e) => setCommand(e.target.value)} placeholder="Type a command..."
                                            onKeyDown={(e) => e.key === 'Enter' && sendConsoleCommand()} disabled={resources?.currentState !== 'running'}
                                            className="pl-8 font-mono text-sm bg-[#0a0a0a] border-border" />
                                    </div>
                                    <Button variant="gradient" onClick={sendConsoleCommand} disabled={resources?.currentState !== 'running' || !command.trim()}><Send className="w-4 h-4" /></Button>
                                </div>
                            </div>
                        </Card>
                        {statsHistory.length > 1 && selectedServer && (
                            <div className="grid grid-cols-3 gap-4 mt-4">
                                <Card variant="glass" className="p-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-xs text-muted-foreground">CPU Load</p>
                                        <span className="text-sm font-semibold text-yellow-500">
                                            {statsHistory[statsHistory.length - 1]?.cpu.toFixed(1)}%
                                            {selectedServer.limits?.cpu ? <span className="text-muted-foreground font-normal"> / {selectedServer.limits.cpu}%</span> : null}
                                        </span>
                                    </div>
                                    {selectedServer.limits?.cpu && (
                                        <div className="h-1 bg-muted rounded-full mb-2 overflow-hidden">
                                            <div className="h-full bg-yellow-500 transition-all" style={{ width: `${Math.min(100, (statsHistory[statsHistory.length - 1]?.cpu || 0) / selectedServer.limits.cpu * 100)}%` }} />
                                        </div>
                                    )}
                                    <SparklineChart data={statsHistory.map(s => s.cpu)} color="#eab308" height={40} />
                                </Card>
                                <Card variant="glass" className="p-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-xs text-muted-foreground">Memory</p>
                                        <span className="text-sm font-semibold text-green-500">
                                            {formatBytes(statsHistory[statsHistory.length - 1]?.memory || 0)}
                                            {selectedServer.limits?.memory ? <span className="text-muted-foreground font-normal"> / {(selectedServer.limits.memory / 1024).toFixed(1)} GiB</span> : null}
                                        </span>
                                    </div>
                                    {selectedServer.limits?.memory && (
                                        <div className="h-1 bg-muted rounded-full mb-2 overflow-hidden">
                                            <div className="h-full bg-green-500 transition-all" style={{ width: `${Math.min(100, (statsHistory[statsHistory.length - 1]?.memory || 0) / (selectedServer.limits.memory * 1024 * 1024) * 100)}%` }} />
                                        </div>
                                    )}
                                    <SparklineChart data={statsHistory.map(s => s.memory)} color="#22c55e" height={40} />
                                </Card>
                                <Card variant="glass" className="p-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-xs text-muted-foreground">Network I/O</p>
                                        <span className="text-sm font-semibold text-blue-500">
                                            {formatBytes((statsHistory[statsHistory.length - 1]?.networkRx || 0) + (statsHistory[statsHistory.length - 1]?.networkTx || 0))}
                                        </span>
                                    </div>
                                    <div className="flex gap-2 text-xs text-muted-foreground mb-2">
                                        <span>↓ {formatBytes(statsHistory[statsHistory.length - 1]?.networkRx || 0)}</span>
                                        <span>↑ {formatBytes(statsHistory[statsHistory.length - 1]?.networkTx || 0)}</span>
                                    </div>
                                    <SparklineChart data={statsHistory.map(s => s.networkRx + s.networkTx)} color="#3b82f6" height={40} />
                                </Card>
                            </div>
                        )}
                    </>
                )}

                {/* Files Tab */}
                {activeTab === 'files' && selectedServer && (
                    <Card variant="glass" className="flex-1 flex flex-col">
                        <CardHeader className="py-2 px-4 flex-row items-center justify-between border-b border-border">
                            <div className="flex items-center gap-3">
                                <FolderOpen className="w-5 h-5" /><span className="font-semibold">Files</span>
                                <span className="text-xs text-muted-foreground font-mono">{currentPath}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setShowNewFolder(true)}><Plus className="w-4 h-4 mr-1" /> New Folder</Button>
                                <Button variant="ghost" size="sm" onClick={() => fetchFiles(currentPath)}><RefreshCw className="w-4 h-4" /></Button>
                            </div>
                        </CardHeader>
                        {editingFile ? (
                            <div className="flex-1 flex flex-col">
                                <div className="p-2 border-b border-border flex items-center justify-between bg-card/50">
                                    <span className="text-sm font-mono">{editingFile}</span>
                                    <div className="flex gap-2">
                                        <Button variant="ghost" size="sm" onClick={() => { setEditingFile(null); setFileContent(''); }}><X className="w-4 h-4 mr-1" /> Cancel</Button>
                                        <Button variant="gradient" size="sm" onClick={saveFile}><Save className="w-4 h-4 mr-1" /> Save</Button>
                                    </div>
                                </div>
                                <textarea value={fileContent} onChange={(e) => setFileContent(e.target.value)}
                                    className="flex-1 w-full p-4 bg-[#0a0a0a] text-gray-300 font-mono text-sm resize-none focus:outline-none" spellCheck={false} />
                            </div>
                        ) : (
                            <div className="flex-1 overflow-auto p-2">
                                {showNewFolder && (
                                    <div className="flex items-center gap-2 p-2 mb-2 bg-card rounded-lg">
                                        <Input value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Folder name" className="flex-1" onKeyDown={(e) => e.key === 'Enter' && createFolder()} autoFocus />
                                        <Button variant="gradient" size="sm" onClick={createFolder}>Create</Button>
                                        <Button variant="ghost" size="sm" onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}><X className="w-4 h-4" /></Button>
                                    </div>
                                )}
                                {currentPath !== '/' && (
                                    <button onClick={() => fetchFiles(currentPath.split('/').slice(0, -1).join('/') || '/')}
                                        className="w-full flex items-center gap-3 p-2 rounded hover:bg-card transition-colors">
                                        <ArrowLeft className="w-4 h-4 text-muted-foreground" /><span className="text-sm">..</span>
                                    </button>
                                )}
                                {filesLoading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin" /></div> : files.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">Empty directory</div>
                                ) : files.sort((a, b) => (a.isFile === b.isFile ? a.name.localeCompare(b.name) : a.isFile ? 1 : -1)).map((file) => (
                                    <div key={file.name} className="flex items-center gap-3 p-2 rounded hover:bg-card transition-colors group">
                                        <button onClick={() => file.isFile ? openFile(file.name) : fetchFiles(currentPath === '/' ? `/${file.name}` : `${currentPath}/${file.name}`)}
                                            className="flex-1 flex items-center gap-3 text-left">
                                            {file.isFile ? <File className="w-4 h-4 text-blue-400" /> : <Folder className="w-4 h-4 text-yellow-400" />}
                                            <span className="text-sm truncate">{file.name}</span>
                                            {file.isFile && <span className="text-xs text-muted-foreground ml-auto">{formatBytes(file.size)}</span>}
                                        </button>
                                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100" onClick={() => deleteFile(file.name)}><Trash2 className="w-3 h-3 text-error" /></Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                )}

                {/* Databases Tab */}
                {activeTab === 'databases' && selectedServer && (
                    <Card variant="glass" className="flex-1 flex flex-col">
                        <CardHeader className="py-2 px-4 flex-row items-center justify-between border-b border-border">
                            <div className="flex items-center gap-3"><Database className="w-5 h-5" /><span className="font-semibold">Databases</span></div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={() => setShowNewDb(true)}><Plus className="w-4 h-4 mr-1" /> New Database</Button>
                                <Button variant="ghost" size="sm" onClick={fetchDatabases}><RefreshCw className="w-4 h-4" /></Button>
                            </div>
                        </CardHeader>
                        <div className="flex-1 overflow-auto p-4">
                            {showNewDb && (
                                <div className="flex items-center gap-2 p-3 mb-4 bg-card rounded-lg">
                                    <Input value={newDbName} onChange={(e) => setNewDbName(e.target.value)} placeholder="Database name (e.g. s1_mydb)" className="flex-1" onKeyDown={(e) => e.key === 'Enter' && createDatabase()} autoFocus />
                                    <Button variant="gradient" size="sm" onClick={createDatabase}>Create</Button>
                                    <Button variant="ghost" size="sm" onClick={() => { setShowNewDb(false); setNewDbName(''); }}><X className="w-4 h-4" /></Button>
                                </div>
                            )}
                            {databasesLoading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin" /></div> : databases.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground"><Database className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>No databases</p></div>
                            ) : (
                                <div className="space-y-3">
                                    {databases.map((db) => (
                                        <div key={db.id} className="p-4 bg-card rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="font-semibold text-neon-cyan">{db.name}</span>
                                                <Button variant="ghost" size="sm" className="text-error" onClick={() => deleteDatabase(db.id)}><Trash2 className="w-4 h-4" /></Button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div><span className="text-muted-foreground">Username:</span> <span className="font-mono">{db.username}</span></div>
                                                <div><span className="text-muted-foreground">Host:</span> <span className="font-mono">{db.host}:{db.port}</span></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Card>
                )}

                {/* Backups Tab */}
                {activeTab === 'backups' && selectedServer && (
                    <Card variant="glass" className="flex-1 flex flex-col">
                        <CardHeader className="py-2 px-4 flex-row items-center justify-between border-b border-border">
                            <div className="flex items-center gap-3"><Archive className="w-5 h-5" /><span className="font-semibold">Backups</span></div>
                            <div className="flex items-center gap-2">
                                {backupTab === 'user' && <Button variant="ghost" size="sm" onClick={() => setShowNewBackup(true)}><Plus className="w-4 h-4 mr-1" /> Create Backup</Button>}
                                <Button variant="ghost" size="sm" onClick={fetchBackups}><RefreshCw className="w-4 h-4" /></Button>
                            </div>
                        </CardHeader>

                        {/* Backup Type Tabs */}
                        <div className="flex border-b border-border">
                            <button onClick={() => setBackupTab('user')}
                                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${backupTab === 'user' ? 'bg-neon-cyan/20 text-neon-cyan border-b-2 border-neon-cyan' : 'text-muted-foreground hover:text-foreground hover:bg-card'}`}>
                                <Archive className="w-4 h-4" /> User Backups
                                <Badge variant="outline" className="ml-1">{userBackups.length}</Badge>
                            </button>
                            <button onClick={() => setBackupTab('system')}
                                className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${backupTab === 'system' ? 'bg-neon-purple/20 text-neon-purple border-b-2 border-neon-purple' : 'text-muted-foreground hover:text-foreground hover:bg-card'}`}>
                                <Settings2 className="w-4 h-4" /> System Backups
                                <Badge variant="outline" className="ml-1">{systemBackups.length}</Badge>
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-4">
                            {/* User Backups Tab */}
                            {backupTab === 'user' && (
                                <>
                                    {showNewBackup && (
                                        <div className="flex items-center gap-2 p-3 mb-4 bg-card rounded-lg">
                                            <Input value={newBackupName} onChange={(e) => setNewBackupName(e.target.value)} placeholder="Backup name (optional)" className="flex-1" />
                                            <Button variant="gradient" size="sm" onClick={createBackup}>Create</Button>
                                            <Button variant="ghost" size="sm" onClick={() => { setShowNewBackup(false); setNewBackupName(''); }}><X className="w-4 h-4" /></Button>
                                        </div>
                                    )}
                                    {backupsLoading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin" /></div> : userBackups.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground"><Archive className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>No user backups</p><p className="text-xs mt-1">Create a backup to save your server data</p></div>
                                    ) : (
                                        <div className="space-y-3">
                                            {userBackups.map((backup) => (
                                                <div key={backup.uuid} className="p-4 bg-card rounded-lg">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold">{backup.name || 'Unnamed Backup'}</span>
                                                            {backup.isLocked && <Lock className="w-4 h-4 text-yellow-500" />}
                                                            <Badge variant={backup.isSuccessful ? 'success' : 'warning'}>{backup.isSuccessful ? 'Complete' : 'In Progress'}</Badge>
                                                        </div>
                                                        <Button variant="ghost" size="sm" className="text-error" onClick={() => deleteBackup(backup.uuid)} disabled={backup.isLocked}><Trash2 className="w-4 h-4" /></Button>
                                                    </div>
                                                    <div className="flex gap-4 text-sm text-muted-foreground">
                                                        <span>{formatBytes(backup.bytes)}</span>
                                                        <span>{formatDate(backup.createdAt)}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* System Backups Tab */}
                            {backupTab === 'system' && (
                                <>
                                    {backupsLoading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin" /></div> : systemBackups.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground"><Settings2 className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>No system backups</p><p className="text-xs mt-1">System backups are created automatically</p></div>
                                    ) : (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {/* Hourly Backups */}
                                            <div>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Clock className="w-4 h-4 text-blue-400" />
                                                    <h3 className="font-semibold">Hourly Backups</h3>
                                                    <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30">{hourlyBackups.length}</Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground mb-3">Backups created every hour (last 24 hours)</p>
                                                <div className="space-y-2 max-h-[400px] overflow-auto">
                                                    {hourlyBackups.length === 0 ? <p className="text-sm text-muted-foreground py-4">No hourly backups</p> : hourlyBackups.map((backup) => (
                                                        <div key={backup.uuid} className="p-3 bg-card/50 rounded-lg flex items-center justify-between">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <Archive className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                                                <div className="min-w-0">
                                                                    <p className="text-sm truncate">{formatBytes(backup.bytes)} • {getTimeAgo(backup.createdAt)}</p>
                                                                    <p className="text-xs text-muted-foreground font-mono truncate">{backup.name || backup.uuid.slice(0, 32)}</p>
                                                                </div>
                                                            </div>
                                                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Weekly & Daily Backups */}
                                            <div className="space-y-6">
                                                {/* Weekly Backups */}
                                                <div>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Calendar className="w-4 h-4 text-green-400" />
                                                        <h3 className="font-semibold">Weekly Backups</h3>
                                                        <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">{weeklyBackups.length}</Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mb-3">Weekly backups for longer-term retention</p>
                                                    <div className="space-y-2">
                                                        {weeklyBackups.length === 0 ? <p className="text-sm text-muted-foreground py-2">No weekly backups</p> : weeklyBackups.map((backup) => (
                                                            <div key={backup.uuid} className="p-3 bg-card/50 rounded-lg flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <Archive className="w-4 h-4 text-green-400" />
                                                                    <span className="text-sm">{formatBytes(backup.bytes)} • {getTimeAgo(backup.createdAt)}</span>
                                                                </div>
                                                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Daily Backups */}
                                                <div>
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <Archive className="w-4 h-4 text-yellow-400" />
                                                        <h3 className="font-semibold">Daily Backups</h3>
                                                        <Badge variant="outline" className="bg-yellow-500/10 text-yellow-400 border-yellow-500/30">{dailyBackups.length}</Badge>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mb-3">Daily backups retained for reference</p>
                                                    <div className="space-y-2">
                                                        {dailyBackups.length === 0 ? <p className="text-sm text-muted-foreground py-2">No daily backups</p> : dailyBackups.map((backup) => (
                                                            <div key={backup.uuid} className="p-3 bg-card/50 rounded-lg flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <Archive className="w-4 h-4 text-yellow-400" />
                                                                    <span className="text-sm">{formatBytes(backup.bytes)} • {getTimeAgo(backup.createdAt)}</span>
                                                                </div>
                                                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </Card>
                )}

                {/* Startup Tab */}
                {activeTab === 'startup' && selectedServer && (
                    <Card variant="glass" className="flex-1 flex flex-col">
                        <CardHeader className="py-2 px-4 flex-row items-center justify-between border-b border-border">
                            <div className="flex items-center gap-3"><Settings2 className="w-5 h-5" /><span className="font-semibold">Startup Configuration</span></div>
                            <Button variant="ghost" size="sm" onClick={fetchStartup}><RefreshCw className="w-4 h-4" /></Button>
                        </CardHeader>
                        <div className="flex-1 overflow-auto p-4">
                            {startupLoading ? <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin" /></div> : startupVariables.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground"><Settings2 className="w-12 h-12 mx-auto mb-4 opacity-50" /><p>No startup variables</p></div>
                            ) : (
                                <div className="space-y-4">
                                    {startupVariables.map((variable) => (
                                        <div key={variable.envVariable} className="p-4 bg-card rounded-lg">
                                            <div className="flex items-center justify-between mb-2">
                                                <div>
                                                    <span className="font-semibold">{variable.name}</span>
                                                    <span className="ml-2 text-xs font-mono text-muted-foreground">{variable.envVariable}</span>
                                                </div>
                                                {variable.isEditable && editingVariable !== variable.envVariable && (
                                                    <Button variant="ghost" size="sm" onClick={() => { setEditingVariable(variable.envVariable); setVariableValue(variable.serverValue); }}>
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                )}
                                            </div>
                                            {variable.description && <p className="text-sm text-muted-foreground mb-2">{variable.description}</p>}
                                            {editingVariable === variable.envVariable ? (
                                                <div className="flex gap-2">
                                                    <Input value={variableValue} onChange={(e) => setVariableValue(e.target.value)} className="flex-1 font-mono" onKeyDown={(e) => e.key === 'Enter' && updateVariable(variable.envVariable)} />
                                                    <Button variant="gradient" size="sm" onClick={() => updateVariable(variable.envVariable)}><Save className="w-4 h-4" /></Button>
                                                    <Button variant="ghost" size="sm" onClick={() => setEditingVariable(null)}><X className="w-4 h-4" /></Button>
                                                </div>
                                            ) : (
                                                <div className="p-2 bg-background/50 rounded font-mono text-sm">{variable.serverValue || <span className="text-muted-foreground">Not set</span>}</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Card>
                )}
            </div>
        </div>
    );
}
