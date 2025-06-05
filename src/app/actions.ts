
'use server';

import type { LeaderboardEntry, PlayerLeaderboardItem, GroupLeaderboardItem } from '@/lib/data';
import { miniGames, fanbaseMap } from '@/lib/data';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let db: ReturnType<typeof getFirestore>;

// Initialize Firebase Admin SDK
if (!getApps().length) {
  // Option 1: For deployed environments like App Hosting using a service account JSON string from an env variable (recommended for production)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON_STRING) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON_STRING);
      initializeApp({
        credential: cert(serviceAccount),
      });
      console.log('Firebase Admin SDK initialized with service account from FIREBASE_SERVICE_ACCOUNT_JSON_STRING.');
    } catch (error) {
      console.error('Error parsing FIREBASE_SERVICE_ACCOUNT_JSON_STRING:', error);
      // Fallback or throw error, depending on desired behavior
      initializeApp(); // Attempt ADC initialization as a fallback
      console.warn('Falling back to Application Default Credentials for Admin SDK.');
    }
  }
  // Option 2: For local development using GOOGLE_APPLICATION_CREDENTIALS env var pointing to a JSON file path
  else if (process.env.NODE_ENV === 'development' && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    initializeApp();
    console.log('Firebase Admin SDK initialized for local development using GOOGLE_APPLICATION_CREDENTIALS.');
  }
  // Option 3: For deployed environments (like App Hosting) using Application Default Credentials (if service account has permissions)
  else {
    initializeApp();
    console.log('Firebase Admin SDK initialized with Application Default Credentials (e.g., for App Hosting).');
  }
}
db = getFirestore();

const LEADERBOARD_COLLECTION = 'leaderboardEntriesGlobal';

export type AddScorePayload = {
  username: string;
  group: string;
  gameId: string;
  score: number;
};

export async function addScoreToLeaderboardAction(payload: AddScorePayload): Promise<void> {
  console.log('Server Action: addScoreToLeaderboardAction called with:', payload);

  const game = miniGames.find(g => g.id === payload.gameId);
  const newEntryData = {
    username: payload.username,
    group: payload.group,
    gameId: payload.gameId,
    gameName: game?.name || payload.gameId,
    score: payload.score,
    timestamp: Date.now(), // Firestore serverTimestamp is also an option: admin.firestore.FieldValue.serverTimestamp()
  };

  try {
    const docRef = await db.collection(LEADERBOARD_COLLECTION).add(newEntryData);
    console.log('Score added to Firestore with ID:', docRef.id);
  } catch (error) {
    console.error('Error in addScoreToLeaderboardAction adding to Firestore:', error);
    throw new Error('Failed to submit score to global leaderboard.');
  }
}

export async function getPlayerLeaderboardAction(limit: number = 10): Promise<PlayerLeaderboardItem[]> {
  console.log('Server Action: getPlayerLeaderboardAction called');
  try {
    const snapshot = await db.collection(LEADERBOARD_COLLECTION)
      .orderBy('score', 'desc') // Order by score primarily
      .orderBy('timestamp', 'asc') // Then by earliest time for tie-breaking (optional)
      .get();

    const entries: LeaderboardEntry[] = [];
    snapshot.forEach(doc => entries.push({ id: doc.id, ...doc.data() } as LeaderboardEntry));

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

    const sortedPlayers = Object.values(players)
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) {
          return b.totalScore - a.totalScore;
        }
        // Optional: Further tie-breaking by highest single score, then games played, etc.
        if (b.highestScore !== a.highestScore) {
          return b.highestScore - a.highestScore;
        }
        return a.gamesPlayed - b.gamesPlayed; // Fewer games played for same score might be better
      })
      .slice(0, limit);
      
    console.log(`Returning ${sortedPlayers.length} players for leaderboard.`);
    return sortedPlayers;

  } catch (error) {
    console.error('Error in getPlayerLeaderboardAction fetching from Firestore:', error);
    return []; // Return empty on error to prevent breaking UI
  }
}

export async function getGroupLeaderboardAction(limit: number = 10): Promise<GroupLeaderboardItem[]> {
  console.log('Server Action: getGroupLeaderboardAction called');
  try {
    const snapshot = await db.collection(LEADERBOARD_COLLECTION)
      .orderBy('score', 'desc')
      .orderBy('timestamp', 'asc')
      .get();

    const entries: LeaderboardEntry[] = [];
    snapshot.forEach(doc => entries.push({ id: doc.id, ...doc.data() } as LeaderboardEntry));

    const groups: Record<string, GroupLeaderboardItem> = {};
    entries.forEach(entry => {
      if (!groups[entry.group]) {
        groups[entry.group] = {
          groupName: entry.group,
          fanbaseName: fanbaseMap[entry.group] || null,
          totalScore: 0,
          gamesPlayed: 0,
          highestScore: 0, // Highest score by any player in this group for a single game
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

    const sortedGroups = Object.values(groups)
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) {
          return b.totalScore - a.totalScore;
        }
        if (b.highestScore !== a.highestScore) {
            return b.highestScore - a.highestScore;
        }
        return a.gamesPlayed - b.gamesPlayed;
      })
      .slice(0, limit);

    console.log(`Returning ${sortedGroups.length} groups for leaderboard.`);
    return sortedGroups;
  } catch (error) {
    console.error('Error in getGroupLeaderboardAction fetching from Firestore:', error);
    return [];
  }
}

