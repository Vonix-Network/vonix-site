export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/5 via-neon-purple/5 to-neon-pink/5" />
      
      <div className="text-center relative z-10">
        {/* Animated Logo */}
        <div className="w-20 h-20 mx-auto mb-6 relative">
          <svg viewBox="0 0 100 100" fill="none" className="animate-pulse">
            <defs>
              <linearGradient id="loadingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00D9FF">
                  <animate 
                    attributeName="stop-color" 
                    values="#00D9FF; #8B5CF6; #EC4899; #00D9FF" 
                    dur="2s" 
                    repeatCount="indefinite" 
                  />
                </stop>
                <stop offset="50%" stopColor="#8B5CF6">
                  <animate 
                    attributeName="stop-color" 
                    values="#8B5CF6; #EC4899; #00D9FF; #8B5CF6" 
                    dur="2s" 
                    repeatCount="indefinite" 
                  />
                </stop>
                <stop offset="100%" stopColor="#EC4899">
                  <animate 
                    attributeName="stop-color" 
                    values="#EC4899; #00D9FF; #8B5CF6; #EC4899" 
                    dur="2s" 
                    repeatCount="indefinite" 
                  />
                </stop>
              </linearGradient>
            </defs>
            <path 
              d="M20 25 L50 85 L80 25" 
              stroke="url(#loadingGradient)" 
              strokeWidth="8" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
          
          {/* Spinning ring */}
          <div className="absolute inset-0 border-4 border-transparent border-t-neon-cyan rounded-full animate-spin" />
        </div>
        
        <p className="text-muted-foreground animate-pulse">
          Loading...
        </p>
        
        {/* Loading dots */}
        <div className="mt-4 flex justify-center gap-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-neon-cyan animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

