import { Navbar } from '@/components/layout/navbar';
import { Footer } from '@/components/layout/footer';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Navbar />

            <main className="flex-1 pt-24 pb-12 px-4">
                <div className="container max-w-4xl space-y-8">
                    <div className="space-y-4 text-center">
                        <Badge variant="neon-purple" className="mb-4">Legal</Badge>
                        <h1 className="text-4xl md:text-5xl font-bold">
                            Privacy <span className="gradient-text">Policy</span>
                        </h1>
                        <p className="text-muted-foreground text-lg">
                            Effective Date: {new Date().toLocaleDateString()}
                        </p>
                    </div>

                    <Card variant="glass" className="p-6 md:p-8">
                        <div className="prose prose-invert max-w-none space-y-8">
                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-neon-cyan">1. Introduction</h2>
                                <p className="text-muted-foreground">
                                    Welcome to Vonix Network ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about this privacy notice, or our practices with regards to your personal information, please contact us via our support channels.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-neon-cyan">2. Information We Collect</h2>
                                <p className="text-muted-foreground mb-4">
                                    We collect information that you voluntarily provide to us when you register on the website, express an interest in obtaining information about us or our products and services, when you participate in activities on the website, or otherwise when you contact us.
                                </p>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>Minecraft Username and UUID</li>
                                    <li>Email address (if provided)</li>
                                    <li>Discord ID (if linked)</li>
                                    <li>Log data (IP address, browser type, device info)</li>
                                    <li>Payment information (processed securely via Stripe/PayPal)</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-neon-cyan">3. How We Use Your Information</h2>
                                <p className="text-muted-foreground mb-4">
                                    We use personal information collected via our website for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations.
                                </p>
                                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                                    <li>To facilitate account creation and logon process.</li>
                                    <li>To send you administrative information.</li>
                                    <li>To fulfill and manage your orders and donations.</li>
                                    <li>To enforce our terms, conditions and policies.</li>
                                    <li>To protect our services from abuse (bans, mutes, etc).</li>
                                </ul>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-neon-cyan">4. Sharing Your Information</h2>
                                <p className="text-muted-foreground">
                                    We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations. We do not sell your personal data to third parties.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-neon-cyan">5. Security</h2>
                                <p className="text-muted-foreground">
                                    We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, please also remember that we cannot guarantee that the internet itself is 100% secure.
                                </p>
                            </section>

                            <section>
                                <h2 className="text-2xl font-semibold mb-4 text-neon-cyan">6. Contact Us</h2>
                                <p className="text-muted-foreground">
                                    If you have questions or comments about this policy, you may contact our support team via our Discord server or the support page.
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
