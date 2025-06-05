import type { LucideIcon } from 'lucide-react';
import { Target } from 'lucide-react'; // Only import Target

export type MiniGamePerformance = "Excellent" | "Good" | "Average" | "Poor";

export const performanceOptions: MiniGamePerformance[] = ["Excellent", "Good", "Average", "Poor"];

export type MiniGame = {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  href: string;
  imagePlaceholder: string;
  aiHint: string;
};

export const miniGames: MiniGame[] = [
  { 
    id: 'archery-ace', 
    name: 'Archery Ace', 
    description: 'Aim true and hit the bullseye to score maximum points!', 
    icon: Target, 
    href: '/games/archery-ace',
    imagePlaceholder: 'https://placehold.co/600x400.png',
    aiHint: 'archery range'
  }
];

export const totalGames = miniGames.length;
