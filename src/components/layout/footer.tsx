import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export function Footer() {
    return (
        <footer className="border-t border-white/10 py-12 px-4">
            <div className="container">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Brand */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8">
                                <svg viewBox="0 0 100 100" fill="none">
                                    <defs>
                                        <linearGradient id="footerLogoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#00D9FF" />
                                            <stop offset="50%" stopColor="#8B5CF6" />
                                            <stop offset="100%" stopColor="#EC4899" />
                                        </linearGradient>
                                    </defs>
                                    <path
                                        d="M20 25 L50 85 L80 25"
                                        stroke="url(#footerLogoGradient)"
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </div>
                            <span className="text-lg font-bold gradient-text">Vonix Network</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            The ultimate Minecraft community platform with custom features and endless possibilities.
                        </p>
                    </div>

                    {/* Links */}
                    <div>
                        <h4 className="font-semibold mb-4">Community</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/forum" className="hover:text-neon-cyan transition-colors">Forum</Link></li>
                            <li><Link href="/leaderboard" className="hover:text-neon-cyan transition-colors">Leaderboard</Link></li>
                            <li><Link href="/events" className="hover:text-neon-cyan transition-colors">Events</Link></li>
                            <li><Link href="/donations" className="hover:text-neon-cyan transition-colors">Donations</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">Resources</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/servers" className="hover:text-neon-cyan transition-colors">Servers</Link></li>
                            <li><a href="https://ultraservers.com/aff.php?code=kJj5hk5koEMNj5Il" target="_blank" rel="noopener noreferrer" className="hover:text-neon-cyan transition-colors">Server Hosting</a></li>
                            <li><Link href="/ranks" className="hover:text-neon-cyan transition-colors">Ranks</Link></li>
                            <li><Link href="/blog" className="hover:text-neon-cyan transition-colors">Blog</Link></li>
                            <li><Link href="/support" className="hover:text-neon-cyan transition-colors">Support</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-4">Legal</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/privacy" className="hover:text-neon-cyan transition-colors">Privacy Policy</Link></li>
                            <li><Link href="/terms" className="hover:text-neon-cyan transition-colors">Terms of Service</Link></li>
                            <li><Link href="/rules" className="hover:text-neon-cyan transition-colors">Server Rules</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-white/10 mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground">
                        © {new Date().getFullYear()} Vonix Network. All rights reserved.
                    </p>
                    <div className="flex items-center gap-4">
                        <Badge variant="success">
                            <div className="w-2 h-2 rounded-full bg-success mr-2 animate-pulse" />
                            All Systems Operational
                        </Badge>
                    </div>
                </div>
            </div>
        </footer>
    );
}
