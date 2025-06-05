import type { LucideIcon } from 'lucide-react';
import { Target, Medal, Zap, Puzzle, Brain, Mic2, Gamepad2, Wand2, Footprints } from 'lucide-react';

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
  },
  { 
    id: 'puzzle-master', 
    name: 'Puzzle Master', 
    description: 'Solve intricate puzzles and prove your logical prowess.', 
    icon: Puzzle, 
    href: '/games/puzzle-master',
    imagePlaceholder: 'https://placehold.co/600x400.png',
    aiHint: 'complex puzzle'
  },
  { 
    id: 'memory-whiz', 
    name: 'Memory Whiz', 
    description: 'Test your recall abilities in this challenging memory game.', 
    icon: Brain, 
    href: '/games/memory-whiz',
    imagePlaceholder: 'https://placehold.co/600x400.png',
    aiHint: 'memory game'
  },
  { 
    id: 'kpop-idol-quiz', 
    name: 'K-Pop Idol Quiz', 
    description: 'How well do you know your favorite K-Pop idols? Find out!', 
    icon: Mic2, 
    href: '/games/kpop-idol-quiz',
    imagePlaceholder: 'https://placehold.co/600x400.png',
    aiHint: 'kpop concert'
  },
  {
    id: 'dance-off',
    name: 'Dance Off Supreme',
    description: 'Show off your best moves and become the dance champion.',
    icon: Gamepad2,
    href: '/games/dance-off',
    imagePlaceholder: 'https://placehold.co/600x400.png',
    aiHint: 'dance battle'
  },
  {
    id: 'magic-mayhem',
    name: 'Magic Mayhem',
    description: 'Unleash powerful spells in a magical duel.',
    icon: Wand2,
    href: '/games/magic-mayhem',
    imagePlaceholder: 'https://placehold.co/600x400.png',
    aiHint: 'fantasy magic'
  }
];

export const totalGames = miniGames.length;
