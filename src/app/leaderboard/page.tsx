
'use client';

import React, { useEffect, useState } from 'react';
import { getPlayerLeaderboard, getGroupLeaderboard, PlayerLeaderboardItem, GroupLeaderboardItem, fanbaseMap } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, Users, Award } from 'lucide-react';

export default function LeaderboardPage() {
  const [playerLeaderboard, setPlayerLeaderboard] = useState<PlayerLeaderboardItem[]>([]);
  const [groupLeaderboard, setGroupLeaderboard] = useState<GroupLeaderboardItem[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== 'undefined') {
      setPlayerLeaderboard(getPlayerLeaderboard(10));
      setGroupLeaderboard(getGroupLeaderboard(10));
    }
  }, []);

  if (!isClient) {
    // Optional: Render a loading state or null during SSR/pre-hydration
    return (
      <div className="space-y-8">
        <h1 className="text-4xl font-bold text-center font-headline text-primary">Leaderboards</h1>
        <p className="text-xl text-center text-foreground/80">Loading leaderboard data...</p>
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
        ISAC Studio Leaderboards
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
            {playerLeaderboard.length > 0 ? (
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
            {groupLeaderboard.length > 0 ? (
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

    