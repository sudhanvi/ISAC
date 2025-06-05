
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
import { KpopArcheryGame } from '@/lib/game'; // Ensure this path is correct
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
  const [manualScore, setManualScore] = useState<number | ''>(''); // Score from game, to be submitted
  
  // State for in-game UI, updated by callbacks from KpopArcheryGame
  const [gameScore, setGameScore] = useState(0);
  const [arrowsLeft, setArrowsLeft] = useState(10); // Initial arrows
  
  const [isGameActive, setIsGameActive] = useState(false); // True when canvas game is running
  const [submittedScoreDetails, setSubmittedScoreDetails] = useState<{ score: number; username: string; group: string } | null>(null);
  const [isPreGame, setIsPreGame] = useState(true); // True to show instructions/details form, false to show canvas

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

  // Callbacks for KpopArcheryGame
  const handleScoreUpdate = useCallback((newScore: number) => {
    setGameScore(newScore);
  }, []);

  const handleArrowsUpdate = useCallback((newArrows: number) => {
    setArrowsLeft(newArrows);
  }, []);

  const handleGameOver = useCallback((finalScore: number, isNewBest: boolean) => {
    setIsGameActive(false); // This will also trigger cleanup in the game start useEffect
    setManualScore(finalScore); // Set score for submission form
    toast({
      title: "Game Over!",
      description: `You scored ${finalScore} points.${isNewBest ? " That's a new personal best for this game!" : ""}`,
      duration: 5000,
    });
    // The UI will automatically switch to show the score submission form because isGameActive is false.
  }, [toast]);

  const isGameEffectivelyActive = useCallback(() => {
    return isGameActive;
  }, [isGameActive]);

  const gameOptions = useMemo(() => ({
    onScoreUpdate: handleScoreUpdate,
    onArrowsUpdate: handleArrowsUpdate,
    onGameOver: handleGameOver,
    isGameEffectivelyActive: isGameEffectivelyActive,
  }), [handleScoreUpdate, handleArrowsUpdate, handleGameOver, isGameEffectivelyActive]);


  // Function to start/initialize the game instance
  const initializeAndStartGame = useCallback(() => {
    if (canvasRef.current && !gameInstanceRef.current) {
      console.log("Initializing KpopArcheryGame instance via initializeAndStartGame");
      const personalBest = parseInt(localStorage.getItem(`bestScore_${gameId}`) || '0');
      gameInstanceRef.current = new KpopArcheryGame(canvasRef.current, gameOptions);
      gameInstanceRef.current.start(personalBest); // Pass initial best score
    } else if (gameInstanceRef.current && !isGameActive) {
      // If instance exists but game is not active (e.g., play again), restart it
      console.log("Restarting existing KpopArcheryGame instance.");
      const personalBest = parseInt(localStorage.getItem(`bestScore_${gameId}`) || '0');
      gameInstanceRef.current.start(personalBest);
    }
  }, [gameOptions, gameId, isGameActive]); // isGameActive is a crucial dependency here

  // Effect to initialize and manage the game when isPreGame becomes false and game is active
 useEffect(() => {
    if (!isPreGame && isGameActive) {
      initializeAndStartGame();
    }

    return () => {
      // Cleanup when isGameActive becomes false (e.g. gameOver, playAgain) OR component unmounts while game active
      if (gameInstanceRef.current && !isGameActive) { 
        console.log("Destroying KpopArcheryGame instance because isGameActive became false or component unmounting.");
        gameInstanceRef.current.destroy();
        gameInstanceRef.current = null;
      }
    };
  }, [isPreGame, isGameActive, initializeAndStartGame]);


  // Button handler to start the game
  const handleStartGameClick = () => {
    const finalGroup = newGroup.trim() || selectedGroup;
    if (!username.trim()) {
      toast({ title: "Details Needed", description: "Please enter your X username before starting.", variant: "destructive" });
      return;
    }
    if (!finalGroup) {
      toast({ title: "Details Needed", description: "Please select or enter your K-pop group before starting.", variant: "destructive" });
      return;
    }

    // If a game instance exists from a previous "Play Again" that wasn't fully cleaned up, destroy it.
    if (gameInstanceRef.current) {
        console.log("Destroying existing game instance before starting new one in handleStartGameClick");
        gameInstanceRef.current.destroy();
        gameInstanceRef.current = null;
    }

    setIsPreGame(false); // Trigger transition to game view
    setIsGameActive(true); // Indicate game is conceptually active
    setSubmittedScoreDetails(null); 
    setGameScore(0); 
    setArrowsLeft(10); 
    // The useEffect listening to isPreGame and isGameActive will call initializeAndStartGame
  };


  // Cleanup game instance on component unmount
  useEffect(() => {
    return () => {
      if (gameInstanceRef.current) {
        console.log("Destroying KpopArcheryGame instance due to component unmount.");
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

    // Update personal best score for this specific game
    const currentBest = parseInt(localStorage.getItem(`bestScore_${gameId}`) || '0');
    if (numericScore > currentBest) {
        localStorage.setItem(`bestScore_${gameId}`, numericScore.toString());
    }

    addScoreToLeaderboard({ username: username.trim(), group: finalGroup, gameId, score: numericScore });
    if (progressContext && !gameCompleted) {
      progressContext.completeGame(gameId);
    }
    
    localStorage.setItem('isacStudioUsername', username.trim());
    localStorage.setItem('isacStudioGroup', finalGroup);

    setSubmittedScoreDetails({ score: numericScore, username: username.trim(), group: finalGroup });
    toast({ title: "Score Submitted!", description: `Your score of ${numericScore} for ${gameDetails.name} has been recorded.`, className: "bg-green-500 text-white" });
    setIsPreGame(true); 
    // isGameActive should already be false from handleGameOver callback
  };

  const handlePlayAgain = () => {
    setSubmittedScoreDetails(null);
    setManualScore('');
    // Setting isGameActive to false will trigger the cleanup in the useEffect
    setIsGameActive(false); 
    // Setting isPreGame to true will hide the canvas and show instructions/player details form again.
    // The Start Game button will then re-initialize everything.
    setIsPreGame(true);
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
            {/* Player Details Form - Show if pre-game, or if score submitted (to allow re-entry for new game) or if game just ended but no score yet */}
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

            {/* In-Game UI Display - Show only when game is active and not in pre-game */}
            {!isPreGame && isGameActive && (
                 <div className="bg-primary/10 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-primary font-headline">SCORE: {gameScore}</p>
                    <p className="text-lg text-accent font-semibold">ARROWS: {arrowsLeft}</p>
                </div>
            )}

            {/* Score Submission Form - Show if game is NOT active, NOT pre-game, and no score has been submitted yet */}
            {!isGameActive && !isPreGame && !submittedScoreDetails && !gameCompleted && ( 
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


            {/* Submitted Score / Game Completed Display */}
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

            {/* Game Arena Section */}
            <h2 className="text-2xl font-semibold font-headline text-primary mt-8">Game Arena</h2>
            
            {/* Pre-Game Instructions / Start Button */}
             {isPreGame && !submittedScoreDetails && !gameCompleted && (
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
                            This game attempts to use AdMob rewarded ads if you run out of arrows. Ad functionality depends on proper AdMob SDK setup and ad availability.
                        </AlertDescription>
                    </Alert>
                </div>
            )}

            {/* Canvas Container - Show when not in pre-game */}
            <div className={`bg-muted rounded-lg flex flex-col items-center justify-center p-1 min-h-[400px] md:min-h-[600px] w-full aspect-video max-w-full mx-auto shadow-inner ${isPreGame ? 'hidden' : ''}`}>
              <canvas ref={canvasRef} id="gameCanvas" className="border border-input rounded-lg w-full h-full max-w-full max-h-full"></canvas>
            </div>
            {/* This div was used in original HTML for game messages, can be repurposed or removed if React handles all messages */}
            <div id="gameUIMessages" className="text-center mt-4">
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
