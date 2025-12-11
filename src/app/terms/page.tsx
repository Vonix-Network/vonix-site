import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export default function TermsPage() {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navbar />

            <main className="flex-1 pt-24 pb-12 px-4">
                <div className="container max-w-4xl space-y-8">
                    <div className="space-y-4 text-center">
                        <Badge variant="neon-purple" className="mb-4">Legal</Badge>
                        <h1 className="text-4xl md:text-5xl font-bold">
                            Terms of <span className="gradient-text">Service</span>
                        </h1>
                        <p className="text-muted-foreground text-lg">
                            Last Updated: {new Date().toLocaleDateString()}
                        </p>
                    </div>

                    <Card variant="glass" className="p-6 md:p-8">
                        <div className="prose prose-invert max-w-none space-y-8">
                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-neon-cyan">1. Acceptance of Terms</h2>
                                <p className="text-muted-foreground">
                                    By accessing or using Vonix Network (the "Service"), you agree to be bound by these Terms of Service. If you disagree with any part of the terms, then you may not access the Service.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-neon-cyan">2. Account Registration</h2>
                                <p className="text-muted-foreground mb-4">
                                    To access certain features of the Service, you may be required to register for an account. You agree to:
                                </p>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>Provide accurate and complete information.</li>
                                    <li>Maintain the security of your account and password.</li>
                                    <li>Accept responsibility for all activities that occur under your account.</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-neon-cyan">3. User Conduct</h2>
                                <p className="text-muted-foreground mb-4">
                                    You agree not to engage in any of the following prohibited activities:
                                </p>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>Using the service for any illegal purpose.</li>
                                    <li>Harassing, abusing, or harming another person.</li>
                                    <li>Attempting to interfere with or compromise the system integrity or security.</li>
                                    <li>Using cheats, hacks, or unauthorized modifications on our servers.</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-neon-cyan">4. Purchases and Donations</h2>
                                <p className="text-muted-foreground">
                                    All purchases and donations made to Vonix Network are final and non-refundable. By making a purchase, you acknowledge that you are over 18 or have parental consent. Chargebacks will result in an immediate and permanent ban from all our services.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-neon-cyan">5. Termination</h2>
                                <p className="text-muted-foreground">
                                    We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-neon-cyan">6. Limitation of Liability</h2>
                                <p className="text-muted-foreground">
                                    In no event shall Vonix Network, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-neon-cyan">7. Changes to Terms</h2>
                                <p className="text-muted-foreground">
                                    We reserve the right, at our sole discretion, to modify or replace these Terms at any time. What constitutes a material change will be determined at our sole discretion.
                                </p>
                            </section>
                        </div>
                    </Card>
                </div>
            </main>

            <Footer />
        </div>
    );
}
