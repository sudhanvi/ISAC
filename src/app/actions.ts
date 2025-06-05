
'use server';

import type { LeaderboardEntry, PlayerLeaderboardItem, GroupLeaderboardItem } from '@/lib/data';
import { miniGames, fanbaseMap } from '@/lib/data';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let adminApp: App | undefined = undefined;
let db: Firestore | undefined = undefined;

function initializeFirebaseAdmin() {
  if (!getApps().length) {
    console.log('actions.ts: No Firebase Admin apps initialized. Attempting initialization...');
    try {
      if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON_STRING) {
        console.log('actions.ts: FIREBASE_SERVICE_ACCOUNT_JSON_STRING found. Attempting to parse and initialize.');
        console.log('actions.ts: Snippet of FIREBASE_SERVICE_ACCOUNT_JSON_STRING (first 50 chars, last 50 chars):', process.env.FIREBASE_SERVICE_ACCOUNT_JSON_STRING.substring(0,50), '...', process.env.FIREBASE_SERVICE_ACCOUNT_JSON_STRING.slice(-50));
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON_STRING);
        adminApp = initializeApp({
          credential: cert(serviceAccount),
        });
        console.log('actions.ts: Firebase Admin SDK initialized successfully using service account JSON string.');
      } else if (process.env.NODE_ENV === 'development' && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        console.log('actions.ts: NODE_ENV is development and GOOGLE_APPLICATION_CREDENTIALS found:', process.env.GOOGLE_APPLICATION_CREDENTIALS, '. Initializing with ADC for local dev.');
        adminApp = initializeApp();
        console.log('actions.ts: Firebase Admin SDK initialized successfully for local development using GOOGLE_APPLICATION_CREDENTIALS.');
      } else {
        console.log('actions.ts: FIREBASE_SERVICE_ACCOUNT_JSON_STRING is NOT set and not in local dev with GOOGLE_APPLICATION_CREDENTIALS. Attempting default ADC initialization (e.g., for App Hosting).');
        adminApp = initializeApp(); // Relies on Application Default Credentials provided by the App Hosting environment
        console.log('actions.ts: Firebase Admin SDK initialized successfully using Application Default Credentials (e.g., from App Hosting environment).');
      }
    } catch (error: any) {
      console.error('actions.ts: CRITICAL ERROR during Firebase Admin SDK initializeApp:', error.message, error.stack);
      if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON_STRING) {
        console.error('actions.ts: Error occurred while using FIREBASE_SERVICE_ACCOUNT_JSON_STRING. Ensure its content is a valid JSON service account key.');
      } else {
        console.error('actions.ts: Error occurred during default ADC initialization or local dev ADC. Ensure the runtime service account has permissions or GOOGLE_APPLICATION_CREDENTIALS is set correctly for local dev.');
      }
      adminApp = undefined;
    }
  } else {
    adminApp = getApps()[0];
    console.log('actions.ts: Firebase Admin app already initialized.');
  }

  if (adminApp && !db) {
    try {
      db = getFirestore(adminApp);
      console.log('actions.ts: Firestore instance obtained successfully.');
    } catch (error: any) {
      console.error('actions.ts: CRITICAL ERROR obtaining Firestore instance:', error.message, error.stack);
      console.error('actions.ts: This often means Firestore is not enabled in your Firebase project or the initialized app lacks permissions.');
      db = undefined;
    }
  } else if (!adminApp) {
    console.error('actions.ts: Cannot get Firestore instance because Firebase Admin App is not initialized.');
    db = undefined;
  }
}

initializeFirebaseAdmin();


export type AddScorePayload = {
  username: string;
  group: string;
  gameId: string;
  score: number;
};

const LEADERBOARD_COLLECTION = 'leaderboardEntriesGlobal';

export async function addScoreToLeaderboardAction(payload: AddScorePayload): Promise<void> {
  console.log('Server Action: addScoreToLeaderboardAction called with:', payload);

  if (!db) {
    console.error('addScoreToLeaderboardAction: Firestore is not initialized. Aborting score submission. This is a critical server configuration issue.');
    // This error will be caught by the client and displayed in a toast
    throw new Error('Server configuration error: Firestore not available. Score not submitted. Please check server logs.');
  }

  const game = miniGames.find(g => g.id === payload.gameId);
  if (!game) {
    console.warn(`addScoreToLeaderboardAction: Game with id ${payload.gameId} not found in miniGames data. Using ID as name.`);
  }
  const newEntryData = {
    username: payload.username,
    group: payload.group,
    gameId: payload.gameId,
    gameName: game?.name || payload.gameId,
    score: payload.score,
    timestamp: Date.now(),
  };

  try {
    const docRef = await db.collection(LEADERBOARD_COLLECTION).add(newEntryData);
    console.log('Score added to Firestore with ID:', docRef.id);
  } catch (error: any) {
    console.error('Error in addScoreToLeaderboardAction adding to Firestore. Details:', error.message, error.stack, 'About to throw a new error to the client.');
    // This refined error message will be shown in the client toast and Next.js dev overlay.
    throw new Error('Failed to submit score. Server-side error interacting with database. Check server logs for detailed Firestore/Admin SDK errors.');
  }
}

export async function getPlayerLeaderboardAction(limit: number = 10): Promise<PlayerLeaderboardItem[]> {
  console.log('Server Action: getPlayerLeaderboardAction called');
  if (!db) {
    console.error('getPlayerLeaderboardAction: Firestore is not initialized. Returning empty leaderboard. This is a critical server configuration issue.');
    return [];
  }

  try {
    const snapshot = await db.collection(LEADERBOARD_COLLECTION)
      .orderBy('score', 'desc')
      .orderBy('timestamp', 'asc')
      .limit(100) // Fetch more initially to allow for aggregation
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
        // Primary sort: totalScore descending
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        // Secondary sort: highestScore descending (as a tie-breaker)
        if (b.highestScore !== a.highestScore) return b.highestScore - a.highestScore;
        // Tertiary sort: gamesPlayed ascending (fewer games to reach score is better)
        return a.gamesPlayed - b.gamesPlayed;
      })
      .slice(0, limit);

    console.log(`Returning ${sortedPlayers.length} players for leaderboard.`);
    return sortedPlayers;

  } catch (error: any) {
    console.error('Error in getPlayerLeaderboardAction fetching from Firestore:', error.message, error.stack);
    return []; // Return empty on error
  }
}

export async function getGroupLeaderboardAction(limit: number = 10): Promise<GroupLeaderboardItem[]> {
  console.log('Server Action: getGroupLeaderboardAction called');
   if (!db) {
    console.error('getGroupLeaderboardAction: Firestore is not initialized. Returning empty leaderboard. This is a critical server configuration issue.');
    return [];
  }
  try {
    const snapshot = await db.collection(LEADERBOARD_COLLECTION)
      .orderBy('score', 'desc') // Fetch a larger set for aggregation
      .orderBy('timestamp', 'asc')
      .limit(200) // Fetch more for accurate group aggregation
      .get();

    const entries: LeaderboardEntry[] = [];
    snapshot.forEach(doc => entries.push({ id: doc.id, ...doc.data() } as LeaderboardEntry));

    const groups: Record<string, GroupLeaderboardItem> = {};
    entries.forEach(entry => {
      if (!groups[entry.group]) {
        groups[entry.group] = {
          groupName: entry.group,
          fanbaseName: fanbaseMap[entry.group] || null, // Get fanbase name
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

    const sortedGroups = Object.values(groups)
      .sort((a, b) => {
        // Primary sort: totalScore descending
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        // Secondary sort: highestScore descending (as a tie-breaker)
        if (b.highestScore !== a.highestScore) return b.highestScore - a.highestScore;
        // Tertiary sort: gamesPlayed ascending (fewer games to reach score is better)
        return a.gamesPlayed - b.gamesPlayed;
      })
      .slice(0, limit);

    console.log(`Returning ${sortedGroups.length} groups for leaderboard.`);
    return sortedGroups;
  } catch (error: any) {
    console.error('Error in getGroupLeaderboardAction fetching from Firestore:', error.message, error.stack);
    return []; // Return empty on error
  }
}
