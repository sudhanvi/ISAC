import type { LucideIcon } from 'lucide-react';
import { Target, Medal, Footprints } from 'lucide-react';

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
  },
  { 
    id: 'rhythmic-star', 
    name: 'Rhythmic Star', 
    description: 'Dazzle the judges with your graceful rhythmic gymnastics routine.', 
    icon: Medal, 
    href: '/games/rhythmic-star',
    imagePlaceholder: 'https://placehold.co/600x400.png',
    aiHint: 'gymnastics competition'
  },
  { 
    id: 'sprint-challenge', 
    name: 'Sprint Challenge', 
    description: 'Race against the clock and be the fastest on the track!', 
    icon: Footprints, 
    href: '/games/sprint-challenge',
    imagePlaceholder: 'https://placehold.co/600x400.png',
    aiHint: 'running track'
  }
];

export const totalGames = miniGames.length;
