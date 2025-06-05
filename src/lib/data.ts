
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
    description: 'Aim true and hit the bullseye to score maximum points!',
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
  'NCT': 'NCTzen', // Simplified from "NCT (All Units)" for mapping
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
  'BABYMONSTER': 'MONSTIEZ', // Assuming official name, adjust if needed
  'P1Harmony': 'P1ece',
  'TREASURE': 'Treasure Maker',
  'ONEUS': 'TO MOON',
  'Billlie': 'Belllie\'ve',
  'CLASS:y': 'CLIKE:y',
  'VIVIZ': 'Na.V'
};

export const kpopGroups = Object.keys(fanbaseMap);

export type LeaderboardEntry = {
  id: string; // unique id for the entry
  username: string;
  group: string;
  gameId: string;
  gameName: string;
  score: number;
  timestamp: number;
};

const LEADERBOARD_STORAGE_KEY = 'isacStudioLeaderboard';

export const getLeaderboardEntries = (): LeaderboardEntry[] => {
  if (typeof window === 'undefined') return [];
  const storedEntries = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
  return storedEntries ? JSON.parse(storedEntries) : [];
};

export const addScoreToLeaderboard = (entry: Omit<LeaderboardEntry, 'id' | 'timestamp' | 'gameName'>): void => {
  if (typeof window === 'undefined') return;
  const entries = getLeaderboardEntries();
  const game = miniGames.find(g => g.id === entry.gameId);
  const newEntry: LeaderboardEntry = {
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    gameName: game?.name || entry.gameId,
    timestamp: Date.now(),
  };
  entries.push(newEntry);
  localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(entries));
};

export type PlayerLeaderboardItem = {
  username: string;
  totalScore: number;
  gamesPlayed: number;
  highestScore: number;
  highestScoreGame: string;
};

export const getPlayerLeaderboard = (limit: number = 10): PlayerLeaderboardItem[] => {
  const entries = getLeaderboardEntries();
  const players: Record<string, PlayerLeaderboardItem> = {};

  entries.forEach(entry => {
    if (!players[entry.username]) {
      players[entry.username] = { username: entry.username, totalScore: 0, gamesPlayed: 0, highestScore: 0, highestScoreGame: '' };
    }
    players[entry.username].totalScore += entry.score;
    players[entry.username].gamesPlayed += 1;
    if (entry.score > players[entry.username].highestScore) {
      players[entry.username].highestScore = entry.score;
      players[entry.username].highestScoreGame = entry.gameName;
    }
  });

  return Object.values(players)
    .sort((a, b) => b.totalScore - a.totalScore || b.highestScore - a.highestScore)
    .slice(0, limit);
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

export const getGroupLeaderboard = (limit: number = 10): GroupLeaderboardItem[] => {
  const entries = getLeaderboardEntries();
  const groups: Record<string, GroupLeaderboardItem> = {};

  entries.forEach(entry => {
    if (!groups[entry.group]) {
      groups[entry.group] = {
        groupName: entry.group,
        fanbaseName: fanbaseMap[entry.group] || null,
        totalScore: 0,
        gamesPlayed: 0,
        highestScore: 0,
        highestScorePlayer: '',
        highestScoreGame: ''
      };
    }
    groups[entry.group].totalScore += entry.score;
    groups[entry.group].gamesPlayed += 1;
    if (entry.score > groups[entry.group].highestScore) {
      groups[entry.group].highestScore = entry.score;
      groups[entry.group].highestScorePlayer = entry.username;
      groups[entry.group].highestScoreGame = entry.gameName;
    }
  });
  
  return Object.values(groups)
    .sort((a, b) => b.totalScore - a.totalScore || b.highestScore - a.highestScore)
    .slice(0, limit);
};

    