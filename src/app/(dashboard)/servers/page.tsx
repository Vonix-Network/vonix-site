import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { ServerStatusList } from '@/components/server-status';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Our Servers',
  description: 'Discover the different game modes and servers available on Vonix Network. Join the adventure now!',
  openGraph: {
    title: 'Our Servers | Vonix Network',
    description: 'Discover the different game modes and servers available on Vonix Network. Join the adventure now!',
  },
};

export default function ServersPage() {
  return (
    <div className="relative min-h-screen">
      {/* ========== VISIBLE GRADIENT EFFECTS ========== */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 70% 60% at 0% 30%, rgba(0, 217, 255, 0.12) 0%, transparent 50%),
            radial-gradient(ellipse 60% 50% at 100% 70%, rgba(139, 92, 246, 0.10) 0%, transparent 45%),
            radial-gradient(ellipse 50% 40% at 50% 100%, rgba(16, 185, 129, 0.08) 0%, transparent 40%)
          `
        }}
      />

      {/* Glow orbs */}
      <div className="fixed top-20 -left-32 w-[600px] h-[600px] bg-neon-cyan/15 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-20 -right-32 w-[500px] h-[500px] bg-neon-purple/12 rounded-full blur-[130px] pointer-events-none" />

      <div className="container relative z-10 mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4">
            Our Servers
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join our Minecraft servers and start your adventure today!
          </p>
        </div>

        {/* Live Server Status */}
        <div className="mb-6">
          <ServerStatusList variant="full" showRefresh={true} />
        </div>

        <div className="text-center mb-10">
          <p className="text-muted-foreground mb-3">Want to see more details for a specific server?</p>
          <p className="text-sm text-muted-foreground">Use the View Details button on a server card to open its dedicated page with player list and map.</p>
        </div>

        {/* How to Join Section */}
        <Card variant="premium" className="mt-12 overflow-hidden">
          {/* Top accent line */}
          <div className="h-[2px] bg-gradient-to-r from-transparent via-neon-cyan to-transparent" />
          <CardContent className="py-8">
            <h2 className="text-2xl font-bold text-center mb-6 gradient-text">How to Join</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { step: '1', title: 'Copy Server IP', desc: 'Click the copy button next to the server address' },
                { step: '2', title: 'Open Minecraft', desc: 'Launch Minecraft with the correct version/modpack' },
                { step: '3', title: 'Add Server', desc: 'Go to Multiplayer > Add Server and paste the IP' },
              ].map((item) => (
                <div key={item.step} className="text-center group">
                  <div className="w-14 h-14 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center mx-auto mb-4 group-hover:bg-neon-cyan/20 group-hover:border-neon-cyan/50 group-hover:shadow-[0_0_20px_rgba(0,217,255,0.3)] transition-all duration-300">
                    <span className="text-2xl font-bold text-neon-cyan">{item.step}</span>
                  </div>
                  <h3 className="font-bold mb-2 text-lg">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
