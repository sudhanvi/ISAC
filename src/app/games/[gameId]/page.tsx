
'use client';

import { useParams } from 'next/navigation';
import Image from 'next/image';
import { miniGames, kpopGroups, addScoreToLeaderboard, fanbaseMap } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Trophy, Play, Info } from 'lucide-react';
import React, { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { ProgressContext } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { KpopArcheryGame } from '@/lib/game'; // Import the game class
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


export default function MiniGamePage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const gameDetails = miniGames.find(g => g.id === gameId); // Renamed to avoid conflict
  const progressContext = useContext(ProgressContext);
  const { toast } = useToast();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameInstanceRef = useRef<KpopArcheryGame | null>(null);

  const [isClient, setIsClient] = useState(false);
  const [username, setUsername] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [manualScore, setManualScore] = useState<number | ''>(''); // For manual score entry
  
  const [gameScore, setGameScore] = useState(0);
  const [arrowsLeft, setArrowsLeft] = useState(10);
  const [isGameActive, setIsGameActive] = useState(false);
  const [submittedScoreDetails, setSubmittedScoreDetails] = useState<{ score: number; username: string; group: string } | null>(null);
  const [isPreGame, setIsPreGame] = useState(true); // To show instructions/start button

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

  const gameCompleted = isClient && progressContext?.isGameCompleted(gameId);

  const handleScoreUpdate = useCallback((newScore: number) => {
    setGameScore(newScore);
  }, []);

  const handleArrowsUpdate = useCallback((newArrows: number) => {
    setArrowsLeft(newArrows);
  }, []);

  const handleGameOver = useCallback((finalScore: number, newBest: boolean) => {
    setIsGameActive(false);
    setManualScore(finalScore); // Pre-fill the manual score input with game score
    toast({
      title: "Game Over!",
      description: `You scored ${finalScore} points.${newBest ? " That's a new personal best for this game!" : ""}`,
      duration: 5000,
    });
    // The score submission form will now be visible
  }, [toast]);


  const startGame = () => {
    const finalGroup = newGroup.trim() || selectedGroup;
    if (!username.trim()) {
      toast({ title: "Details Needed", description: "Please enter your X username before starting.", variant: "destructive" });
      return;
    }
    if (!finalGroup) {
      toast({ title: "Details Needed", description: "Please select or enter your K-pop group before starting.", variant: "destructive" });
      return;
    }

    if (canvasRef.current) {
      if (gameInstanceRef.current) {
        gameInstanceRef.current.destroy(); // Clean up existing instance
      }
      const gameOptions = {
        onScoreUpdate: handleScoreUpdate,
        onArrowsUpdate: handleArrowsUpdate,
        onGameOver: handleGameOver,
      };
      gameInstanceRef.current = new KpopArcheryGame(canvasRef.current, gameOptions);
      gameInstanceRef.current.start();
      setIsGameActive(true);
      setIsPreGame(false);
      setSubmittedScoreDetails(null); // Clear previous submission details
      setGameScore(0); // Reset game score display
      setArrowsLeft(10); // Reset arrows display
    }
  };

  useEffect(() => {
    // Cleanup game instance on component unmount or if gameId changes
    return () => {
      if (gameInstanceRef.current) {
        gameInstanceRef.current.destroy();
        gameInstanceRef.current = null;
      }
    };
  }, [gameId]);


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
    const finalGroup = newGroup.trim() || selectedGroup;
    if (!username.trim()) {
      toast({ title: "Validation Error", description: "Please enter your X username.", variant: "destructive" });
      return;
    }
    if (!finalGroup) {
      toast({ title: "Validation Error", description: "Please select or enter your K-pop group.", variant: "destructive" });
      return;
    }
    if (manualScore === '' || isNaN(Number(manualScore)) || Number(manualScore) < 0) {
      toast({ title: "Validation Error", description: "Please enter a valid score (0 or higher).", variant: "destructive" });
      return;
    }

    const numericScore = Number(manualScore);

    addScoreToLeaderboard({ username: username.trim(), group: finalGroup, gameId, score: numericScore });
    if (progressContext && !gameCompleted) {
      progressContext.completeGame(gameId);
    }
    
    localStorage.setItem('isacStudioUsername', username.trim());
    localStorage.setItem('isacStudioGroup', finalGroup);

    setSubmittedScoreDetails({ score: numericScore, username: username.trim(), group: finalGroup });
    toast({ title: "Score Submitted!", description: `Your score of ${numericScore} for ${gameDetails.name} has been recorded.`, className: "bg-green-500 text-white" });
    setIsPreGame(true); // Go back to pre-game state for next round
  };

  const handlePlayAgain = () => {
    setSubmittedScoreDetails(null);
    setManualScore('');
    setIsPreGame(true); // Show instructions and start button
    setIsGameActive(false);
    if (gameInstanceRef.current) {
        gameInstanceRef.current.destroy(); // Properly destroy old game
        gameInstanceRef.current = null; 
    }
    // User details (username, group) remain for convenience
  };
  
  const displayGroup = newGroup.trim() || selectedGroup;

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
              src={gameDetails.imagePlaceholder}
              alt={gameDetails.name}
              layout="fill"
              objectFit="cover"
              priority
              data-ai-hint={gameDetails.aiHint}
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
          <div className="space-y-6">
             {/* User Details Form - Always visible before game starts or after submission */}
            { (isPreGame || submittedScoreDetails || (!isGameActive && !submittedScoreDetails) ) && !gameCompleted && (
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
            )}

            {/* Game Active UI or Score Submission Form */}
            {!submittedScoreDetails && !gameCompleted && !isPreGame && isGameActive && (
                 <div className="bg-primary/10 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-primary font-headline">SCORE: {gameScore}</p>
                    <p className="text-lg text-accent font-semibold">ARROWS: {arrowsLeft}</p>
                </div>
            )}

            {!submittedScoreDetails && !gameCompleted && !isPreGame && !isGameActive && ( // Show score form after game over
              <Card className="p-6 bg-muted/50">
                <CardTitle className="text-xl mb-4 font-headline text-primary">Submit Your Score</CardTitle>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="score" className="text-foreground/80">Your Score (from the game)</Label>
                    <Input id="score" type="number" value={manualScore} onChange={(e) => setManualScore(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Score from game" className="mt-1"/>
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
            )}


            {(submittedScoreDetails || gameCompleted) && (
              <div className="text-center p-6 border border-green-500 bg-green-50 rounded-xl shadow-lg">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
                <p className="text-2xl font-semibold text-green-700 font-headline">
                  {submittedScoreDetails ? `Score Submitted for ${gameDetails.name}!` : `You've already participated in ${gameDetails.name}!`}
                </p>
                {submittedScoreDetails && (
                  <>
                    <p className="text-lg text-green-600 mt-1">Player: {submittedScoreDetails.username}</p>
                    <p className="text-lg text-green-600">Group: {submittedScoreDetails.group}</p>
                    <p className="text-3xl font-bold text-accent my-3">{submittedScoreDetails.score} points</p>
                  </>
                )}
                 <p className="text-muted-foreground text-sm mt-2">
                  {gameCompleted && !submittedScoreDetails ? "Your previous participation is recorded." : "Thank you for participating!"}
                </p>
                <div className="mt-4 space-x-3">
                   <Button onClick={handlePlayAgain} variant="outline">
                      Play Again / Enter New Score
                   </Button>
                   <Button asChild>
                     <Link href="/leaderboard">View Leaderboards</Link>
                   </Button>
                </div>
              </div>
            )}

            <h2 className="text-2xl font-semibold font-headline text-primary mt-8">Game Arena</h2>
             {isPreGame && !submittedScoreDetails && !gameCompleted && (
                <div className="bg-muted rounded-lg flex flex-col items-center justify-center p-6 min-h-[400px] md:min-h-[600px] w-full aspect-video max-w-full mx-auto shadow-inner text-center">
                    <gameDetails.icon className="h-24 w-24 text-primary mb-6" />
                    <h3 className="text-3xl font-bold font-headline text-primary mb-4">Ready for {gameDetails.name}?</h3>
                    <p className="text-muted-foreground mb-6 max-w-md">
                        Make sure you've entered your X Username and K-Pop Group above.
                        Then, click Start Game to begin! Use <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Spacebar</kbd> or tap/click the screen to shoot.
                    </p>
                    <Button onClick={startGame} size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
                        <Play className="mr-2 h-6 w-6" /> Start Game
                    </Button>
                     <Alert variant="default" className="mt-6 max-w-md text-left bg-primary/5 text-primary border-primary/20">
                        <Info className="h-5 w-5 !text-primary" />
                        <AlertTitle className="font-semibold">AdMob Ads</AlertTitle>
                        <AlertDescription>
                            This game attempts to use AdMob rewarded ads if you run out of arrows. Ad functionality depends on proper AdMob SDK setup and ad availability.
                        </AlertDescription>
                    </Alert>
                </div>
            )}
            <div className={`bg-muted rounded-lg flex flex-col items-center justify-center p-1 min-h-[400px] md:min-h-[600px] w-full aspect-video max-w-full mx-auto shadow-inner ${isPreGame ? 'hidden' : ''}`}>
              <canvas ref={canvasRef} id="gameCanvas" className="border border-input rounded-lg w-full h-full max-w-full max-h-full"></canvas>
            </div>
            <div id="gameUIMessages" className="text-center mt-4">
               {/* In-game score and arrows are now displayed above the canvas when game is active */}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

