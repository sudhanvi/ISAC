
'use server';

import type { LeaderboardEntry, PlayerLeaderboardItem, GroupLeaderboardItem } from '@/lib/data';
import { miniGames, fanbaseMap } from '@/lib/data';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | undefined = undefined;
const LEADERBOARD_TABLE_NAME = 'leaderboard_entries_global';

function initializeSupabase() {
  if (!supabase) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      console.error('actions.ts: CRITICAL ERROR - SUPABASE_URL environment variable is not set. Ensure it is configured in apphosting.yaml and Secret Manager.');
      return;
    }
    if (!supabaseAnonKey) {
      console.error('actions.ts: CRITICAL ERROR - SUPABASE_ANON_KEY environment variable is not set. Ensure it is configured in apphosting.yaml and Secret Manager.');
      return;
    }

    try {
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false, // Recommended for server-side usage
        }
      });
      console.log('actions.ts: Supabase client initialized successfully.');
    } catch (error: any) {
      console.error('actions.ts: CRITICAL ERROR during Supabase client creation:', error.message, error.stack);
      supabase = undefined;
    }
  }
}

initializeSupabase();

export type AddScorePayload = {
  username: string;
  group: string; // This will be 'group_name' in the table
  gameId: string;
  score: number;
};

export async function addScoreToLeaderboardAction(payload: AddScorePayload): Promise<void> {
  console.log('Server Action: addScoreToLeaderboardAction called with:', payload);

  if (!supabase) {
    console.error('addScoreToLeaderboardAction: Supabase client is not initialized. Aborting score submission. This is a critical server configuration issue.');
    throw new Error('Server configuration error: Database client not available. Score not submitted. Please check server logs.');
  }

  const game = miniGames.find(g => g.id === payload.gameId);
  if (!game) {
    console.warn(`addScoreToLeaderboardAction: Game with id ${payload.gameId} not found in miniGames data. Using ID as name.`);
  }

  const newEntryData = {
    username: payload.username,
    group_name: payload.group, // Ensure this matches the column name in your Supabase table
    game_id: payload.gameId,
    game_name: game?.name || payload.gameId,
    score: payload.score,
    submitted_timestamp: Date.now(), // Storing the submission time as a number
  };

  try {
    const { error } = await supabase.from(LEADERBOARD_TABLE_NAME).insert([newEntryData]);

    if (error) {
      console.error('Error in addScoreToLeaderboardAction inserting to Supabase. Details:', error.message, error.stack);
      throw new Error(`Failed to submit score. Database error: ${error.message}. Check table name, schema, and RLS policies in Supabase.`);
    }
    console.log('Score added to Supabase successfully.');
  } catch (error: any) {
    // Catch any other unexpected errors during the operation
    console.error('Unexpected error during Supabase insert operation:', error.message, error.stack);
    throw new Error(error.message.startsWith('Failed to submit score.') ? error.message : 'Failed to submit score due to an unexpected server error. Check server logs.');
  }
}

// Type definition for the shape of data directly from Supabase
type SupabaseLeaderboardEntry = {
  id: number; // Assuming 'id' is a numeric primary key from Supabase
  username: string;
  group_name: string;
  game_id: string;
  game_name: string;
  score: number;
  submitted_timestamp: number; // Stored as bigint/number
  created_at?: string; // Supabase might add this
};

// Helper to map Supabase entry to our internal LeaderboardEntry type used by components
function mapSupabaseEntryToLeaderboardEntry(entry: SupabaseLeaderboardEntry): LeaderboardEntry {
  return {
    id: entry.id.toString(),
    username: entry.username,
    group: entry.group_name, // Map 'group_name' from DB back to 'group' for consistency
    gameId: entry.game_id,
    gameName: entry.game_name,
    score: entry.score,
    timestamp: entry.submitted_timestamp,
  };
}

export async function getPlayerLeaderboardAction(limit: number = 10): Promise<PlayerLeaderboardItem[]> {
  console.log('Server Action: getPlayerLeaderboardAction called');
  if (!supabase) {
    console.error('getPlayerLeaderboardAction: Supabase client is not initialized. Returning empty leaderboard. This is a critical server configuration issue.');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from(LEADERBOARD_TABLE_NAME) // Using SupabaseLeaderboardEntry for type safety with select
      .select('id, username, group_name, game_id, game_name, score, submitted_timestamp')
      .order('score', { ascending: false })
      .order('submitted_timestamp', { ascending: true }) // Older scores of same value rank higher
      .limit(200); // Fetch more for aggregation logic

    if (error) {
      console.error('Error fetching player data from Supabase:', error.message);
      return [];
    }
    if (!data) {
      console.log('No data returned for player leaderboard from Supabase. This could be due to an empty table or RLS policies.');
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

    console.log(`Returning ${sortedPlayers.length} players for leaderboard.`);
    return sortedPlayers;

  } catch (error: any) {
    console.error('Error in getPlayerLeaderboardAction with Supabase:', error.message, error.stack);
    return [];
  }
}

export async function getGroupLeaderboardAction(limit: number = 10): Promise<GroupLeaderboardItem[]> {
  console.log('Server Action: getGroupLeaderboardAction called');
   if (!supabase) {
    console.error('getGroupLeaderboardAction: Supabase client is not initialized. Returning empty leaderboard. This is a critical server configuration issue.');
    return [];
  }
  try {
    const { data, error } = await supabase
      .from(LEADERBOARD_TABLE_NAME) // Using SupabaseLeaderboardEntry for type safety with select
      .select('id, username, group_name, game_id, game_name, score, submitted_timestamp')
      .order('score', { ascending: false })
      .order('submitted_timestamp', { ascending: true })
      .limit(300); // Fetch more for accurate group aggregation

    if (error) {
      console.error('Error fetching group data from Supabase:', error.message);
      return [];
    }
     if (!data) {
      console.log('No data returned for group leaderboard from Supabase. This could be due to an empty table or RLS policies.');
      return [];
    }

    const entries: LeaderboardEntry[] = (data as SupabaseLeaderboardEntry[]).map(mapSupabaseEntryToLeaderboardEntry);

    const groups: Record<string, GroupLeaderboardItem> = {};
    entries.forEach(entry => {
      const groupKey = entry.group; // Using the mapped 'group' field which comes from 'group_name'
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

    console.log(`Returning ${sortedGroups.length} groups for leaderboard.`);
    return sortedGroups;
  } catch (error: any) {
    console.error('Error in getGroupLeaderboardAction with Supabase:', error.message, error.stack);
    return [];
  }
}
