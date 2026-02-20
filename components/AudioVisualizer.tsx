import React from 'react';

interface AudioVisualizerProps {
  volume: number; // 0 to 100
  isActive: boolean;
}

export default function AudioVisualizer({ volume, isActive }: AudioVisualizerProps) {
  // We'll create a few "bars" or circles that react to volume
  
  if (!isActive) return null;

  return (
    <div className="flex items-center justify-center gap-1 h-20">
      {[1, 2, 3, 4, 5].map((i) => {
        // Create a pseudo-random height based on volume and index
        // This is a simple visual simulation since we don't have frequency data here, just RMS volume
        const heightMod = 20 + (volume * (0.5 + Math.random() * 0.5)); 
        const limitedHeight = Math.min(100, Math.max(10, heightMod));
        
        return (
          <div
            key={i}
            className="w-3 bg-white rounded-full transition-all duration-75 ease-in-out"
            style={{
              height: `${limitedHeight}%`,
              opacity: 0.7 + (volume / 200),
            }}
          />
        );
      })}
    </div>
  );
}