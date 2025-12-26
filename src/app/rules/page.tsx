import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Shield, MessageSquare, Monitor, AlertTriangle } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Server Rules',
    description: 'Read the official rules and community guidelines for Vonix Network. Fair play and respect are our top priorities.',
    openGraph: {
        title: 'Server Rules | Vonix Network',
        description: 'Community guidelines and server rules for fair play.',
    },
};

export default function RulesPage() {
    const rulesCategories = [
        {
            icon: Shield,
            title: 'General Conduct',
            color: 'text-neon-cyan',
            rules: [
                'Be respectful to all players and staff members.',
                'Hate speech, racism, sexism, or discrimination of any kind is strictly prohibited.',
                'Do not spam or flood the chat with repetitive messages.',
                'Do not impersonate staff members or other players.',
                'Keep the chat language appropriate for all ages (PG-13).',
            ]
        },
        {
            icon: Monitor,
            title: 'Gameplay Integrity',
            color: 'text-neon-purple',
            rules: [
                'No hacking, cheating, or using unauthorized client modifications (killaura, xray, flight, etc.).',
                'Do not exploit bugs or glitches. Report them immediately to staff.',
                'Do not use macros or automated scripts for gameplay advantages.',
                'Griefing is not allowed unless specified in specific server modes (e.g., Factions/Anarchy).',
                'Do not build inappropriate structures or symbols.',
            ]
        },
        {
            icon: MessageSquare,
            title: 'Account & Trading',
            color: 'text-neon-pink',
            rules: [
                'You are responsible for your own account security.',
                'Do not share your password with anyone.',
                'Scamming other players in in-game trades is prohibited.',
                'Do not advertise other Minecraft servers or websites.',
                'Real-money trading (RMT) for in-game items is generally prohibited unless via our official store.',
            ]
        },
        {
            icon: AlertTriangle,
            title: 'Punishments',
            color: 'text-neon-orange',
            rules: [
                'Staff members have the final say in all disputes.',
                'Punishments may range from warnings and mutes to temporary or permanent bans.',
                'Evasion of punishments (using alt accounts) will result in stricter penalties.',
                'Appeals can be made via the official support ticket system on Discord.',
            ]
        }
    ];

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navbar />

            <main className="flex-1 pt-24 pb-12 px-4">
                <div className="container max-w-4xl space-y-8">
                    <div className="space-y-4 text-center">
                        <Badge variant="neon-purple" className="mb-4">Community Standards</Badge>
                        <h1 className="text-4xl md:text-5xl font-bold">
                            Server <span className="gradient-text">Rules</span>
                        </h1>
                        <p className="text-muted-foreground text-lg">
                            Follow these rules to ensure a fun and safe experience for everyone.
                        </p>
                    </div>

                    <div className="grid gap-6">
                        {rulesCategories.map((category: any, index: any) => (
                            <Card key={index} variant="glass" className="p-6">
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-xl bg-background/50 ${category.color}`}>
                                        <category.icon className="h-6 w-6" />
                                    </div>
                                    <div className="space-y-4 flex-1">
                                        <h2 className="text-xl font-bold">{category.title}</h2>
                                        <ul className="grid gap-3">
                                            {category.rules.map((rule: any, ruleIndex: any) => (
                                                <li key={ruleIndex} className="flex items-start gap-3 text-muted-foreground">
                                                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-border flex-shrink-0" />
                                                    <span>{rule}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    <div className="text-center pt-8">
                        <p className="text-muted-foreground">
                            By playing on Vonix Network, you agree to abide by these rules.
                            We reserve the right to change these rules at any time.
                        </p>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
