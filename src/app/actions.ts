
'use server';

import type { LeaderboardEntry, PlayerLeaderboardItem, GroupLeaderboardItem } from '@/lib/data';
import { miniGames, fanbaseMap } from '@/lib/data';

/**
 * NOTE TO USER:
 * The following Server Actions are designed to support a global leaderboard.
 * To make this fully functional, you need to integrate a backend database (e.g., Firestore).
 * - Initialize Firebase Admin SDK (if using Firestore) in a server-only context.
 * - Replace the placeholder/commented-out database logic in each action
 *   with actual database queries and mutations.
 */

// Example: Firebase Admin SDK Initialization (conceptual - requires service account setup by user)
// import { initializeApp, getApps, cert, deleteApp } from 'firebase-admin/app';
// import { getFirestore } from 'firebase-admin/firestore';
//
// if (!getApps().length) {
//   // const serviceAccount = require('../path/to/your-serviceAccountKey.json'); // User needs to provide this
//   // initializeApp({
//   //   credential: cert(serviceAccount),
//   // });
// } else {
//   // Optional: Reinitialize if needed, or handle existing app instance
//   // This part can be tricky with Next.js hot reloading in dev.
//   // Consider a more robust singleton pattern for Firebase Admin initialization.
// }
// const db = getFirestore();
const LEADERBOARD_COLLECTION = 'leaderboardEntriesGlobal'; // Example Firestore collection name

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
    timestamp: Date.now(),
  };

  try {
    // --- Firestore Integration Placeholder ---
    // Example of adding to Firestore:
    // const docRef = await db.collection(LEADERBOARD_COLLECTION).add(newEntryData);
    // console.log('Score added to Firestore with ID:', docRef.id);
    // --- End Firestore Integration Placeholder ---

    // Simulate async operation if no DB call is made
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate network delay
    console.log('Score submission processed by server action (simulated).');
  } catch (error) {
    console.error('Error in addScoreToLeaderboardAction:', error);
    // Handle or throw the error as appropriate for your application
    throw new Error('Failed to submit score.');
  }
}

export async function getPlayerLeaderboardAction(limit: number = 10): Promise<PlayerLeaderboardItem[]> {
  console.log('Server Action: getPlayerLeaderboardAction called');
  try {
    // --- Firestore Integration Placeholder ---
    // Example of fetching and processing from Firestore:
    // const snapshot = await db.collection(LEADERBOARD_COLLECTION)
    //   .orderBy('timestamp', 'desc') // Fetch all entries to correctly calculate aggregates
    //   .get();
    // const entries: LeaderboardEntry[] = [];
    // snapshot.forEach(doc => entries.push({ id: doc.id, ...doc.data() } as LeaderboardEntry));
    //
    // const players: Record<string, PlayerLeaderboardItem> = {};
    // entries.forEach(entry => {
    //   if (!players[entry.username]) {
    //     players[entry.username] = { username: entry.username, totalScore: 0, gamesPlayed: 0, highestScore: 0, highestScoreGame: '' };
    //   }
    //   players[entry.username].totalScore += entry.score;
    //   players[entry.username].gamesPlayed += 1;
    //   if (entry.score > players[entry.username].highestScore) {
    //     players[entry.username].highestScore = entry.score;
    //     players[entry.username].highestScoreGame = entry.gameName;
    //   }
    // });
    // const sortedPlayers = Object.values(players)
    //   .sort((a, b) => b.totalScore - a.totalScore || b.highestScore - a.highestScore)
    //   .slice(0, limit);
    // return sortedPlayers;
    // --- End Firestore Integration Placeholder ---

    // Returning an empty array as a placeholder.
    // The UI will show "No player scores recorded yet."
    return [];
  } catch (error) {
    console.error('Error in getPlayerLeaderboardAction:', error);
    return []; // Return empty on error to prevent breaking UI
  }
}

export async function getGroupLeaderboardAction(limit: number = 10): Promise<GroupLeaderboardItem[]> {
  console.log('Server Action: getGroupLeaderboardAction called');
  try {
    // --- Firestore Integration Placeholder ---
    // Example of fetching and processing from Firestore:
    // const snapshot = await db.collection(LEADERBOARD_COLLECTION)
    //   .orderBy('timestamp', 'desc') // Fetch all entries
    //   .get();
    // const entries: LeaderboardEntry[] = [];
    // snapshot.forEach(doc => entries.push({ id: doc.id, ...doc.data() } as LeaderboardEntry));
    //
    // const groups: Record<string, GroupLeaderboardItem> = {};
    // entries.forEach(entry => {
    //   if (!groups[entry.group]) {
    //     groups[entry.group] = {
    //       groupName: entry.group,
    //       fanbaseName: fanbaseMap[entry.group] || null,
    //       totalScore: 0,
    //       gamesPlayed: 0,
    //       highestScore: 0,
    //       highestScorePlayer: '',
    //       highestScoreGame: ''
    //     };
    //   }
    //   groups[entry.group].totalScore += entry.score;
    //   groups[entry.group].gamesPlayed += 1;
    //   if (entry.score > groups[entry.group].highestScore) {
    //     groups[entry.group].highestScore = entry.score;
    //     groups[entry.group].highestScorePlayer = entry.username;
    //     groups[entry.group].highestScoreGame = entry.gameName;
    //   }
    // });
    // const sortedGroups = Object.values(groups)
    //   .sort((a, b) => b.totalScore - a.totalScore || b.highestScore - a.highestScore)
    //   .slice(0, limit);
    // return sortedGroups;
    // --- End Firestore Integration Placeholder ---

    // Returning an empty array as a placeholder.
    return [];
  } catch (error) {
    console.error('Error in getGroupLeaderboardAction:', error);
    return [];
  }
}
