
import type { LucideIcon } from 'lucide-react';
import { Target, Footprints, Music, Trophy } from 'lucide-react'; // Keeping some icons for potential future use or if user changes mind. Footprints for Sprint, Music for Rhythmic.

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
    description: 'Aim true and hit the bullseye to score maximum points! You start with 10 arrows. Hit a bullseye (9-10 points) for +2 bonus arrows!',
    icon: Target,
    href: '/games/archery-ace',
    imagePlaceholder: 'https://placehold.co/600x400.png',
    aiHint: 'archery range'
  }
];

export const totalGames = miniGames.length;

export const fanbaseMap: Record<string, string | null> = {
  // 1st Generation
  'Seo Taiji and Boys': null,
  'H.O.T.': 'Club H.O.T.',
  'S.E.S.': 'Friend',
  'Fin.K.L': 'Pinky',
  'Shinhwa': 'Shinhwa Changjo',
  'g.o.d': 'Fan God',

  // 2nd Generation
  'TVXQ!': 'Cassiopeia',
  'Super Junior': 'E.L.F.',
  'BIGBANG': 'V.I.P',
  'Wonder Girls': 'Wonderful',
  'Girls\' Generation (SNSD)': 'S♡NE',
  'KARA': 'Kamilia',
  '2NE1': 'Blackjack',
  'SHINee': 'Shawol',
  'SISTAR': 'STAR1',
  '2PM': 'Hottest',

  // 3rd Generation
  'BTS': 'A.R.M.Y',
  'BLACKPINK': 'BLINK',
  'EXO': 'EXO-L',
  'TWICE': 'ONCE',
  'Red Velvet': 'ReVeluv',
  'SEVENTEEN': 'Carat',
  'NCT': 'NCTzen',
  'GOT7': 'I GOT7',
  'MONSTA X': 'MONBEBE',
  'MAMAMOO': 'Moomoo',
  'Stray Kids': 'STAY',

  // 4th Generation & Onwards
  '(G)I-DLE': 'Neverland',
  'ATEEZ': 'ATINY',
  'TOMORROW X TOGETHER (TXT)': 'MOA',
  'ITZY': 'MIDZY',
  'aespa': 'MY',
  'ENHYPEN': 'ENGENE',
  'IVE': 'DIVE',
  'NewJeans': 'Bunnies',
  'LE SSERAFIM': 'FEARNOT',
  'THE BOYZ': 'THE B',
  'STAYC': 'SWITH',
  'NMIXX': 'NSWER',
  'Kep1er': 'Kep1ian',
  'ZEROBASEONE (ZB1)': 'ZEROSE',
  'RIIZE': 'BRIIZE',
  'BOYNEXTDOOR': 'ONEDOOR',
  'KISS OF LIFE': 'KISSY',
  'BABYMONSTER': 'MONSTIEZ',
  'P1Harmony': 'P1ece',
  'TREASURE': 'Treasure Maker',
  'ONEUS': 'TO MOON',
  'Billlie': 'Belllie\'ve',
  'CLASS:y': 'CLIKE:y',
  'VIVIZ': 'Na.V'
};

export const kpopGroups = Object.keys(fanbaseMap);

// Type definitions for leaderboard entries remain, but data will be handled by server actions.
export type LeaderboardEntry = {
  id: string; // unique id for the entry, typically generated by the database
  username: string;
  group: string;
  gameId: string;
  gameName: string;
  score: number;
  timestamp: number; // milliseconds since epoch
};

export type PlayerLeaderboardItem = {
  username: string;
  totalScore: number;
  gamesPlayed: number;
  highestScore: number;
  highestScoreGame: string;
};

export type GroupLeaderboardItem = {
  groupName: string;
  fanbaseName: string | null;
  totalScore: number;
  gamesPlayed: number;
  highestScore: number;
  highestScorePlayer: string;
  highestScoreGame: string;
};

