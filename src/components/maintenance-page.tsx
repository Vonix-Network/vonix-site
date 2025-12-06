import { AlertTriangle, LogIn } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface MaintenancePageProps {
    message?: string;
}

export function MaintenancePage({ message = "Under Maintenance, Expect possible downtimes." }: MaintenancePageProps) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="text-center max-w-md">
                <div className="mb-8">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-warning/20 mb-6">
                        <AlertTriangle className="w-12 h-12 text-warning" />
                    </div>
                    <h1 className="text-4xl font-bold gradient-text mb-4">
                        Maintenance Mode
                    </h1>
                </div>

                <Card variant="glass" className="mb-8">
                    <CardContent className="p-6">
                        <p className="text-lg text-muted-foreground">
                            {message}
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

