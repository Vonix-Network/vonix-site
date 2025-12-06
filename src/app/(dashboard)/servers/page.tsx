import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { ServerStatusList } from '@/components/server-status';

export default function ServersPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold gradient-text mb-4">
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
      <Card variant="gradient" className="mt-12">
        <CardContent className="py-8">
          <h2 className="text-2xl font-bold text-center mb-6">How to Join</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '1', title: 'Copy Server IP', desc: 'Click the copy button next to the server address' },
              { step: '2', title: 'Open Minecraft', desc: 'Launch Minecraft with the correct version/modpack' },
              { step: '3', title: 'Add Server', desc: 'Go to Multiplayer > Add Server and paste the IP' },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-neon-cyan/20 border border-neon-cyan/50 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-neon-cyan">{item.step}</span>
                </div>
                <h3 className="font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

