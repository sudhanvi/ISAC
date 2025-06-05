
'use client';

import { useParams } from 'next/navigation';
import Image from 'next/image';
import { miniGames, kpopGroups, addScoreToLeaderboard, fanbaseMap } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Trophy, Play, Info } from 'lucide-react';
import React, { useContext, useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { ProgressContext } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { KpopArcheryGame } from '@/lib/game';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


export default function MiniGamePage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const gameDetails = miniGames.find(g => g.id === gameId);
  const progressContext = useContext(ProgressContext);
  const { toast } = useToast();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameInstanceRef = useRef<KpopArcheryGame | null>(null);

  const [isClient, setIsClient] = useState(false);
  const [username, setUsername] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [manualScore, setManualScore] = useState<number | ''>('');

  const [gameScore, setGameScore] = useState(0);
  const [arrowsLeft, setArrowsLeft] = useState(10);

  const [isGameActive, setIsGameActive] = useState(false);
  const [submittedScoreDetails, setSubmittedScoreDetails] = useState<{ score: number; username: string; group: string } | null>(null);
  const [isPreGame, setIsPreGame] = useState(true);


  useEffect(() => {
    setIsClient(true);
    const storedUsername = localStorage.getItem('isacStudioUsername');
    if (storedUsername) setUsername(storedUsername);
    const storedGroup = localStorage.getItem('isacStudioGroup');
    if (storedGroup) {
      if (kpopGroups.includes(storedGroup)) {
        setSelectedGroup(storedGroup);
      } else {
        setNewGroup(storedGroup);
      }
    }
  }, []);

  const handleScoreUpdate = useCallback((newScore: number) => {
    console.log("React: KpopArcheryGame score update:", newScore);
    setGameScore(newScore);
  }, []);

  const handleArrowsUpdate = useCallback((newArrows: number) => {
    console.log("React: KpopArcheryGame arrows update:", newArrows);
    setArrowsLeft(newArrows);
  }, []);

  const handleGameOver = useCallback((finalScore: number, isNewBest: boolean) => {
    console.log("React: KpopArcheryGame handleGameOver called with score", finalScore, "isNewBest", isNewBest);
    setIsGameActive(false); // Crucial: Mark game as inactive
    setManualScore(finalScore); // Pre-fill submission form for current score

    if (isNewBest && gameId) {
        localStorage.setItem(`bestScore_${gameId}`, finalScore.toString());
        console.log(`React: New personal best FOR GAME ${gameId} saved: ${finalScore}`);
    }

    toast({
      title: "Game Over!",
      description: `You scored ${finalScore} points.${isNewBest ? " That's a new personal best for this game!" : ""}`,
      duration: 5000,
    });
  }, [toast, gameId]);


  const isGameEffectivelyActive = useCallback(() => {
    return isGameActive;
  }, [isGameActive]);

  const gameOptions = useMemo(() => ({
    onScoreUpdate: handleScoreUpdate,
    onArrowsUpdate: handleArrowsUpdate,
    onGameOver: handleGameOver,
    isGameEffectivelyActive: isGameEffectivelyActive,
  }), [handleScoreUpdate, handleArrowsUpdate, handleGameOver, isGameEffectivelyActive]);


  const initializeAndStartGame = useCallback(() => {
    if (canvasRef.current && !gameInstanceRef.current && gameId) {
      console.log("React: Initializing KpopArcheryGame instance via initializeAndStartGame.");
      const personalBest = parseInt(localStorage.getItem(`bestScore_${gameId}`) || '0');
      gameInstanceRef.current = new KpopArcheryGame(canvasRef.current, gameOptions);
      gameInstanceRef.current.start(personalBest);
    } else if (gameInstanceRef.current && !isGameActive && gameId) {
      console.log("React: Attempting to restart existing KpopArcheryGame instance.");
      const personalBest = parseInt(localStorage.getItem(`bestScore_${gameId}`) || '0');
      gameInstanceRef.current.start(personalBest);
    }
  }, [gameOptions, gameId, isGameActive]);

 useEffect(() => {
    console.log(`React Effect: isPreGame=${isPreGame}, isGameActive=${isGameActive}`);
    if (!isPreGame && isGameActive) {
      console.log("React Effect: Conditions met to initialize and start game (isPreGame=false, isGameActive=true).");
      initializeAndStartGame();
    }

    return () => {
      if (gameInstanceRef.current && (!isGameActive || isPreGame)) { // Ensure cleanup if game is no longer active OR if we go back to pregame
        console.log("React Effect Cleanup: Destroying KpopArcheryGame instance because isGameActive became false OR isPreGame became true OR component unmounting.");
        gameInstanceRef.current.destroy();
        gameInstanceRef.current = null;
      }
    };
  }, [isPreGame, isGameActive, initializeAndStartGame]);


  const handleStartGameClick = () => {
    console.log("React: handleStartGameClick triggered.");
    const finalGroup = newGroup.trim() || selectedGroup;
    if (!username.trim()) {
      toast({ title: "Details Needed", description: "Please enter your X username before starting.", variant: "destructive" });
      return;
    }
    if (!finalGroup) {
      toast({ title: "Details Needed", description: "Please select or enter your K-pop group before starting.", variant: "destructive" });
      return;
    }

    if (gameInstanceRef.current) {
        console.log("React: handleStartGameClick - Destroying existing game instance before starting new one.");
        gameInstanceRef.current.destroy();
        gameInstanceRef.current = null;
    }
    
    localStorage.setItem('isacStudioUsername', username.trim());
    localStorage.setItem('isacStudioGroup', finalGroup);

    setIsPreGame(false);
    setIsGameActive(true); // This will trigger the useEffect to initialize the game
    setSubmittedScoreDetails(null); // Clear any previous submission details
    setGameScore(0); // Reset game specific states
    setArrowsLeft(10);
    setManualScore(''); // Clear manual score input from any previous game over
    console.log("React: handleStartGameClick - Set isPreGame=false, isGameActive=true. Game should start via useEffect.");
  };

  useEffect(() => {
    // Component unmount cleanup
    return () => {
      if (gameInstanceRef.current) {
        console.log("React Component Unmount: Destroying KpopArcheryGame instance.");
        gameInstanceRef.current.destroy();
        gameInstanceRef.current = null;
      }
    };
  }, []);

  if (!gameDetails) {
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

  const handleScoreSubmit = () => {
    console.log("React: handleScoreSubmit triggered.");
    const finalUsername = username.trim();
    const finalGroup = newGroup.trim() || selectedGroup;

    if (!finalUsername) {
      toast({ title: "Validation Error", description: "X username is missing. Please ensure it's entered.", variant: "destructive" });
      return;
    }
    if (!finalGroup) {
      toast({ title: "Validation Error", description: "K-pop group is missing. Please ensure it's selected or entered.", variant: "destructive" });
      return;
    }
    if (manualScore === '' || isNaN(Number(manualScore)) || Number(manualScore) < 0) {
      toast({ title: "Validation Error", description: "Please enter a valid score (0 or higher). This should be pre-filled from the game.", variant: "destructive" });
      return;
    }

    const numericScore = Number(manualScore);

    addScoreToLeaderboard({ username: finalUsername, group: finalGroup, gameId, score: numericScore });
    if (progressContext && !progressContext.isGameCompleted(gameId)) {
      progressContext.completeGame(gameId);
      console.log(`React: Game ${gameId} marked as completed in context for global progress.`);
    }
    
    // Persist username and group for next time
    localStorage.setItem('isacStudioUsername', finalUsername);
    localStorage.setItem('isacStudioGroup', finalGroup);

    setSubmittedScoreDetails({ score: numericScore, username: finalUsername, group: finalGroup });
    toast({ title: "Score Submitted!", description: `Your score of ${numericScore} for ${gameDetails.name} has been recorded for the leaderboards.`, className: "bg-green-500 text-white" });
    
    // No need to set isGameActive to false, it should already be false from handleGameOver
    // No need to set isPreGame to true yet, submittedScoreDetails will control the UI first
    console.log("React: handleScoreSubmit - Score submitted. submittedScoreDetails is now set.");
  };

  const handlePlayAgain = () => {
    console.log("React: handlePlayAgain triggered.");
    if (gameInstanceRef.current) {
        console.log("React: handlePlayAgain - Destroying active game instance if any.");
        gameInstanceRef.current.destroy();
        gameInstanceRef.current = null;
    }

    setSubmittedScoreDetails(null);
    setManualScore('');
    setGameScore(0);
    setArrowsLeft(10);
    setIsGameActive(false); // Ensure game is not active
    setIsPreGame(true);     // Go back to pre-game setup

    console.log("React: handlePlayAgain - States reset. isPreGame=true, isGameActive=false. Player forms should re-appear.");
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
              src="/assets/banner.png"
              alt="Game Banner"
              layout="fill"
              objectFit="cover"
              data-ai-hint="game banner"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
          <div className="absolute bottom-0 left-0 p-6">
            <gameDetails.icon className="h-12 w-12 text-white mb-2 drop-shadow-lg" />
            <CardTitle className="font-headline text-4xl text-white drop-shadow-md">{gameDetails.name}</CardTitle>
            <CardDescription className="text-gray-200 text-lg drop-shadow-sm">{gameDetails.description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          {submittedScoreDetails ? (
            // Screen 1: Score has been submitted for THIS play session
            <div className="text-center p-6 border border-green-500 bg-green-50 rounded-xl shadow-lg">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <p className="text-2xl font-semibold text-green-700 font-headline">
                Score Submitted for {gameDetails.name}!
              </p>
              <p className="text-lg text-green-600 mt-1">Player: {submittedScoreDetails.username}</p>
              <p className="text-lg text-green-600">Group: {submittedScoreDetails.group}</p>
              <p className="text-3xl font-bold text-accent my-3">{submittedScoreDetails.score} points</p>
              <p className="text-muted-foreground text-sm mt-2">Thank you for participating!</p>
              <div className="mt-4 space-x-3">
                 <Button onClick={handlePlayAgain} variant="outline">
                    Play Again
                 </Button>
                 <Button asChild>
                   <Link href="/leaderboard">View Leaderboards</Link>
                 </Button>
              </div>
            </div>
          ) : isPreGame ? (
            // Screen 2: Pre-game state (initial load or after "Play Again")
            <div className="space-y-6">
              <Card className="p-6 bg-muted/50">
                <CardTitle className="text-xl mb-4 font-headline text-primary">Player Details</CardTitle>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="username" className="text-foreground/80">X Username</Label>
                    <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@yourusername" className="mt-1"/>
                  </div>
                  <div>
                    <Label htmlFor="groupSelect" className="text-foreground/80">Select Your K-pop Group</Label>
                    <Select value={selectedGroup} onValueChange={(value) => { setSelectedGroup(value); setNewGroup(''); }}>
                      <SelectTrigger id="groupSelect" className="mt-1">
                        <SelectValue placeholder="-- Select Your Group --" />
                      </SelectTrigger>
                      <SelectContent>
                        {kpopGroups.map(groupName => (
                          <SelectItem key={groupName} value={groupName}>{groupName} ({fanbaseMap[groupName] || 'N/A'})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="newGroup" className="text-foreground/80">Or Enter New Group Name</Label>
                    <Input id="newGroup" value={newGroup} onChange={(e) => { setNewGroup(e.target.value); if (e.target.value) setSelectedGroup(''); }} placeholder="If not in list or for sub-units" className="mt-1"/>
                  </div>
                </div>
              </Card>
              <div className="bg-muted rounded-lg flex flex-col items-center justify-center p-6 min-h-[400px] md:min-h-[600px] w-full aspect-video max-w-full mx-auto shadow-inner text-center">
                <gameDetails.icon className="h-24 w-24 text-primary mb-6" />
                <h3 className="text-3xl font-bold font-headline text-primary mb-4">Ready for {gameDetails.name}?</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Make sure you've entered your X Username and K-Pop Group above.
                  Then, click Start Game to begin! Use <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Spacebar</kbd> or tap/click the screen to shoot.
                </p>
                <Button onClick={handleStartGameClick} size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
                  <Play className="mr-2 h-6 w-6" /> Start Game
                </Button>
                <Alert variant="default" className="mt-6 max-w-md text-left bg-primary/5 text-primary border-primary/20">
                  <Info className="h-5 w-5 !text-primary" />
                  <AlertTitle className="font-semibold">AdMob Ads</AlertTitle>
                  <AlertDescription>
                    This game may display non-personalized ads from Google AdMob. By playing, you consent to this.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          ) : isGameActive ? (
            // Screen 3: Game is Active
            <div className="space-y-4">
              <div className="bg-primary/10 p-4 rounded-lg text-center">
                <p className="text-2xl font-bold text-primary font-headline">SCORE: {gameScore}</p>
                <p className="text-lg text-accent font-semibold">ARROWS: {arrowsLeft}</p>
              </div>
              <div className={`bg-muted rounded-lg flex flex-col items-center justify-center p-1 min-h-[400px] md:min-h-[600px] w-full aspect-video max-w-full mx-auto shadow-inner`}>
                <canvas ref={canvasRef} id="gameCanvas" className="border border-input rounded-lg w-full h-full max-w-full max-h-full"></canvas>
              </div>
            </div>
          ) : ( // Screen 4: Game just ended, ready to submit score for THIS session
            <div className="space-y-6">
              <Card className="p-6 bg-muted/50">
                  <CardTitle className="text-xl mb-4 font-headline text-primary">Game Over! Submit Your Score</CardTitle>
                  <div className="space-y-2 mb-4">
                    <p><span className="font-semibold">Player:</span> {username}</p>
                    <p><span className="font-semibold">Group:</span> {newGroup.trim() || selectedGroup || 'N/A'}</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="score" className="text-foreground/80">Your Score (from the game)</Label>
                      <Input id="score" type="number" value={manualScore} onChange={(e) => setManualScore(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Score from game" className="mt-1" readOnly={true} />
                       <p className="text-xs text-muted-foreground mt-1">Score is pre-filled from the game. Click submit to record.</p>
                    </div>
                    <Button
                      onClick={handleScoreSubmit}
                      size="lg"
                      className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
                    >
                      <Trophy className="mr-2 h-5 w-5" /> Submit Score
                    </Button>
                  </div>
                </Card>
                 <div className="text-center mt-4">
                    <Button onClick={handlePlayAgain} variant="outline">
                        Or Play Again Without Submitting
                    </Button>
                </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
