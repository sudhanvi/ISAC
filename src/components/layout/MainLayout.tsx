
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import GameProgressBar from '@/components/GameProgressBar';
import { totalGames, miniGames } from '@/lib/data'; // Added miniGames import
import { Button } from '@/components/ui/button';
import { Home, Trophy } from 'lucide-react'; // Added Trophy for leaderboard

export const ProgressContext = React.createContext<{
  completedGames: number;
  completeGame: (gameId: string) => void;
  isGameCompleted: (gameId: string) => boolean;
} | undefined>(undefined);


export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [completedGamesSet, setCompletedGamesSet] = useState<Set<string>>(new Set());
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const storedCompletedGames = localStorage.getItem('completedGames');
    if (storedCompletedGames) {
      setCompletedGamesSet(new Set(JSON.parse(storedCompletedGames)));
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('completedGames', JSON.stringify(Array.from(completedGamesSet)));
    }
  }, [completedGamesSet, isMounted]);

  const completeGame = useCallback((gameId: string) => {
    setCompletedGamesSet(prev => {
      const newSet = new Set(prev);
      newSet.add(gameId);
      return newSet;
    });
  }, []);

  const isGameCompleted = useCallback((gameId: string) => {
    return completedGamesSet.has(gameId);
  }, [completedGamesSet]);


  if (!isMounted) {
    // Avoid rendering content that relies on localStorage during SSR or initial client render before hydration
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link href="/" className="text-2xl font-bold font-headline text-primary hover:text-primary/80 transition-colors">
              ISAC Studio
            </Link>
            {/* Basic nav skeleton for loading state */}
            <nav className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-muted rounded-full animate-pulse"></div>
                <div className="h-8 w-8 bg-muted rounded-full animate-pulse"></div>
            </nav>
          </div>
        </header>
        <main className="flex-grow container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-muted rounded w-full mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-card p-6 rounded-lg shadow-lg h-48"></div>
              ))}
            </div>
          </div>
        </main>
        <footer className="py-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} ISAC Studio. All rights reserved.
        </footer>
      </div>
    );
  }
  
  return (
    <ProgressContext.Provider value={{ completedGames: completedGamesSet.size, completeGame, isGameCompleted }}>
      <div className="flex flex-col min-h-screen bg-background">
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <Link href="/" className="text-2xl font-bold font-headline text-primary hover:text-primary/80 transition-colors">
              ISAC Studio
            </Link>
            <nav className="flex items-center space-x-1">
              <Button variant="ghost" size="icon" asChild title="Home">
                <Link href="/">
                  <Home className="h-5 w-5 text-primary" />
                  <span className="sr-only">Home</span>
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild title="Leaderboards">
                <Link href="/leaderboard">
                  <Trophy className="h-5 w-5 text-primary" />
                  <span className="sr-only">Leaderboard</span>
                </Link>
              </Button>
            </nav>
          </div>
        </header>
        <main className="flex-grow container max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {miniGames.length > 1 && ( // Only show progress bar if multiple games exist
             <GameProgressBar currentProgress={completedGamesSet.size} totalGames={totalGames} className="mb-8" />
          )}
          {children}
        </main>
        <footer className="py-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} ISAC Studio. All rights reserved.
        </footer>
      </div>
    </ProgressContext.Provider>
  );
}

    