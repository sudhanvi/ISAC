
'use client';

import React, { useEffect, useState } from 'react';
import { PlayerLeaderboardItem, GroupLeaderboardItem } from '@/lib/data';
import { getPlayerLeaderboardAction, getGroupLeaderboardAction } from '@/app/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Users, Award } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function LeaderboardPage() {
  const [playerLeaderboard, setPlayerLeaderboard] = useState<PlayerLeaderboardItem[]>([]);
  const [groupLeaderboard, setGroupLeaderboard] = useState<GroupLeaderboardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLeaderboards() {
      setIsLoading(true);
      setError(null);
      try {
        const [players, groups] = await Promise.all([
          getPlayerLeaderboardAction(10),
          getGroupLeaderboardAction(10),
        ]);
        setPlayerLeaderboard(players);
        setGroupLeaderboard(groups);
      } catch (err) {
        console.error("Failed to fetch leaderboards:", err);
        setError("Could not load leaderboard data. Please try again later.");
        setPlayerLeaderboard([]);
        setGroupLeaderboard([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchLeaderboards();
  }, []);

  const renderSkeletons = (count: number, type: 'player' | 'group') => (
    Array.from({ length: count }).map((_, index) => (
      <TableRow key={`skeleton-${type}-${index}`}>
        <TableCell><Skeleton className="h-5 w-10 rounded" /></TableCell>
        <TableCell><Skeleton className="h-5 w-32 rounded" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-5 w-16 rounded ml-auto" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-5 w-24 rounded ml-auto" /></TableCell>
      </TableRow>
    ))
  );

  if (error) {
     return (
      <div className="space-y-8 text-center">
        <Button variant="outline" asChild className="mb-6 group absolute top-8 left-8">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to Home
          </Link>
        </Button>
        <h1 className="text-4xl font-bold font-headline text-primary pt-20">Leaderboards</h1>
        <p className="text-xl text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
       <Button variant="outline" asChild className="mb-6 group">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to Home
        </Link>
      </Button>
      <h1 className="text-4xl font-bold text-center font-headline text-primary">
        ISAC Studio Global Leaderboards
      </h1>
      <p className="text-xl text-center text-foreground/80">
        See who's topping the charts!
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card className="shadow-xl rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center font-headline text-2xl text-primary">
              <Users className="mr-3 h-7 w-7 text-accent" /> Top Players
            </CardTitle>
            <CardDescription>Individual player rankings based on total scores.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Rank</TableHead>
                    <TableHead>Player (X Username)</TableHead>
                    <TableHead className="text-right">Total Score</TableHead>
                    <TableHead className="text-right">Highest Single Game</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renderSkeletons(5, 'player')}
                </TableBody>
              </Table>
            ) : playerLeaderboard.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Rank</TableHead>
                    <TableHead>Player (X Username)</TableHead>
                    <TableHead className="text-right">Total Score</TableHead>
                    <TableHead className="text-right">Highest Single Game</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {playerLeaderboard.map((player, index) => (
                    <TableRow key={player.username}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{player.username}</TableCell>
                      <TableCell className="text-right">{player.totalScore}</TableCell>
                      <TableCell className="text-right">{player.highestScore} ({player.highestScoreGame})</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-4">No player scores recorded yet. Be the first!</p>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-xl rounded-xl">
          <CardHeader>
            <CardTitle className="flex items-center font-headline text-2xl text-primary">
              <Award className="mr-3 h-7 w-7 text-accent" /> Top K-Pop Groups
            </CardTitle>
            <CardDescription>Group rankings based on cumulative scores by their fans.</CardDescription>
          </CardHeader>
          <CardContent>
             {isLoading ? (
               <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Rank</TableHead>
                    <TableHead>Group (Fandom)</TableHead>
                    <TableHead className="text-right">Total Score</TableHead>
                    <TableHead className="text-right">Top Fan Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renderSkeletons(5, 'group')}
                </TableBody>
              </Table>
            ) : groupLeaderboard.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Rank</TableHead>
                    <TableHead>Group (Fandom)</TableHead>
                    <TableHead className="text-right">Total Score</TableHead>
                     <TableHead className="text-right">Top Fan Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groupLeaderboard.map((group, index) => (
                    <TableRow key={group.groupName}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        {group.groupName}
                        {group.fanbaseName && <span className="text-xs text-muted-foreground ml-1">({group.fanbaseName})</span>}
                      </TableCell>
                      <TableCell className="text-right">{group.totalScore}</TableCell>
                      <TableCell className="text-right">{group.highestScore} <span className="text-xs text-muted-foreground">by {group.highestScorePlayer}</span></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-4">No group scores recorded yet. Represent your group!</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
