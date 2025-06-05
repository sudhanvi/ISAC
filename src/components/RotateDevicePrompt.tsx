
'use client';

import { RefreshCw } from 'lucide-react'; // Using RefreshCw as a generic rotate icon

export default function RotateDevicePrompt() {
  return (
    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center bg-background/95 backdrop-blur-sm p-6 text-center">
      <RefreshCw className="h-16 w-16 text-primary mb-6 animate-spin-slow" />
      <h2 className="text-3xl font-bold text-primary mb-3 font-headline">
        Rotate Your Device
      </h2>
      <p className="text-lg text-foreground/80 max-w-md">
        For the best gaming experience, please rotate your device to landscape mode.
      </p>
    </div>
  );
}

// Add a simple animation for the icon to globals.css or tailwind.config.ts if more complex
// For now, a simple spin (if needed) can be added to tailwind.config.ts
// Or define animate-spin-slow directly in globals.css if preferred:
/*
@keyframes spin-slow {
  to {
    transform: rotate(360deg);
  }
}
.animate-spin-slow {
  animation: spin-slow 2s linear infinite;
}
*/
// For simplicity, if RefreshCw doesn't look good spinning, we can remove animate-spin-slow or use a static icon like Smartphone.
// Let's stick with RefreshCw and if the spin is distracting we can remove it later.
