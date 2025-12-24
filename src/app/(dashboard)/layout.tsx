import { Navbar } from '@/components/layout/navbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Global Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Animated gradient mesh */}
        <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/5 via-background to-neon-purple/5 opacity-50" />

        {/* Top-left glow */}
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-neon-cyan/10 rounded-full blur-[120px] opacity-40 animate-pulse" style={{ animationDuration: '4s' }} />

        {/* Bottom-right glow */}
        <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] bg-neon-purple/10 rounded-full blur-[120px] opacity-40 animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />

        {/* Center decorative glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-neon-pink/5 rounded-full blur-[150px] opacity-20" />
      </div>

      <div className="relative z-10">
        <Navbar />
        <main className="pt-0 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
}
