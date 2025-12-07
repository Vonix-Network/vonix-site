import { AlertTriangle, LogIn } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface MaintenancePageProps {
    message?: string;
}

export function MaintenancePage({ message }: MaintenancePageProps) {
    // Default message if none provided
    const displayMessage = message || "We are working on adding newer and better things!";

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            {/* Background effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-warning/5 via-neon-purple/5 to-neon-pink/5" />
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-warning/10 rounded-full blur-[128px]" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-neon-purple/10 rounded-full blur-[128px]" />

            <div className="text-center max-w-md relative z-10">
                <div className="mb-8">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-warning/20 mb-6">
                        <AlertTriangle className="w-12 h-12 text-warning" />
                    </div>
                    <h1 className="text-4xl font-bold gradient-text mb-4">
                        Site is in Maintenance
                    </h1>
                </div>

                <Card variant="glass" className="mb-8">
                    <CardContent className="p-6">
                        <p className="text-lg text-muted-foreground">
                            {displayMessage}
                        </p>
                    </CardContent>
                </Card>

                <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                        We&apos;re working hard to improve your experience.
                        Please check back soon!
                    </p>

                    <div className="pt-4">
                        <Link href="/login">
                            <Button variant="neon-outline" size="sm">
                                <LogIn className="w-4 h-4 mr-2" />
                                Staff Login
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="mt-12 text-xs text-muted-foreground">
                    <p>© {new Date().getFullYear()} Vonix Network</p>
                </div>
            </div>
        </div>
    );
}

export default MaintenancePage;
