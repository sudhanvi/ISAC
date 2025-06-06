
'use client';

import { useParams } from 'next/navigation';
import { miniGames, kpopGroups, fanbaseMap } from '@/lib/data';
import { addScoreToLeaderboardAction, AddScorePayload } from '@/app/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Trophy, Play, RotateCcw } from 'lucide-react'; // Changed Play icon
import React, { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { ProgressContext } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { KpopArcheryGame } from '@/lib/game'; // Import the new game class
import Image from 'next/image';
import AdSenseUnit from '@/components/AdSenseUnit';
import RotateDevicePrompt from '@/components/RotateDevicePrompt';

// Define IDs for DOM elements the game will manipulate
const GAME_CANVAS_ID = "gameCanvas";
const SCORE_DISPLAY_ID = "gameScoreDisplay";
const ARROWS_DISPLAY_ID = "gameArrowsDisplay";
const BEST_SCORE_DISPLAY_ID = "gameBestScoreDisplay";
const GAME_USERNAME_INPUT_ID = "gameUsernameInput";
const GAME_GROUP_SELECT_ID = "gameGroupSelect";
const GAME_NEW_GROUP_INPUT_ID = "gameNewGroupInput";
const GAME_START_MENU_ID = "gameStartMenu";
const GAME_START_MENU_TITLE_ID = "gameStartMenuTitle";
const GAME_PLAYER_LEADERBOARD_LIST_ID = "gamePlayerLeaderboardList";
const GAME_GROUP_LEADERBOARD_LIST_ID = "gameGroupLeaderboardList";


export default function MiniGamePage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const gameDetails = miniGames.find(g => g.id === gameId);
  const progressContext = useContext(ProgressContext);
  const { toast } = useToast();

  const gameInstanceRef = useRef<KpopArcheryGame | null>(null);
  
  // Refs for DOM elements the game will interact with
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const groupSelectRef = useRef<HTMLSelectElement>(null); // Assuming it becomes a real select
  const newGroupInputRef = useRef<HTMLInputElement>(null);


  const [isClient, setIsClient] = useState(false);
  const [username, setUsername] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [newGroup, setNewGroup] = useState('');
  
  const [gameFinalScore, setGameFinalScore] = useState<number | null>(null);

  const [isGameScreenActive, setIsGameScreenActive] = useState(false); // To show game canvas and hide other UI
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedScoreDetails, setSubmittedScoreDetails] = useState<{ score: number; username: string; group: string } | null>(null);
  const [showRotatePrompt, setShowRotatePrompt] = useState(false);


  useEffect(() => {
    setIsClient(true);
    const storedUsername = localStorage.getItem('isacStudioUsername');
    if (storedUsername) setUsername(storedUsername);
    const storedGroup = localStorage.getItem('isacStudioGroup');
    if (storedGroup) {
      if (kpopGroups.includes(storedGroup)) setSelectedGroup(storedGroup);
      else setNewGroup(storedGroup);
    }
  }, []);

  useEffect(() => {
    if (!isClient) return;
    const handleOrientationChange = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      const isLikelyMobile = window.matchMedia("(max-width: 767px)").matches;
      setShowRotatePrompt(isGameScreenActive && isPortrait && isLikelyMobile);
    };
    handleOrientationChange();
    window.addEventListener('resize', handleOrientationChange);
    window.addEventListener('orientationchange', handleOrientationChange);
    return () => {
      window.removeEventListener('resize', handleOrientationChange);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [isClient, isGameScreenActive]);


  const handleGameIsOver = useCallback((finalScore: number, isNewBest: boolean) => {
    console.log("MiniGamePage: Game over callback triggered by game.js. Score:", finalScore);
    setGameFinalScore(finalScore);
    setIsGameScreenActive(false); // Hide fullscreen game canvas, show score submission UI

    // The new game.js handles its own start menu and local leaderboards display.
    // We need to ensure our React UI for score submission is shown.
    // The game.js shows a menu with id 'gameStartMenu'. We might want to hide it or integrate.

    const gameStartMenuDOM = document.getElementById(GAME_START_MENU_ID);
    if (gameStartMenuDOM) gameStartMenuDOM.style.display = 'none'; // Hide game's own menu

    toast({
      title: "Game Over!",
      description: `You scored ${finalScore} points.${isNewBest ? " That's a new personal best for this game!" : ""}`,
      duration: 5000,
    });
  }, [toast]);


  const startGame = () => {
    const finalGroup = newGroup.trim() || selectedGroup;
    if (!username.trim()) {
      toast({ title: "Details Needed", description: "Please enter your X username.", variant: "destructive" });
      return;
    }
    if (!finalGroup) {
      toast({ title: "Details Needed", description: "Please select or enter your K-pop group.", variant: "destructive" });
      return;
    }

    localStorage.setItem('isacStudioUsername', username.trim());
    localStorage.setItem('isacStudioGroup', finalGroup);
    localStorage.setItem('bestArcheryScorePriorToThisGame', localStorage.getItem('bestArcheryScore') || '0');


    setIsGameScreenActive(true); // Show game UI layer
    setSubmittedScoreDetails(null);
    setGameFinalScore(null);

    // Ensure DOM elements for game's UI are ready
    setTimeout(() => {
        const canvasElement = document.getElementById(GAME_CANVAS_ID);
        if (!canvasElement) {
            console.error("startGame: Canvas element not found in DOM for game.js");
            setIsGameScreenActive(false);
            toast({title: "Error", description: "Game canvas could not be initialized.", variant: "destructive"});
            return;
        }

        const uiElements = {
            scoreDisplay: document.getElementById(SCORE_DISPLAY_ID),
            arrowsDisplay: document.getElementById(ARROWS_DISPLAY_ID),
            bestScoreDisplay: document.getElementById(BEST_SCORE_DISPLAY_ID),
            usernameInput: document.getElementById(GAME_USERNAME_INPUT_ID) as HTMLInputElement | null,
            groupSelect: document.getElementById(GAME_GROUP_SELECT_ID) as HTMLSelectElement | null,
            newGroupInput: document.getElementById(GAME_NEW_GROUP_INPUT_ID) as HTMLInputElement | null,
            fanbaseMap: fanbaseMap,
            onGameOverCallback: handleGameIsOver, // Pass the callback
        };

        // Populate hidden inputs for the game's localStorage leaderboards
        if (uiElements.usernameInput) uiElements.usernameInput.value = username.trim();
        if (uiElements.newGroupInput) uiElements.newGroupInput.value = newGroup.trim();
        if (uiElements.groupSelect) { // Crude way to set select for game.js
            uiElements.groupSelect.innerHTML = `<option value="${selectedGroup}">${selectedGroup}</option>`;
            uiElements.groupSelect.value = selectedGroup;
        }


        if (gameInstanceRef.current) {
            gameInstanceRef.current.destroy();
        }
        
        gameInstanceRef.current = new KpopArcheryGame(GAME_CANVAS_ID, uiElements);
        if (gameInstanceRef.current.isErrorState) {
             console.error("Failed to initialize KpopArcheryGame instance from page.tsx");
             setIsGameScreenActive(false);
             toast({title: "Error", description: "Failed to initialize game engine.", variant: "destructive"});
             return;
        }
        gameInstanceRef.current.start(); // Use the new start method
        console.log("MiniGamePage: New KpopArcheryGame started.");
    }, 100); // Timeout to ensure DOM elements are rendered
  };

  useEffect(() => {
    return () => {
      if (gameInstanceRef.current) {
        gameInstanceRef.current.destroy();
        gameInstanceRef.current = null;
      }
    };
  }, []);

  const handleScoreSubmit = async () => {
    const finalUsername = username.trim(); // Username from React state
    const finalGroup = (newGroup.trim() || selectedGroup).trim(); // Group from React state

    if (!finalUsername) {
      toast({ title: "Validation Error", description: "X username is missing.", variant: "destructive" });
      return;
    }
    if (!finalGroup) {
      toast({ title: "Validation Error", description: "K-pop group is missing.", variant: "destructive" });
      return;
    }
    if (gameFinalScore === null || gameFinalScore < 0) {
      toast({ title: "Validation Error", description: "Invalid score.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: AddScorePayload = {
        username: finalUsername,
        group: finalGroup,
        gameId,
        score: gameFinalScore,
      };
      await addScoreToLeaderboardAction(payload);

      if (progressContext && !progressContext.isGameCompleted(gameId)) {
        progressContext.completeGame(gameId);
      }
      
      setSubmittedScoreDetails({ score: gameFinalScore, username: finalUsername, group: finalGroup });
      toast({ title: "Score Submitted!", description: `Your score of ${gameFinalScore} for ${gameDetails.name} has been recorded for global leaderboards.`, className: "bg-green-500 text-white" });
    } catch (error: any) {
      console.error("Failed to submit score:", error);
      const errorMessage = error.message || "Could not submit score to the server.";
      toast({ title: "Submission Error", description: errorMessage, variant: "destructive", duration: 7000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlayAgain = () => {
    if (gameInstanceRef.current) {
        gameInstanceRef.current.destroy();
        gameInstanceRef.current = null;
    }
    setSubmittedScoreDetails(null);
    setGameFinalScore(null);
    setIsGameScreenActive(false); // Go back to pre-game setup screen
    // The new game.js also shows a start menu, which we are trying to control/hide.
    const gameStartMenuDOM = document.getElementById(GAME_START_MENU_ID);
    if (gameStartMenuDOM) gameStartMenuDOM.style.display = 'none';
  };
  

  if (!gameDetails) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-bold text-destructive font-headline">Game not found!</h1>
        <Button asChild className="mt-4"><Link href="/"><ArrowLeft className="mr-2 h-4 w-4" />Go back</Link></Button>
      </div>
    );
  }

  // Render layer for game's DOM elements (canvas and UI pieces it controls)
  const GameLayer = () => (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 100, background:'hsl(var(--background))' }} className={showRotatePrompt ? 'opacity-20 pointer-events-none' : ''}>
      <canvas id={GAME_CANVAS_ID} style={{ display: 'block', width: '100%', height: '100%' }}></canvas>
      {/* Hidden elements for game.js to update, and for its leaderboards */}
      <div style={{ display: 'none' }}>
        <span id={SCORE_DISPLAY_ID}></span>
        <span id={ARROWS_DISPLAY_ID}></span>
        <span id={BEST_SCORE_DISPLAY_ID}></span>
        <input id={GAME_USERNAME_INPUT_ID} ref={usernameInputRef} readOnly />
        <select id={GAME_GROUP_SELECT_ID} ref={groupSelectRef as any} readOnly></select>
        <input id={GAME_NEW_GROUP_INPUT_ID} ref={newGroupInputRef} readOnly />
        <div id={GAME_START_MENU_ID} style={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'white', padding: '20px', borderRadius: '8px', textAlign: 'center', display:'none', zIndex: 110}}>
            <h1 id={GAME_START_MENU_TITLE_ID}>Game Over</h1>
            <p>Your Score: {gameFinalScore ?? gameInstanceRef.current?.score}</p>
            <button onClick={() => {
                const menu = document.getElementById(GAME_START_MENU_ID);
                if (menu) menu.style.display = 'none';
                handlePlayAgain(); // Use React's play again
            }} style={{marginTop: '10px', padding: '10px 20px'}}>Play Again (Game Menu)</button>
             <div>
                <h3 style={{marginTop: '10px'}}>Local Players</h3>
                <ul id={GAME_PLAYER_LEADERBOARD_LIST_ID} style={{listStyle:'none', padding:0}}></ul>
                <h3 style={{marginTop: '10px'}}>Local Groups</h3>
                <ul id={GAME_GROUP_LEADERBOARD_LIST_ID} style={{listStyle:'none', padding:0}}></ul>
            </div>
        </div>
      </div>
       {showRotatePrompt && <RotateDevicePrompt />}
    </div>
  );


  return (
    <div className="space-y-8 relative">
      {isGameScreenActive && <GameLayer />}

      <div className={isGameScreenActive ? 'opacity-0 pointer-events-none h-0 overflow-hidden' : ''}> {/* Hide normal UI when game is active */}
        <Button variant="outline" asChild className="mb-6 group">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
            Back to All Games
          </Link>
        </Button>

        <Card className="overflow-hidden shadow-xl rounded-xl">
          <CardHeader className="p-0 relative">
            <div className="relative w-full h-64 md:h-80">
              <Image src="/assets/banner.png" alt="Game Banner" layout="fill" objectFit="cover" data-ai-hint="game banner" priority />
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
              <div className="text-center p-6 border border-green-500 bg-green-50 rounded-xl shadow-lg">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
                <p className="text-2xl font-semibold text-green-700 font-headline">Score Submitted!</p>
                <p className="text-lg text-green-600 mt-1">Player: {submittedScoreDetails.username}</p>
                <p className="text-lg text-green-600">Group: {submittedScoreDetails.group}</p>
                <p className="text-3xl font-bold text-accent my-3">{submittedScoreDetails.score} points</p>
                <div className="mt-4 space-x-3">
                  <Button onClick={handlePlayAgain} variant="outline" disabled={isSubmitting}>Play Again</Button>
                  <Button asChild disabled={isSubmitting}><Link href="/leaderboard">View Leaderboards</Link></Button>
                </div>
              </div>
            ) : gameFinalScore !== null ? ( // Game is over, show score submission UI
                 <Card className="p-6 bg-muted/50">
                    <CardTitle className="text-xl mb-4 font-headline text-primary">Game Over! Submit Your Score</CardTitle>
                    <div className="space-y-2 mb-4">
                      <p><span className="font-semibold">Player:</span> {username}</p>
                      <p><span className="font-semibold">Group:</span> {newGroup.trim() || selectedGroup || 'N/A'}</p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="score" className="text-foreground/80">Your Score</Label>
                        <Input id="score" type="number" value={gameFinalScore ?? ''} readOnly className="mt-1" />
                      </div>
                      <Button onClick={handleScoreSubmit} size="lg" className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground font-semibold" disabled={isSubmitting}>
                        {isSubmitting ? 'Submitting...' : <><Trophy className="mr-2 h-5 w-5" /> Submit Score</>}
                      </Button>
                    </div>
                     <div className="text-center mt-4">
                        <Button onClick={handlePlayAgain} variant="outline" disabled={isSubmitting}>Play Again Without Submitting</Button>
                    </div>
                  </Card>
            ) : ( // Pre-game setup UI
              <div className="space-y-6">
                <Card className="p-6 bg-muted/50">
                  <CardTitle className="text-xl mb-4 font-headline text-primary">Player Details</CardTitle>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="username-setup" className="text-foreground/80">X Username</Label>
                      <Input id="username-setup" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@yourusername" className="mt-1"/>
                    </div>
                    <div>
                      <Label htmlFor="groupSelect-setup" className="text-foreground/80">Select Your K-pop Group</Label>
                      <Select value={selectedGroup} onValueChange={(value) => { setSelectedGroup(value); setNewGroup(''); }}>
                        <SelectTrigger id="groupSelect-setup" className="mt-1"><SelectValue placeholder="-- Select Your Group --" /></SelectTrigger>
                        <SelectContent>{kpopGroups.map(gn => (<SelectItem key={gn} value={gn}>{gn} ({fanbaseMap[gn] || 'N/A'})</SelectItem>))}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="newGroup-setup" className="text-foreground/80">Or Enter New Group Name</Label>
                      <Input id="newGroup-setup" value={newGroup} onChange={(e) => { setNewGroup(e.target.value); if (e.target.value) setSelectedGroup(''); }} placeholder="If not in list" className="mt-1"/>
                    </div>
                  </div>
                </Card>
                <div className="bg-muted rounded-lg flex flex-col items-center justify-center p-6 min-h-[200px] w-full text-center shadow-inner">
                  <gameDetails.icon className="h-16 w-16 text-primary mb-4" />
                  <h3 className="text-2xl font-bold font-headline text-primary mb-2">Ready for {gameDetails.name}?</h3>
                  <p className="text-muted-foreground mb-4 max-w-md text-sm">
                    Enter details above. Game will be fullscreen. Use <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Spacebar</kbd> or tap/click to shoot.
                  </p>
                  <Button onClick={startGame} size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold">
                    <Play className="mr-2 h-6 w-6" /> Start Game
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {isClient && !isGameScreenActive && ( // Show ads only when not in game screen
          <div className="my-8 text-center">
            <p className="mb-4 text-sm text-muted-foreground">Advertisement</p>
            <AdSenseUnit adClient="ca-pub-6305491227155574" adSlot="6193979423" className="inline-block" />
          </div>
        )}
      </div>
    </div>
  );
}

