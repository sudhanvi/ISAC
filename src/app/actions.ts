
'use server';

import type { LeaderboardEntry, PlayerLeaderboardItem, GroupLeaderboardItem } from '@/lib/data';
import { miniGames, fanbaseMap } from '@/lib/data';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iyukpsewpwpttglstdto.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml5dWtwc2V3cHdwdHRnbHN0ZHRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNzU2ODIsImV4cCI6MjA2NDc1MTY4Mn0.u4bJtwEllp2Wgwq6eHF78q43jMhuMeZr2w4JXjPXYso';

let supabase: SupabaseClient | undefined = undefined;
const LEADERBOARD_TABLE_NAME = 'leaderboard_entries_global';

try {
  if (!supabaseUrl) {
    console.error('actions.ts: CRITICAL ERROR - Hardcoded SUPABASE_URL is missing or empty.');
  } else if (!supabaseAnonKey) {
    console.error('actions.ts: CRITICAL ERROR - Hardcoded SUPABASE_ANON_KEY is missing or empty.');
  } else {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false, // Recommended for server-side usage
      }
    });
    console.log('actions.ts: Supabase client CREATED successfully using hardcoded credentials.');
  }
} catch (error: any) {
  console.error('actions.ts: CRITICAL ERROR during Supabase client creation with hardcoded credentials:', error.message, error.stack);
  supabase = undefined;
}

export type AddScorePayload = {
  username: string;
  group: string;
  gameId: string;
  score: number;
};

export async function addScoreToLeaderboardAction(payload: AddScorePayload): Promise<void> {
  console.log('Server Action: addScoreToLeaderboardAction called with:', payload);

  if (!supabase) {
    console.error('addScoreToLeaderboardAction: Supabase client is not initialized. Aborting score submission. This likely means the hardcoded credentials failed to initialize the client.');
    throw new Error('Server configuration error: Database client not available (hardcoded credentials). Score not submitted. Please check server logs.');
  }

  const game = miniGames.find(g => g.id === payload.gameId);
  if (!game) {
    console.warn(`addScoreToLeaderboardAction: Game with id ${payload.gameId} not found in miniGames data. Using ID as name.`);
  }

  const newEntryData = {
    username: payload.username,
    group_name: payload.group,
    game_id: payload.gameId,
    game_name: game?.name || payload.gameId,
    score: payload.score,
    submitted_timestamp: Date.now(),
  };

  try {
    const { error } = await supabase.from(LEADERBOARD_TABLE_NAME).insert([newEntryData]);

    if (error) {
      console.error('Error in addScoreToLeaderboardAction inserting to Supabase. Supabase error details:', error);
      throw new Error(`Failed to submit score. Database insert operation failed. Supabase message: ${error.message}. Check table name, schema, RLS policies, and server logs.`);
    }
    console.log('Score added to Supabase successfully.');
  } catch (error: any) {
    console.error('addScoreToLeaderboardAction: Caught error during or after Supabase insert attempt. Full error:', error.message, error.stack);
    if (error.message.startsWith('Failed to submit score.') || error.message.startsWith('Server configuration error:')) {
        throw error;
    }
    throw new Error('Failed to submit score due to an unexpected server error during database operation. Check server logs for details.');
  }
}


type SupabaseLeaderboardEntry = {
  id: number;
  username: string;
  group_name: string;
  game_id: string;
  game_name: string;
  score: number;
  submitted_timestamp: number;
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
    timestamp: entry.submitted_timestamp,
  };
}


export async function getPlayerLeaderboardAction(limit: number = 10): Promise<PlayerLeaderboardItem[]> {
  console.log('Server Action: getPlayerLeaderboardAction called');
  if (!supabase) {
    console.error('getPlayerLeaderboardAction: Supabase client is not initialized (hardcoded credentials). Returning empty leaderboard.');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from(LEADERBOARD_TABLE_NAME)
      .select('id, username, group_name, game_id, game_name, score, submitted_timestamp')
      .order('score', { ascending: false })
      .order('submitted_timestamp', { ascending: true })
      .limit(200);

    if (error) {
      console.error('Error fetching player data from Supabase. Supabase error details:', error);
      throw new Error(`Failed to fetch player leaderboard. Database select operation failed. Supabase message: ${error.message}. Check RLS policies and server logs.`);
    }

    if (!data || data.length === 0) {
      console.log('getPlayerLeaderboardAction: No data returned for player leaderboard from Supabase. This could be due to an empty table or RLS policies. If data exists, check RLS for anon role.');
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

    console.log(`getPlayerLeaderboardAction: Returning ${sortedPlayers.length} players for leaderboard.`);
    return sortedPlayers;

  } catch (error: any) {
    console.error('getPlayerLeaderboardAction: Caught error during or after Supabase select attempt. Full error:', error.message, error.stack);
    if (error.message.startsWith('Failed to fetch player leaderboard.') || error.message.startsWith('Server configuration error:')) {
        throw error;
    }
    throw new Error('Failed to fetch player leaderboard due to an unexpected server error during database operation. Check server logs.');
  }
}

export async function getGroupLeaderboardAction(limit: number = 10): Promise<GroupLeaderboardItem[]> {
  console.log('Server Action: getGroupLeaderboardAction called');
   if (!supabase) {
    console.error('getGroupLeaderboardAction: Supabase client is not initialized (hardcoded credentials). Returning empty leaderboard.');
    return [];
  }
  try {
    const { data, error } = await supabase
      .from(LEADERBOARD_TABLE_NAME)
      .select('id, username, group_name, game_id, game_name, score, submitted_timestamp')
      .order('score', { ascending: false })
      .order('submitted_timestamp', { ascending: true })
      .limit(300);

    if (error) {
      console.error('Error fetching group data from Supabase. Supabase error details:', error);
      throw new Error(`Failed to fetch group leaderboard. Database select operation failed. Supabase message: ${error.message}. Check RLS policies and server logs.`);
    }
     if (!data || data.length === 0) {
      console.log('getGroupLeaderboardAction: No data returned for group leaderboard from Supabase. This could be due to an empty table or RLS policies. If data exists, check RLS for anon role.');
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

    console.log(`getGroupLeaderboardAction: Returning ${sortedGroups.length} groups for leaderboard.`);
    return sortedGroups;
  } catch (error: any) {
    console.error('getGroupLeaderboardAction: Caught error during or after Supabase select attempt. Full error:', error.message, error.stack);
     if (error.message.startsWith('Failed to fetch group leaderboard.') || error.message.startsWith('Server configuration error:')) {
        throw error;
    }
    throw new Error('Failed to fetch group leaderboard due to an unexpected server error during database operation. Check server logs.');
  }
}
