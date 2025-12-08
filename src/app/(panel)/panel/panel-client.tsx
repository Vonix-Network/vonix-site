'use client';

import { useState, useEffect, useCallback, useRef, useMemo, useId, memo } from 'react';
import {
    Server, RefreshCw, Play, Square, RotateCcw, Skull,
    Cpu, HardDrive, Activity, Wifi, WifiOff, Terminal, Send,
    FolderOpen, Database, Archive, Settings2, ChevronRight, Clock,
    Globe, ArrowDown, ArrowUp, Maximize2, Minimize2, ChevronDown,
    File, Folder, ArrowLeft, Plus, Trash2, Edit, Save, X, Download,
    Copy, Lock, Unlock, Calendar, Users, Menu
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

// Pre-compiled regex patterns for console log coloring (performance optimization)
const CONSOLE_REGEXES = {
    ansiCodes: /\x1b\[[0-9;]*m/g,
    timestamp: /\[(\d{2}:\d{2}:\d{2})\]/g,
    thread: /\[(Server thread|Async[^\]]+|User Authenticator|Netty[^\]]+|Worker[^\]]+)[^\]]*\]/gi,
    info: /\[INFO\]/gi,
    warn: /\[WARN(?:ING)?\]/gi,
    error: /\[ERROR\]/gi,
    debug: /\[DEBUG\]/gi,
    plugin: /\[([A-Z][a-zA-Z0-9_-]+)\]:/g,
    success: /\b(Done|Success(?:fully)?|Loaded|Enabled|Started|Complete(?:d)?|joined|authenticated)\b/gi,
    warning: /\b(Warning|Deprecated|Slow|Lag(?:ging)?|overloaded?|Can't keep up)\b/gi,
    errorKeyword: /\b(Error|Failed|Exception|Crash(?:ed)?|Lost connection|Disconnected|kicked|banned)\b/gi,
    player: /\b([A-Z][a-z]+(?:[A-Z][a-z]+)*)\s+(joined|left|authenticated|logged in)/gi,
    uuid: /\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/gi,
    ip: /\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/g,
    units: /\b(\d+(?:\.\d+)?)\s*(MiB|GiB|KiB|MB|GB|KB|ms|ticks?)\b/gi,
    path: /([a-zA-Z]:[\\\/][^\s]+|\/[^\s]+\.[a-zA-Z0-9]+)/g,
};

// Format console line with syntax highlighting (called once per line, memoized via React.memo)
function formatConsoleLine(line: string): string {
    let coloredLine = line
        .replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(CONSOLE_REGEXES.ansiCodes, '');

    coloredLine = coloredLine
        .replace(CONSOLE_REGEXES.timestamp, '<span style="color: #64748b">[$1]</span>')
        .replace(CONSOLE_REGEXES.thread, '<span style="color: #475569">$&</span>')
        .replace(CONSOLE_REGEXES.info, '<span style="color: #06b6d4; font-weight: 500">[INFO]</span>')
        .replace(CONSOLE_REGEXES.warn, '<span style="color: #eab308; font-weight: 500">[WARN]</span>')
        .replace(CONSOLE_REGEXES.error, '<span style="color: #ef4444; font-weight: 500">[ERROR]</span>')
        .replace(CONSOLE_REGEXES.debug, '<span style="color: #6b7280; font-weight: 500">[DEBUG]</span>')
        .replace(CONSOLE_REGEXES.plugin, '<span style="color: #a855f7">[$1]</span>:')
        .replace(CONSOLE_REGEXES.success, '<span style="color: #22c55e">$1</span>')
        .replace(CONSOLE_REGEXES.warning, '<span style="color: #f59e0b">$1</span>')
        .replace(CONSOLE_REGEXES.errorKeyword, '<span style="color: #f87171">$1</span>')
        .replace(CONSOLE_REGEXES.player, '<span style="color: #8b5cf6">$1</span> $2')
        .replace(CONSOLE_REGEXES.uuid, '<span style="color: #475569">$1</span>')
        .replace(CONSOLE_REGEXES.ip, '<span style="color: #64748b">$1</span>')
        .replace(CONSOLE_REGEXES.units, '<span style="color: #60a5fa">$1</span> <span style="color: #7dd3fc">$2</span>')
        .replace(CONSOLE_REGEXES.path, '<span style="color: #94a3b8">$1</span>');

    return coloredLine;
}

// Memoized console line component - only re-renders when line content changes
const ConsoleLine = memo(({ line }: { line: string }) => (
    <div
        className="text-gray-300 whitespace-pre-wrap break-all leading-5 hover:bg-white/5 px-1"
        dangerouslySetInnerHTML={{ __html: formatConsoleLine(line) }}
    />
));
ConsoleLine.displayName = 'ConsoleLine';

function SparklineChart({ data, color, height = 140, formatValue, maxLimit }: { data: number[]; color: string; height?: number; formatValue?: (v: number) => string; maxLimit?: number }) {
    const formatter = formatValue || ((v: number) => v.toFixed(0));
    // Use stable ID instead of random - prevents unnecessary SVG re-renders
    const gradientId = useId();

    if (data.length < 2) {
        return (
            <div className="w-full bg-[#0d1117] rounded-b-lg p-4" style={{ height }}>
                <div className="relative h-full flex">
                    {/* Y-axis labels */}
                    <div className="flex flex-col justify-between text-[10px] text-gray-500 pr-2 font-mono" style={{ minWidth: '55px' }}>
                        <div>{maxLimit ? formatter(maxLimit) : '0'}</div>
                        <div>{maxLimit ? formatter(maxLimit / 2) : '0'}</div>
                        <div>0</div>
                    </div>
                    {/* Empty graph */}
                    <div className="flex-1 relative">
                        <svg viewBox="0 0 100 100" className="w-full h-full">
                            <line x1="0" y1="100" x2="100" y2="100" stroke={color} strokeWidth="1" strokeOpacity="0.3" />
                        </svg>
                    </div>
                </div>
            </div>
        );
    }

    const min = 0; // Always start at 0
    const max = maxLimit ?? Math.max(...data); // Use limit if provided, else auto-scale
    const mid = max / 2;
    const range = max - min || 1;

    const paddingTop = 5;
    const paddingBottom = 5;
    const chartHeight = 100 - paddingTop - paddingBottom;
    const width = 100;

    const points = data.map((value, i) => {
        const x = (i / (data.length - 1)) * width;
        const normalized = (value - min) / range;
        const y = paddingTop + chartHeight - (normalized * chartHeight);
        return `${x},${y}`;
    }).join(' ');

    // Grid lines at min (100), mid (50), max (0) Y positions
    const gridLines = [
        { y: paddingTop, value: max },
        { y: paddingTop + chartHeight / 2, value: mid },
        { y: paddingTop + chartHeight, value: min }
    ];

    return (
        <div className="w-full bg-[#0d1117] rounded-b-lg p-4" style={{ height }}>
            <div className="relative h-full flex">
                {/* Y-axis labels */}
                <div className="flex flex-col justify-between text-[10px] text-gray-500 pr-2 font-mono" style={{ minWidth: '55px' }}>
                    <div className="leading-none">{formatter(max)}</div>
                    <div className="leading-none">{formatter(mid)}</div>
                    <div className="leading-none">{formatter(min)}</div>
                </div>

                {/* Graph area */}
                <div className="flex-1 relative">
                    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                                <stop offset="100%" stopColor={color} stopOpacity="0.05" />
                            </linearGradient>
                        </defs>

                        {/* Grid lines */}
                        {gridLines.map((grid, i) => (
                            <line
                                key={i}
                                x1="0"
                                y1={grid.y}
                                x2={width}
                                y2={grid.y}
                                stroke="#1e2936"
                                strokeWidth="0.5"
                            />
                        ))}

                        {/* Filled area */}
                        <polygon
                            points={`0,${100 - paddingBottom} ${points} ${width},${100 - paddingBottom}`}
                            fill={`url(#${gradientId})`}
                        />

                        {/* Line */}
                        <polyline
                            points={points}
                            fill="none"
                            stroke={color}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>
                </div>
            </div>
        </div>
    );
}

// Dual-line chart for network (download/upload) matching reference design
function DualSparklineChart({
    data1,
    data2,
    color1,
    color2,
    height = 140,
    formatValue
}: {
    data1: number[];
    data2: number[];
    color1: string;
    color2: string;
    height?: number;
    formatValue?: (v: number) => string
}) {
    const formatter = formatValue || ((v: number) => v.toFixed(0));
    const gradientId1 = useId();
    const gradientId2 = useId();

    if (data1.length < 2 || data2.length < 2) {
        return (
            <div className="w-full bg-[#0d1117] rounded-b-lg p-4" style={{ height }}>
                <div className="relative h-full flex">
                    <div className="flex flex-col justify-between text-[10px] text-gray-500 pr-2 font-mono" style={{ minWidth: '55px' }}>
                        <div>0</div>
                        <div>0</div>
                        <div>0</div>
                    </div>
                    <div className="flex-1 relative">
                        <svg viewBox="0 0 100 100" className="w-full h-full">
                            <line x1="0" y1="100" x2="100" y2="100" stroke="#3b82f6" strokeWidth="1" strokeOpacity="0.3" />
                        </svg>
                    </div>
                </div>
            </div>
        );
    }

    // Always start at 0
    const allData = [...data1, ...data2];
    const min = 0;
    const max = Math.max(...allData);
    const mid = max / 2;
    const range = max - min || 1;

    const paddingTop = 5;
    const paddingBottom = 5;
    const chartHeight = 100 - paddingTop - paddingBottom;
    const width = 100;

    const getPoints = (data: number[]) => data.map((value, i) => {
        const x = (i / (data.length - 1)) * width;
        const normalized = (value - min) / range;
        const y = paddingTop + chartHeight - (normalized * chartHeight);
        return `${x},${y}`;
    }).join(' ');

    const points1 = getPoints(data1);
    const points2 = getPoints(data2);

    const gridLines = [
        { y: paddingTop, value: max },
        { y: paddingTop + chartHeight / 2, value: mid },
        { y: paddingTop + chartHeight, value: min }
    ];

    return (
        <div className="w-full bg-[#0d1117] rounded-b-lg p-4" style={{ height }}>
            <div className="relative h-full flex">
                {/* Y-axis labels */}
                <div className="flex flex-col justify-between text-[10px] text-gray-500 pr-2 font-mono" style={{ minWidth: '55px' }}>
                    <div className="leading-none">{formatter(max)}</div>
                    <div className="leading-none">{formatter(mid)}</div>
                    <div className="leading-none">{formatter(min)}</div>
                </div>

                {/* Graph area */}
                <div className="flex-1 relative">
                    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                        <defs>
                            <linearGradient id={gradientId1} x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor={color1} stopOpacity="0.3" />
                                <stop offset="100%" stopColor={color1} stopOpacity="0.02" />
                            </linearGradient>
                            <linearGradient id={gradientId2} x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor={color2} stopOpacity="0.3" />
                                <stop offset="100%" stopColor={color2} stopOpacity="0.02" />
                            </linearGradient>
                        </defs>

                        {/* Grid lines */}
                        {gridLines.map((grid, i) => (
                            <line
                                key={i}
                                x1="0"
                                y1={grid.y}
                                x2={width}
                                y2={grid.y}
                                stroke="#1e2936"
                                strokeWidth="0.5"
                            />
                        ))}

                        {/* Filled areas */}
                        <polygon
                            points={`0,${100 - paddingBottom} ${points2} ${width},${100 - paddingBottom}`}
                            fill={`url(#${gradientId2})`}
                        />
                        <polygon
                            points={`0,${100 - paddingBottom} ${points1} ${width},${100 - paddingBottom}`}
                            fill={`url(#${gradientId1})`}
                        />

                        {/* Lines - data2 (upload/yellow) first so data1 (download/cyan) is on top */}
                        <polyline
                            points={points2}
                            fill="none"
                            stroke={color2}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                        />
                        <polyline
                            points={points1}
                            fill="none"
                            stroke={color1}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                        />
                    </svg>
                </div>
            </div>
        </div>
    );
}

const navItems: { id: TabType; label: string; icon: any; description: string }[] = [
    { id: 'console', label: 'Console', icon: Terminal, description: 'Server console & commands' },
    { id: 'files', label: 'Files', icon: FolderOpen, description: 'File manager' },
    { id: 'databases', label: 'Databases', icon: Database, description: 'MySQL databases' },
    { id: 'backups', label: 'Backups', icon: Archive, description: 'Backup management' },
    { id: 'startup', label: 'Startup', icon: Settings2, description: 'Startup configuration' },
];

export function PanelClient() {
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
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    // Player list state
    const [playerData, setPlayerData] = useState<{ online: boolean; players: { online: number; max: number; list: string[] } } | null>(null);
    const [playerLoading, setPlayerLoading] = useState(false);
    const [playerError, setPlayerError] = useState(false);

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

    // Memoized backup categorization - only recalculates when backups array changes
    const { userBackups, systemBackups, hourlyBackups, weeklyBackups, dailyBackups } = useMemo(() => {
        const now = Date.now();
        // User backups have human-readable names, system backups have hash-like or empty names
        const user = backups.filter(b => b.name && !/^[a-f0-9]{32,}$/i.test(b.name));
        const system = backups.filter(b => !b.name || /^[a-f0-9]{32,}$/i.test(b.name));

        return {
            userBackups: user,
            systemBackups: system,
            hourlyBackups: system.filter(b => {
                const age = now - new Date(b.createdAt).getTime();
                return age < 24 * 60 * 60 * 1000; // Last 24 hours
            }),
            weeklyBackups: system.filter(b => {
                const age = now - new Date(b.createdAt).getTime();
                return age >= 24 * 60 * 60 * 1000 && age < 7 * 24 * 60 * 60 * 1000; // 1-7 days
            }),
            dailyBackups: system.filter(b => {
                const age = now - new Date(b.createdAt).getTime();
                return age >= 7 * 24 * 60 * 60 * 1000; // Older than 7 days
            }),
        };
    }, [backups]);

    // Startup state
    const [startupVariables, setStartupVariables] = useState<StartupVariable[]>([]);
    const [startupLoading, setStartupLoading] = useState(false);
    const [editingVariable, setEditingVariable] = useState<string | null>(null);
    const [variableValue, setVariableValue] = useState('');

    const wsRef = useRef<any>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const [wsConnected, setWsConnected] = useState(false);
    const [wsConnecting, setWsConnecting] = useState(false);
    const [wsReconnecting, setWsReconnecting] = useState(false);
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
                    // Restore from localStorage or default to first server
                    const savedId = localStorage.getItem('panel_selected_server');
                    const savedServer = savedId
                        ? data.servers.find((s: PterodactylServer) => s.identifier === savedId)
                        : null;
                    setSelectedServer(savedServer || data.servers[0]);
                }
            }
        } catch (err) {
            console.error('Failed to fetch servers:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Persist selected server to localStorage
    useEffect(() => {
        if (selectedServer) {
            localStorage.setItem('panel_selected_server', selectedServer.identifier);
        }
    }, [selectedServer?.identifier]);

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

    // Fetch player list
    const fetchPlayers = useCallback(async () => {
        if (!selectedServer) return;
        setPlayerLoading(true);
        try {
            const res = await fetch(`/api/admin/pterodactyl/server/${selectedServer.identifier}/players`);
            if (res.ok) {
                const data = await res.json();
                setPlayerData(data);
                setPlayerError(false);
            } else {
                setPlayerError(true);
            }
        } catch (err) {
            setPlayerError(true);
        } finally {
            setPlayerLoading(false);
        }
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

        eventSource.addEventListener('connected', () => { setWsConnected(true); setWsConnecting(false); setWsReconnecting(false); });
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
        eventSource.addEventListener('disconnected', () => {
            setWsConnected(false); setWsConnecting(false); setWsReconnecting(true);
            // Auto-reconnect after 2 seconds
            setTimeout(() => connectConsole(server), 2000);
        });
        eventSource.onerror = () => {
            setWsConnected(false); setWsConnecting(false);
            if (eventSource.readyState === EventSource.CLOSED) {
                setWsError('Console connection closed.');
                setWsReconnecting(true);
                // Auto-reconnect after 2 seconds
                setTimeout(() => connectConsole(server), 2000);
            }
        };
        eventSource.addEventListener('token_expired', () => {
            eventSource.close();
            setWsReconnecting(true);
            setTimeout(() => connectConsole(server), 1000);
        });
    }, [wsConnecting]);

    // Refs to track if polling should continue
    const pollingActiveRef = useRef(false);
    const graphPollingActiveRef = useRef(false);
    const playerPollingActiveRef = useRef(false);

    useEffect(() => {
        if (selectedServer) {
            // Abort any pending requests from previous server
            abortControllerRef.current?.abort();
            abortControllerRef.current = new AbortController();
            const signal = abortControllerRef.current.signal;

            const currentRef = wsRef.current as any;
            if (currentRef?.close) currentRef.close();
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            pollingActiveRef.current = false;
            graphPollingActiveRef.current = false;
            playerPollingActiveRef.current = false;
            setWsConnected(false); setWsConnecting(false); setWsError(null); setWsReconnecting(false);
            setConsoleLines([]); setStatsHistory([]);
            // Don't reset resources to null - keep previous values to prevent flicker
            setCurrentPath('/'); setFiles([]); setEditingFile(null);
            setPlayerData(null); setPlayerError(false); setPlayerLoading(true);

            // Initial fetches - unified poll will handle resources and graphs together
            connectConsole(selectedServer);
            fetchPlayers();

            // Unified polling - 1s for both graphs and sidebar stats (in sync)
            graphPollingActiveRef.current = true;
            const pollUnified = async () => {
                if (!graphPollingActiveRef.current || signal.aborted) return;
                try {
                    const res = await fetch(`/api/admin/pterodactyl/server/${selectedServer.identifier}`, { signal });
                    if (res.ok) {
                        const data = await res.json();
                        if (data.resources) {
                            // Always update graph history (1s)
                            setStatsHistory(prev => [...prev, {
                                timestamp: Date.now(),
                                cpu: data.resources.resources.cpuAbsolute,
                                memory: data.resources.resources.memoryBytes,
                                networkRx: data.resources.resources.networkRxBytes,
                                networkTx: data.resources.resources.networkTxBytes,
                            }].slice(-60));

                            // Always update resources to keep sidebar in sync with graphs
                            setResources(data.resources);
                        }
                    }
                } catch (err) {
                    if ((err as Error).name !== 'AbortError') {
                        // Only log non-abort errors
                    }
                }
                if (graphPollingActiveRef.current && !signal.aborted) {
                    setTimeout(pollUnified, 1000);
                }
            };
            pollUnified(); // Start immediately for faster initial load

            // Player polling - 10s interval (players change infrequently)
            playerPollingActiveRef.current = true;
            const pollPlayers = async () => {
                if (!playerPollingActiveRef.current || signal.aborted) return;
                await fetchPlayers();
                if (playerPollingActiveRef.current && !signal.aborted) {
                    setTimeout(pollPlayers, 10000);
                }
            };
            setTimeout(pollPlayers, 10000);

            return () => {
                abortControllerRef.current?.abort();
                pollingActiveRef.current = false;
                graphPollingActiveRef.current = false;
                playerPollingActiveRef.current = false;
                const ref = wsRef.current as any;
                if (ref?.close) ref.close();
                if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            };
        }
    }, [selectedServer]);

    // Note: SSE provides real-time stats updates when connected
    // HTTP polling at 3s provides consistent fallback regardless of SSE state

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
        <div className="flex h-screen relative">
            {/* Mobile Sidebar Backdrop */}
            {mobileSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setMobileSidebarOpen(false)}
                />
            )}

            {/* Stats Sidebar - Hidden on mobile, slide-in overlay when open */}
            <div className={`
                fixed md:relative z-50 md:z-auto
                w-72 flex-shrink-0 flex flex-col bg-card/95 md:bg-card/30 border-r border-border p-4 overflow-hidden
                h-full transition-transform duration-300 ease-in-out
                ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                {/* Server Selector */}
                <div className="relative mb-4" ref={dropdownRef}>
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

                {/* Server Stats Cards - Centered vertically */}
                {selectedServer && (
                    <div className="flex-1 flex flex-col justify-center overflow-auto pr-1">
                        <div className="space-y-2">
                            {/* Address Card */}
                            <Card variant="glass" className="p-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-neon-cyan/20 flex items-center justify-center">
                                        <Globe className="w-5 h-5 text-neon-cyan" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Address</p>
                                        <p className="text-sm font-medium text-neon-cyan font-mono truncate">
                                            {selectedServer.allocation ? `${selectedServer.allocation.ip}:${selectedServer.allocation.port}` : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                            </Card>

                            {/* Uptime Card */}
                            <Card variant="glass" className="p-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                        <Clock className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Uptime</p>
                                        <p className="text-sm font-medium text-blue-400">
                                            {resources ? formatUptime(resources.resources.uptime / 1000) : <span className="animate-pulse">--:--:--</span>}
                                        </p>
                                    </div>
                                </div>
                            </Card>

                            {/* CPU Card */}
                            <Card variant="glass" className="p-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                                        <Cpu className="w-5 h-5 text-yellow-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide">CPU Load</p>
                                        <p className="text-sm font-medium text-yellow-500">
                                            {resources ? `${resources.resources.cpuAbsolute.toFixed(2)}%` : <span className="animate-pulse">--.--</span>}
                                        </p>
                                    </div>
                                </div>
                            </Card>

                            {/* Memory Card */}
                            <Card variant="glass" className="p-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                                        <Activity className="w-5 h-5 text-green-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Memory</p>
                                        <p className="text-sm font-medium">
                                            {resources ? (
                                                <>
                                                    <span className="text-green-500">{formatBytes(resources.resources.memoryBytes)}</span>
                                                    {selectedServer.limits?.memory && (
                                                        <span className="text-muted-foreground"> / {selectedServer.limits.memory} MiB</span>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-green-500 animate-pulse">-- MiB</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </Card>

                            {/* Disk Card */}
                            <Card variant="glass" className="p-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                                        <HardDrive className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Disk</p>
                                        <p className="text-sm font-medium">
                                            {resources ? (
                                                <>
                                                    <span className="text-blue-400">{formatBytes(resources.resources.diskBytes)}</span>
                                                    {selectedServer.limits?.disk && (
                                                        <span className="text-muted-foreground"> / {(selectedServer.limits.disk / 1024).toFixed(0)} GiB</span>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-blue-400 animate-pulse">-- GiB</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </Card>

                            {/* Network Card */}
                            <Card variant="glass" className="p-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                                        <ArrowDown className="w-3 h-3 text-purple-400" />
                                        <ArrowUp className="w-3 h-3 text-purple-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Network</p>
                                        <p className="text-sm font-medium">
                                            {resources ? (
                                                <>
                                                    <span className="text-purple-400">↓ {formatBytes(resources.resources.networkRxBytes)}</span>
                                                    <span className="text-muted-foreground"> / </span>
                                                    <span className="text-purple-400">↑ {formatBytes(resources.resources.networkTxBytes)}</span>
                                                </>
                                            ) : (
                                                <span className="text-purple-400 animate-pulse">↓ -- / ↑ --</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </Card>

                            {/* Players Card */}
                            <Card variant="glass" className="p-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-pink-500/20 flex items-center justify-center">
                                        <Users className="w-5 h-5 text-pink-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Players Online</p>
                                        {playerError ? (
                                            <p className="text-xs text-error">Unable to load</p>
                                        ) : playerLoading && !playerData ? (
                                            <p className="text-sm font-medium text-pink-400 animate-pulse">-- / --</p>
                                        ) : playerData?.players ? (
                                            <p className="text-sm font-medium text-pink-400">
                                                {playerData.players.online || 0}
                                                <span className="text-muted-foreground"> / {playerData.players.max || 0}</span>
                                            </p>
                                        ) : (
                                            <p className="text-xs text-muted-foreground">N/A</p>
                                        )}
                                    </div>
                                </div>
                                {/* Player List */}
                                {playerData?.players?.list && playerData.players.list.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-border space-y-1 max-h-24 overflow-auto">
                                        {playerData.players.list.map((player, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs">
                                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full flex-shrink-0" />
                                                <span className="truncate">{player}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        </div>
                    </div>
                )}

                {/* Bottom Section - Power Controls & Back to Admin */}
                {/* Bottom Section - Power Controls (Mobile Only) & Back to Admin */}
                {selectedServer && (
                    <div className="mt-auto pt-4 border-t border-border space-y-3">
                        {/* Power Controls - Mobile Only */}
                        <div className="bg-[#1a1e28] rounded-lg p-3 md:hidden">
                            <div className="flex items-center justify-between">
                                {/* Status Badge */}
                                {resources ? (
                                    <Badge
                                        variant={resources.currentState === 'running' ? 'success' : resources.currentState === 'starting' || resources.currentState === 'stopping' ? 'warning' : 'error'}
                                        className="px-3 py-1"
                                    >
                                        {resources.currentState === 'running' ? <Wifi className="w-3 h-3 mr-1.5" /> : <WifiOff className="w-3 h-3 mr-1.5" />}
                                        {resources.currentState}
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary" className="px-3 py-1 animate-pulse">
                                        <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
                                        Loading...
                                    </Badge>
                                )}

                                {/* Power Buttons */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => sendPowerAction('start')}
                                        disabled={!resources || actionInProgress !== null || resources.currentState === 'running'}
                                        className="w-8 h-8 flex items-center justify-center rounded-md bg-transparent hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        title="Start"
                                    >
                                        {actionInProgress === 'start' ? <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" /> : <Play className="w-4 h-4 text-muted-foreground" />}
                                    </button>
                                    <button
                                        onClick={() => sendPowerAction('restart')}
                                        disabled={!resources || actionInProgress !== null}
                                        className="w-8 h-8 flex items-center justify-center rounded-md bg-transparent hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        title="Restart"
                                    >
                                        {actionInProgress === 'restart' ? <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" /> : <RotateCcw className="w-4 h-4 text-muted-foreground" />}
                                    </button>
                                    <button
                                        onClick={() => sendPowerAction('stop')}
                                        disabled={!resources || actionInProgress !== null || resources?.currentState === 'offline'}
                                        className="w-8 h-8 flex items-center justify-center rounded-md bg-transparent hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        title="Stop"
                                    >
                                        {actionInProgress === 'stop' ? <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                                    </button>
                                    <button
                                        onClick={() => sendPowerAction('kill')}
                                        disabled={!resources || actionInProgress !== null || resources?.currentState === 'offline'}
                                        className="w-8 h-8 flex items-center justify-center rounded-md bg-transparent hover:bg-red-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                        title="Kill"
                                    >
                                        <Skull className="w-4 h-4 text-red-500" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Back to Admin */}
                        <Button variant="ghost" className="w-full justify-start" onClick={() => window.location.href = '/admin'}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Admin
                        </Button>
                    </div>
                )}

                {/* Back to Admin - shown when no server selected */}
                {!selectedServer && (
                    <div className="mt-auto pt-4 border-t border-border">
                        <Button variant="ghost" className="w-full justify-start" onClick={() => window.location.href = '/admin'}>
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Admin
                        </Button>
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden md:ml-0">
                {/* Top Navigation Bar */}
                <div className="flex items-center gap-1 px-4 py-2 bg-card/30 border-b border-border">
                    {/* Mobile Hamburger */}
                    <button
                        className="md:hidden p-2 rounded-lg hover:bg-secondary transition-colors mr-2"
                        onClick={() => setMobileSidebarOpen(true)}
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    {/* Nav Items - horizontal scroll on mobile */}
                    <div className="flex items-center gap-1 overflow-x-auto flex-1">
                        {navItems.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${activeTab === item.id
                                    ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-card'
                                    }`}
                            >
                                <item.icon className="w-4 h-4" />
                                <span className="hidden sm:inline">{item.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Power Controls - Moved to Header */}
                    {selectedServer && (
                        <div className="hidden md:flex items-center gap-3 ml-2 pl-4 border-l border-border/50">
                            {/* Status Badge */}
                            {resources ? (
                                <Badge
                                    variant={resources.currentState === 'running' ? 'success' : resources.currentState === 'starting' || resources.currentState === 'stopping' ? 'warning' : 'error'}
                                    className="px-2 py-1 h-8 flex items-center gap-1.5"
                                >
                                    {resources.currentState === 'running' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                                    <span className="uppercase text-[10px] font-bold tracking-wider">{resources.currentState}</span>
                                </Badge>
                            ) : (
                                <Badge variant="secondary" className="px-2 py-1 h-8 animate-pulse flex items-center gap-1.5">
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                    <span className="text-[10px]">LOADING</span>
                                </Badge>
                            )}

                            {/* Power Buttons */}
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => sendPowerAction('start')}
                                    disabled={!resources || actionInProgress !== null || resources.currentState === 'running'}
                                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title="Start"
                                >
                                    {actionInProgress === 'start' ? <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" /> : <Play className="w-4 h-4 text-green-500" />}
                                </button>
                                <button
                                    onClick={() => sendPowerAction('restart')}
                                    disabled={!resources || actionInProgress !== null}
                                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title="Restart"
                                >
                                    {actionInProgress === 'restart' ? <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" /> : <RotateCcw className="w-4 h-4 text-blue-500" />}
                                </button>
                                <button
                                    onClick={() => sendPowerAction('stop')}
                                    disabled={!resources || actionInProgress !== null || resources?.currentState === 'offline'}
                                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title="Stop"
                                >
                                    {actionInProgress === 'stop' ? <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" /> : <Square className="w-4 h-4 text-yellow-500" />}
                                </button>
                                <button
                                    onClick={() => sendPowerAction('kill')}
                                    disabled={!resources || actionInProgress !== null || resources?.currentState === 'offline'}
                                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                    title="Kill"
                                >
                                    <Skull className="w-4 h-4 text-red-500" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 p-4 overflow-auto">
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

                                {/* Console Output - with sticky scroll button */}
                                <div className="flex-1 relative min-h-[525px]">
                                    <div ref={consoleContainerRef} onScroll={handleConsoleScroll} className="absolute inset-0 bg-[#0a0a0a] font-mono text-xs overflow-auto p-3">
                                        {consoleLines.length === 0 ? (
                                            <div className="text-muted-foreground text-center py-8 space-y-2">
                                                {wsConnected ? <p>Waiting for console output...</p> : wsError ? <><p className="text-yellow-500">⚠️ {wsError}</p><p className="text-xs">You can still send commands below.</p></> : wsConnecting ? <p>Connecting...</p> : <p>Console not connected</p>}
                                            </div>
                                        ) : consoleLines.map((line, i) => (
                                            <ConsoleLine key={i} line={line} />
                                        ))}
                                        <div ref={consoleEndRef} />
                                    </div>

                                    {/* Scroll to Bottom Button - positioned outside scroll area */}
                                    {!isAtBottom && (
                                        <button
                                            onClick={scrollToBottom}
                                            className="absolute bottom-4 right-6 z-10 p-3 bg-card hover:bg-neon-cyan/20 border border-border rounded-full shadow-xl transition-all hover:scale-110 hover:border-neon-cyan"
                                            title="Scroll to bottom"
                                        >
                                            <ArrowDown className="w-5 h-5 text-neon-cyan" />
                                            {hasNewLogs && (
                                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-neon-cyan rounded-full animate-pulse flex items-center justify-center">
                                                    <span className="text-[10px] font-bold text-background">!</span>
                                                </span>
                                            )}
                                        </button>
                                    )}
                                </div>

                                {/* Command Input */}
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
                            {selectedServer && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                    {/* CPU Graph Card */}
                                    <div className="rounded-lg overflow-hidden bg-[#0d1117] border border-[#1e2936]">
                                        <div className="px-4 py-3 bg-[#161b22] border-b border-[#1e2936] flex items-center justify-between">
                                            <span className="font-medium text-sm">CPU</span>
                                            {statsHistory.length > 0 ? (
                                                <span className="text-yellow-500 font-semibold">
                                                    {statsHistory[statsHistory.length - 1]?.cpu.toFixed(1)}%
                                                    {selectedServer.limits?.cpu ? <span className="text-muted-foreground font-normal text-xs"> / {selectedServer.limits.cpu}%</span> : null}
                                                </span>
                                            ) : (
                                                <span className="h-4 w-16 bg-muted-foreground/20 rounded animate-pulse" />
                                            )}
                                        </div>
                                        <SparklineChart data={statsHistory.map(s => s.cpu)} color="#eab308" height={120} formatValue={(v) => `${v.toFixed(1)}%`} maxLimit={selectedServer.limits?.cpu || 100} />
                                    </div>

                                    {/* Memory Graph Card */}
                                    <div className="rounded-lg overflow-hidden bg-[#0d1117] border border-[#1e2936]">
                                        <div className="px-4 py-3 bg-[#161b22] border-b border-[#1e2936] flex items-center justify-between">
                                            <span className="font-medium text-sm">Memory</span>
                                            {statsHistory.length > 0 ? (
                                                <span className="text-green-500 font-semibold">
                                                    {formatBytes(statsHistory[statsHistory.length - 1]?.memory || 0)}
                                                    {selectedServer.limits?.memory ? <span className="text-muted-foreground font-normal text-xs"> / {(selectedServer.limits.memory / 1024).toFixed(1)} GiB</span> : null}
                                                </span>
                                            ) : (
                                                <span className="h-4 w-20 bg-muted-foreground/20 rounded animate-pulse" />
                                            )}
                                        </div>
                                        <SparklineChart data={statsHistory.map(s => s.memory)} color="#22c55e" height={120} formatValue={(v) => formatBytes(v)} maxLimit={selectedServer.limits?.memory ? selectedServer.limits.memory * 1024 * 1024 : undefined} />
                                    </div>

                                    {/* Network Graph Card with dual lines */}
                                    <div className="rounded-lg overflow-hidden bg-[#0d1117] border border-[#1e2936]">
                                        <div className="px-4 py-3 bg-[#161b22] border-b border-[#1e2936] flex items-center justify-between">
                                            <span className="font-medium text-sm">Network</span>
                                            {statsHistory.length > 0 ? (
                                                <div className="flex items-center gap-3">
                                                    <span className="flex items-center gap-1 text-cyan-400 text-sm">
                                                        <ArrowDown className="w-3.5 h-3.5" />
                                                        {formatBytes(statsHistory[statsHistory.length - 1]?.networkRx || 0)}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-yellow-500 text-sm">
                                                        <ArrowUp className="w-3.5 h-3.5" />
                                                        {formatBytes(statsHistory[statsHistory.length - 1]?.networkTx || 0)}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="h-4 w-24 bg-muted-foreground/20 rounded animate-pulse" />
                                            )}
                                        </div>
                                        <DualSparklineChart
                                            data1={statsHistory.map(s => s.networkRx)}
                                            data2={statsHistory.map(s => s.networkTx)}
                                            color1="#22d3ee"
                                            color2="#eab308"
                                            height={120}
                                            formatValue={(v) => formatBytes(v)}
                                        />
                                    </div>
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
        </div>
    );
}
