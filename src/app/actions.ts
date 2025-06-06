
'use server';

import type { LeaderboardEntry, PlayerLeaderboardItem, GroupLeaderboardItem } from '@/lib/data';
import { miniGames, fanbaseMap } from '@/lib/data';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | undefined = undefined;
const LEADERBOARD_TABLE_NAME = 'leaderboard_entries_global';

function initializeSupabase() {
  if (supabase) {
    console.log('actions.ts: Supabase client already initialized. Skipping re-initialization.');
    return;
  }
  console.log('actions.ts: Attempting to initialize Supabase client from environment variables...');

  const supabaseUrlFromEnv = process.env.SUPABASE_URL;
  const supabaseAnonKeyFromEnv = process.env.SUPABASE_ANON_KEY;

  let urlPreview = 'UNDEFINED or EMPTY';
  if (supabaseUrlFromEnv && supabaseUrlFromEnv.length > 0) {
    urlPreview = `${supabaseUrlFromEnv.substring(0, 20)}... (length: ${supabaseUrlFromEnv.length})`;
  } else if (supabaseUrlFromEnv === '') {
    urlPreview = 'EMPTY_STRING';
  }
  console.log(`actions.ts: SUPABASE_URL from env: ${urlPreview}`);

  let keyPreview = 'UNDEFINED or EMPTY';
  if (supabaseAnonKeyFromEnv && supabaseAnonKeyFromEnv.length > 0) {
    keyPreview = `${supabaseAnonKeyFromEnv.substring(0, 10)}...${supabaseAnonKeyFromEnv.substring(supabaseAnonKeyFromEnv.length - 10)} (length: ${supabaseAnonKeyFromEnv.length})`;
  } else if (supabaseAnonKeyFromEnv === '') {
    keyPreview = 'EMPTY_STRING';
  }
  console.log(`actions.ts: SUPABASE_ANON_KEY from env: ${keyPreview}`);

  if (supabaseUrlFromEnv && supabaseUrlFromEnv.length > 0 && supabaseAnonKeyFromEnv && supabaseAnonKeyFromEnv.length > 0) {
    console.log('actions.ts: Both SUPABASE_URL and SUPABASE_ANON_KEY appear to be validly set from env. Proceeding to create client.');
    try {
      supabase = createClient(supabaseUrlFromEnv, supabaseAnonKeyFromEnv, {
        auth: {
          persistSession: false,
        }
      });
      console.log('actions.ts: Supabase client CREATED successfully from environment variables.');
    } catch (error: any) {
      console.error('actions.ts: CRITICAL ERROR during Supabase client creation with environment variables:', error.message, error.stack);
      supabase = undefined;
    }
  } else {
    if (!supabaseUrlFromEnv || supabaseUrlFromEnv.length === 0) {
      console.error('actions.ts: CRITICAL ERROR - SUPABASE_URL environment variable is not set or is empty. Supabase client cannot be initialized.');
    }
    if (!supabaseAnonKeyFromEnv || supabaseAnonKeyFromEnv.length === 0) {
      console.error('actions.ts: CRITICAL ERROR - SUPABASE_ANON_KEY environment variable is not set or is empty. Supabase client cannot be initialized.');
    }
    supabase = undefined;
  }
}

initializeSupabase();

export type AddScorePayload = {
  username: string;
  group: string;
  gameId: string;
  score: number;
};

export async function addScoreToLeaderboardAction(payload: AddScorePayload): Promise<void> {
  console.log('[Server Action - addScoreToLeaderboardAction] Called with payload:', JSON.stringify(payload));

  if (!supabase) {
    console.error(`[Server Action - addScoreToLeaderboardAction] CRITICAL SERVER ERROR: Supabase client is not available.
    This means initializeSupabase() FAILED earlier during application startup. The application cannot connect to the database.
    Payload that could not be processed: ${JSON.stringify(payload)}`);
    throw new Error('Server configuration error: Database connection failed. The detailed reason (e.g., missing SUPABASE_URL/SUPABASE_ANON_KEY) IS LOGGED ON THE SERVER. The client receives a generic error for security. Check server startup logs.');
  }

  const game = miniGames.find(g => g.id === payload.gameId);
  if (!game) {
    console.warn(`[Server Action - addScoreToLeaderboardAction] Game with id ${payload.gameId} not found in miniGames data. Using ID as game_name.`);
  }

  const newEntryData = {
    username: payload.username,
    group_name: payload.group,
    game_id: payload.gameId,
    game_name: game?.name || payload.gameId, // Use gameId as fallback for game_name
    score: payload.score,
    submitted_timestamp: Date.now(), // Changed to Date.now() for bigint compatibility
  };

  console.log('[Server Action - addScoreToLeaderboardAction] Attempting to insert new entry:', JSON.stringify(newEntryData));

  try {
    const { data, error, status, statusText } = await supabase
      .from(LEADERBOARD_TABLE_NAME)
      .insert([newEntryData])
      .select(); // Adding select() to get the inserted data or more detailed error

    if (error) {
      console.error(`[Server Action - addScoreToLeaderboardAction] Error inserting to Supabase. Status: ${status}, StatusText: ${statusText}, Supabase error:`, error);
      throw new Error(`Failed to submit score. Database insert operation failed. Supabase message: ${error.message}. Details: ${error.details || 'N/A'}. Code: ${error.code || 'N/A'}. Check table name, schema, RLS policies, and server logs.`);
    }
    console.log('[Server Action - addScoreToLeaderboardAction] Score added to Supabase successfully. Inserted data:', data);
  } catch (error: any) {
    console.error('[Server Action - addScoreToLeaderboardAction] Caught error during or after Supabase insert attempt. Full error:', error.message, error.stack);
    if (error.message?.startsWith('Failed to submit score.') || error.message?.startsWith('Server configuration error:')) {
        throw error; // Re-throw if it's one of our known error types
    }
    // For other errors, wrap it to give more context
    throw new Error(`Failed to submit score due to an unexpected server error during database operation. Original error: ${error.message || 'Unknown error'}. Check server logs for details related to addScoreToLeaderboardAction.`);
  }
}


type SupabaseLeaderboardEntry = {
  id: number;
  username: string;
  group_name: string;
  game_id: string;
  game_name: string;
  score: number;
  submitted_timestamp: number; // Changed to number as it's stored as bigint (Date.now())
  created_at?: string;
};

function mapSupabaseEntryToLeaderboardEntry(entry: SupabaseLeaderboardEntry): LeaderboardEntry {
  return {
    id: entry.id.toString(),
    username: entry.username,
    group: entry.group_name,
    gameId: entry.game_id,
    gameName: entry.game_name,
    score: entry.score,
    timestamp: entry.submitted_timestamp, // Directly use the number (milliseconds since epoch)
  };
}


export async function getPlayerLeaderboardAction(limit: number = 10): Promise<PlayerLeaderboardItem[]> {
  console.log('[Server Action - getPlayerLeaderboardAction] Called');
  if (!supabase) {
     console.error(`[Server Action - getPlayerLeaderboardAction] CRITICAL SERVER ERROR: Supabase client is not available.`);
    throw new Error('Server configuration error: Database connection failed. Check server startup logs.');
  }

  try {
    const { data, error } = await supabase
      .from(LEADERBOARD_TABLE_NAME)
      .select('id, username, group_name, game_id, game_name, score, submitted_timestamp')
      .order('score', { ascending: false })
      .order('submitted_timestamp', { ascending: true })
      .limit(200);

    if (error) {
      console.error('[Server Action - getPlayerLeaderboardAction] Error fetching player data from Supabase. Supabase error:', error);
      throw new Error(`Failed to fetch player leaderboard. Database select operation failed. Supabase message: ${error.message}.`);
    }

    if (!data || data.length === 0) {
      console.log('[Server Action - getPlayerLeaderboardAction] No data returned for player leaderboard from Supabase.');
      return [];
    }

    const entries: LeaderboardEntry[] = (data as SupabaseLeaderboardEntry[]).map(mapSupabaseEntryToLeaderboardEntry);

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
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        if (b.highestScore !== a.highestScore) return b.highestScore - a.highestScore;
        return a.gamesPlayed - b.gamesPlayed;
      })
      .slice(0, limit);

    console.log(`[Server Action - getPlayerLeaderboardAction] Returning ${sortedPlayers.length} players.`);
    return sortedPlayers;

  } catch (error: any) {
    console.error('[Server Action - getPlayerLeaderboardAction] Caught error. Full error:', error.message, error.stack);
    if (error.message?.startsWith('Failed to fetch player leaderboard.') || error.message?.startsWith('Server configuration error:')) {
        throw error;
    }
    throw new Error(`Failed to fetch player leaderboard due to an unexpected server error. Error: ${error.message || 'Unknown error'}`);
  }
}

export async function getGroupLeaderboardAction(limit: number = 10): Promise<GroupLeaderboardItem[]> {
  console.log('[Server Action - getGroupLeaderboardAction] Called');
   if (!supabase) {
    console.error(`[Server Action - getGroupLeaderboardAction] CRITICAL SERVER ERROR: Supabase client is not available.`);
    throw new Error('Server configuration error: Database connection failed. Check server startup logs.');
  }
  try {
    const { data, error } = await supabase
      .from(LEADERBOARD_TABLE_NAME)
      .select('id, username, group_name, game_id, game_name, score, submitted_timestamp')
      .order('score', { ascending: false })
      .order('submitted_timestamp', { ascending: true })
      .limit(300);

    if (error) {
      console.error('[Server Action - getGroupLeaderboardAction] Error fetching group data from Supabase. Supabase error:', error);
      throw new Error(`Failed to fetch group leaderboard. Database select operation failed. Supabase message: ${error.message}.`);
    }
     if (!data || data.length === 0) {
      console.log('[Server Action - getGroupLeaderboardAction] No data returned for group leaderboard from Supabase.');
      return [];
    }

    const entries: LeaderboardEntry[] = (data as SupabaseLeaderboardEntry[]).map(mapSupabaseEntryToLeaderboardEntry);

    const groups: Record<string, GroupLeaderboardItem> = {};
    entries.forEach(entry => {
      const groupKey = entry.group;
      if (!groups[groupKey]) {
        groups[groupKey] = {
          groupName: groupKey,
          fanbaseName: fanbaseMap[groupKey] || null,
          totalScore: 0,
          gamesPlayed: 0,
          highestScore: 0,
          highestScorePlayer: '',
          highestScoreGame: ''
        };
      }
      groups[groupKey].totalScore += entry.score;
      groups[groupKey].gamesPlayed += 1;
      if (entry.score > groups[groupKey].highestScore) {
        groups[groupKey].highestScore = entry.score;
        groups[groupKey].highestScorePlayer = entry.username;
        groups[groupKey].highestScoreGame = entry.gameName;
      }
    });

    const sortedGroups = Object.values(groups)
      .sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        if (b.highestScore !== a.highestScore) return b.highestScore - a.highestScore;
        return a.gamesPlayed - b.gamesPlayed;
      })
      .slice(0, limit);

    console.log(`[Server Action - getGroupLeaderboardAction] Returning ${sortedGroups.length} groups.`);
    return sortedGroups;
  } catch (error: any) {
    console.error('[Server Action - getGroupLeaderboardAction] Caught error. Full error:', error.message, error.stack);
     if (error.message?.startsWith('Failed to fetch group leaderboard.') || error.message?.startsWith('Server configuration error:')) {
        throw error;
    }
    throw new Error(`Failed to fetch group leaderboard due to an unexpected server error. Error: ${error.message || 'Unknown error'}`);
  }
}
    
