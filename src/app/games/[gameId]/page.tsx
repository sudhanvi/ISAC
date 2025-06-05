'use client';

import { useParams } from 'next/navigation';
import Image from 'next/image';
import { miniGames } from '@/lib/data';
import CheerGeneratorForm from '@/components/CheerGeneratorForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import React, { useContext, useEffect, useState } from 'react';
import { ProgressContext } from '@/components/layout/MainLayout';


export default function MiniGamePage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const game = miniGames.find(g => g.id === gameId);
  const progressContext = useContext(ProgressContext);

  const [showCheerForm, setShowCheerForm] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const gameCompleted = isClient && progressContext?.isGameCompleted(gameId);

  if (!game) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold text-destructive font-headline">Game not found!</h1>
        <p className="text-muted-foreground">The game you are looking for does not exist.</p>
        <Button asChild className="mt-4">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" /> Go back to Games
          </Link>
        </Button>
      </div>
    );
  }

  const handleGameCompletion = () => {
    if (progressContext && !gameCompleted) {
      progressContext.completeGame(gameId);
    }
    setShowCheerForm(true); // Show form after "completing"
  };


  return (
    <div className="space-y-8">
      <Button variant="outline" asChild className="mb-6 group">
        <Link href="/">
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to All Games
        </Link>
      </Button>

      <Card className="overflow-hidden shadow-xl rounded-xl">
        <CardHeader className="p-0 relative">
          <div className="relative w-full h-64 md:h-80">
            <Image
              src={game.imagePlaceholder}
              alt={game.name}
              layout="fill"
              objectFit="cover"
              priority
              data-ai-hint={game.aiHint}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
          <div className="absolute bottom-0 left-0 p-6">
            <game.icon className="h-12 w-12 text-white mb-2 drop-shadow-lg" />
            <CardTitle className="font-headline text-4xl text-white drop-shadow-md">{game.name}</CardTitle>
            <CardDescription className="text-gray-200 text-lg drop-shadow-sm">{game.description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-6">
              <h2 className="text-2xl font-semibold font-headline text-primary">Game Arena</h2>
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center p-4">
                <p className="text-muted-foreground text-center">
                  This is the interactive area for {game.name}.<br />
                  Imagine exciting gameplay happening here!
                  <span role="img" aria-label="Sparkles" className="ml-1">✨</span>
                </p>
              </div>
              
              {!showCheerForm && !gameCompleted && (
                <Button 
                  onClick={handleGameCompletion} 
                  size="lg" 
                  className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
                >
                  Finish Game & Get Cheer!
                </Button>
              )}

              {gameCompleted && !showCheerForm && (
                 <div className="text-center p-4 border border-green-500 bg-green-50 rounded-md">
                    <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <p className="font-semibold text-green-700">You've already completed {game.name}!</p>
                    <Button 
                      onClick={() => setShowCheerForm(true)} 
                      variant="link"
                      className="text-primary hover:text-primary/80 mt-2"
                    >
                      Want another cheer message?
                    </Button>
                 </div>
              )}

            </div>
            <div className="md:col-span-1">
              {(showCheerForm || gameCompleted) && (
                <CheerGeneratorForm gameName={game.name} onCheerGenerated={() => {
                  // Optionally reset form or give feedback
                  if (progressContext && !gameCompleted) {
                     progressContext.completeGame(gameId);
                  }
                }} />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
