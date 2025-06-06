
'use client';

import { useParams } from 'next/navigation';
import { miniGames, kpopGroups, fanbaseMap } from '@/lib/data';
import { addScoreToLeaderboardAction, AddScorePayload } from '@/app/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Trophy, Play, RotateCcw, Target as GameIcon, Info } from 'lucide-react';
import React, { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { ProgressContext } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import AdSenseUnit from '@/components/AdSenseUnit';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import RotateDevicePrompt from '@/components/RotateDevicePrompt';


// Game specific constants (Example for Archery)
const ARROW_SPEED = 25;
const BOW_SPEED = 2;
const TARGET_SPEED = 3;
const INITIAL_ARROWS = 10;

export default function MiniGamePage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const gameDetails = miniGames.find(g => g.id === gameId);
  const progressContext = useContext(ProgressContext);
  const { toast } = useToast();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameInstanceRef = useRef<{
    animationFrameId?: number;
    bowY?: number;
    bowDY?: number;
    targetY?: number;
    targetDY?: number;
    arrowX?: number;
    arrowY?: number;
    isArrowFlying?: boolean;
    bowImage?: HTMLImageElement;
    targetImage?: HTMLImageElement;
    arrowImage?: HTMLImageElement;
    backgroundImage?: HTMLImageElement;
    bowSpeedIncremented?: boolean;
  }>({});

  const [isClient, setIsClient] = useState(false);
  const [username, setUsername] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [newGroup, setNewGroup] = useState('');

  const [score, setScore] = useState(0);
  const [arrowsLeft, setArrowsLeft] = useState(INITIAL_ARROWS);
  const [bestScore, setBestScore] = useState(0);
  const [isGameActive, setIsGameActive] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedScoreDetails, setSubmittedScoreDetails] = useState<{ score: number; username: string; group: string } | null>(null);
  const [showInstructions, setShowInstructions] = useState(false); // Retained for AlertDialog
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
    setBestScore(parseInt(localStorage.getItem(`bestScore_${gameId}`) || '0'));
  }, [gameId]);

  useEffect(() => {
      if (!isClient || !isGameActive || !canvasRef.current) return;

      const handleResize = () => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          const dpr = window.devicePixelRatio || 1;
          // Set canvas actual size (scaled by DPR)
          canvas.width = window.innerWidth * dpr;
          canvas.height = window.innerHeight * dpr;
          // Set canvas display size (CSS pixels)
          canvas.style.width = `${window.innerWidth}px`;
          canvas.style.height = `${window.innerHeight}px`;
          
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.scale(dpr, dpr); // Scale context for HiDPI rendering
          }
      };

      const handleOrientationChange = () => {
          const isPortrait = window.innerHeight > window.innerWidth;
          const isLikelyMobile = window.matchMedia("(max-width: 767px)").matches;
          setShowRotatePrompt(isGameActive && isPortrait && isLikelyMobile);
          setTimeout(handleResize, 50); // Allow layout to settle, then resize canvas
      };

      window.addEventListener('resize', handleResize);
      window.addEventListener('orientationchange', handleOrientationChange);
      
      handleOrientationChange(); // Initial check for orientation
      handleResize(); // Initial resize of canvas

      return () => {
          window.removeEventListener('resize', handleResize);
          window.removeEventListener('orientationchange', handleOrientationChange);
      };
  }, [isClient, isGameActive]);


  const resetGameState = useCallback(() => {
    setScore(0);
    setArrowsLeft(INITIAL_ARROWS);
    setIsGameOver(false);
    setSubmittedScoreDetails(null);
    // Reset game instance details including positions
    const H = window.innerHeight; // Use current window height for reset
    gameInstanceRef.current = {
        bowY: H / 2,
        bowDY: BOW_SPEED,
        targetY: H / 2,
        targetDY: TARGET_SPEED,
        isArrowFlying: false,
        bowSpeedIncremented: false,
    };
  }, []);


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

    resetGameState();
    setIsGameActive(true);
    // setShowInstructions(false); // Instructions are in AlertDialog, shown by user click

    const game = gameInstanceRef.current;
    const canvas = canvasRef.current;
    if (!canvas || !game) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    // Ensure canvas is sized correctly for DPR at game start
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.scale(dpr, dpr);


    const loadImage = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });

    Promise.all([
        loadImage('/assets/stadium-background.png'),
        loadImage('/assets/bow-sprite.png'),
        loadImage('/assets/target-sprite.png'),
        loadImage('/assets/arrow-sprite.png'),
    ]).then(([bg, bowImg, targetImg, arrowImg]) => {
        game.backgroundImage = bg;
        game.bowImage = bowImg;
        game.targetImage = targetImg;
        game.arrowImage = arrowImg;

        // Ensure initial positions are set based on current screen dimensions
        const W_logical = window.innerWidth; // Logical width
        const H_logical = window.innerHeight; // Logical height
        game.bowY = H_logical / 2;
        game.targetY = H_logical / 2;


        const gameLoop = () => {
          // Check isGameActive from state, not a local variable that might be stale
          if (!isGameActive || isGameOver || !canvasRef.current) { // Use component state
            if (game.animationFrameId) cancelAnimationFrame(game.animationFrameId);
            return;
          }

          const W = window.innerWidth; // Use logical pixels for game logic
          const H = window.innerHeight;

          ctx.clearRect(0, 0, W, H); // Clear using logical dimensions

          if (game.backgroundImage) {
              ctx.drawImage(game.backgroundImage, 0, 0, W, H);
          }

          const bowHeight = H * 0.15;
          const bowWidth = bowHeight * (120 / 180);
          const bowX = W * 0.10;

          const targetHeight = H * 0.12;
          const targetWidth = targetHeight * (100 / 160);
          const targetX = W * 0.85;

          const arrowHeight = H * 0.06;
          const arrowWidth = arrowHeight * (150 / 20);

          if (game.bowY === undefined) game.bowY = H / 2;
          if (game.bowDY === undefined) game.bowDY = BOW_SPEED;
          let currentBowSpeed = BOW_SPEED * (game.bowSpeedIncremented ? 1.5 : 1);
          game.bowDY = game.bowDY > 0 ? currentBowSpeed : -currentBowSpeed;


          game.bowY += game.bowDY;
          if (game.bowY + bowHeight / 2 > H * 0.85 || game.bowY - bowHeight / 2 < H * 0.15) {
            game.bowDY *= -1;
          }
          if (game.bowImage) ctx.drawImage(game.bowImage, bowX, game.bowY - bowHeight / 2, bowWidth, bowHeight);

          if (game.targetY === undefined) game.targetY = H / 2;
          if (game.targetDY === undefined) game.targetDY = TARGET_SPEED;
          game.targetY += game.targetDY;
          if (game.targetY + targetHeight / 2 > H * 0.9 || game.targetY - targetHeight / 2 < H * 0.1) {
            game.targetDY *= -1;
          }
          if (game.targetImage) ctx.drawImage(game.targetImage, targetX - targetWidth / 2, game.targetY - targetHeight / 2, targetWidth, targetHeight);

          if (game.isArrowFlying) {
            if (game.arrowX === undefined) game.arrowX = bowX + bowWidth; // Start arrow from bow
            if (game.arrowY === undefined && game.bowY) game.arrowY = game.bowY; // Lock Y at shoot time
            
            game.arrowX += ARROW_SPEED;

            if (game.arrowX > targetX - targetWidth / 2 && game.arrowX < targetX + targetWidth/2 &&
                game.arrowY && game.arrowY > game.targetY - targetHeight / 2 && game.arrowY < game.targetY + targetHeight / 2) {
              const offset = Math.abs(game.arrowY - game.targetY);
              const points = Math.max(0, 10 - Math.floor(offset / (targetHeight / 20)));
              
              setScore(prev => {
                const newScore = prev + points;
                if (newScore > 20 && !game.bowSpeedIncremented) {
                    game.bowSpeedIncremented = true;
                }
                return newScore;
              });

              if (points >= 9) {
                setArrowsLeft(prev => prev + 2);
              }
              game.isArrowFlying = false;
            }

            if (game.arrowX > W) {
              game.isArrowFlying = false;
            }
          } else {
            game.arrowX = bowX + bowWidth / 2; // Nocking point
            if(game.bowY) game.arrowY = game.bowY;
          }

          if (game.isArrowFlying && game.arrowImage && game.arrowY) {
             ctx.drawImage(game.arrowImage, game.arrowX, game.arrowY - arrowHeight / 2, arrowWidth, arrowHeight);
          }

          ctx.fillStyle = 'white';
          ctx.font = 'bold 24px Poppins';
          ctx.shadowColor = 'black';
          ctx.shadowBlur = 5;
          ctx.textAlign = 'left';
          ctx.fillText(`Score: ${score}`, 20, 40);
          ctx.fillText(`Arrows: ${arrowsLeft}`, 20, 70);
          ctx.textAlign = 'right';
          ctx.fillText(`Best: ${bestScore}`, W - 20, 40);
          ctx.shadowBlur = 0; // Reset shadow


          if (arrowsLeft <= 0 && !game.isArrowFlying && !isGameOver) { // Check component state for isGameOver
            setIsGameOver(true); // Set game over state
            setIsGameActive(false); // This will eventually stop the loop
            if (score > bestScore) { // Compare with component state bestScore
              setBestScore(score); // Update component state bestScore
              localStorage.setItem(`bestScore_${gameId}`, score.toString());
            }
            toast({
              title: "Game Over!",
              description: `You scored ${score} points. ${score > bestScore ? "That's a new personal best!" : ""}`,
            });
            // No need to cancel animationFrameId here, the check at the start of the loop will handle it
          }
          game.animationFrameId = requestAnimationFrame(gameLoop);
        };
        // Start the loop
        if (isGameActive && !isGameOver) { // Check component state before starting
             game.animationFrameId = requestAnimationFrame(gameLoop);
        }
    }).catch(err => {
        console.error("Failed to load game assets:", err);
        toast({title: "Error", description: "Could not load game assets. Please try again.", variant: "destructive"});
        setIsGameActive(false); // Ensure game doesn't proceed
    });
  };

  const handleShoot = useCallback(() => {
    // Use component state for checks
    if (!isGameActive || isGameOver || gameInstanceRef.current?.isArrowFlying || arrowsLeft <= 0) return;

    const game = gameInstanceRef.current;
    if (game && game.bowY) { // Ensure bowY is defined before setting arrowY
      game.isArrowFlying = true;
      game.arrowY = game.bowY; // Lock arrow's Y position to current bow Y at the moment of shooting
      // game.arrowX is set when not flying or at the start of flight
      setArrowsLeft(prev => prev - 1);
    }
  }, [isGameActive, isGameOver, arrowsLeft]); // Dependencies on component state

  useEffect(() => {
    if (!isGameActive) return; // Only add listener if game is active

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleShoot();
      }
    };
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isGameActive, handleShoot]); // Re-bind if isGameActive or handleShoot changes


  const handleScoreSubmit = async () => {
    const finalUsername = username.trim();
    const finalGroup = (newGroup.trim() || selectedGroup).trim();

    if (!finalUsername || !finalGroup || score < 0) { // Use component state 'score'
      toast({ title: "Validation Error", description: "Please ensure username, group, and score are valid.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: AddScorePayload = { username: finalUsername, group: finalGroup, gameId, score }; // Use component state 'score'
      await addScoreToLeaderboardAction(payload);
      if (progressContext && !progressContext.isGameCompleted(gameId)) {
        progressContext.completeGame(gameId);
      }
      setSubmittedScoreDetails({ score, username: finalUsername, group: finalGroup }); // Use component state 'score'
      toast({ title: "Score Submitted!", description: `Your score of ${score} has been recorded.`, className: "bg-green-500 text-white" });
    } catch (error: any) {
      console.error("Failed to submit score:", error);
      const serverErrorMessage = error.message && error.message.includes("Database client not available")
        ? "Could not connect to the leaderboard server. Please try again later."
        : error.message || "Could not submit score.";
      toast({ title: "Submission Error", description: serverErrorMessage, variant: "destructive", duration: 7000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlayAgain = () => {
    setIsGameActive(false); 
    setIsGameOver(false); // Explicitly set isGameOver to false
    if (gameInstanceRef.current?.animationFrameId) {
      cancelAnimationFrame(gameInstanceRef.current.animationFrameId);
      gameInstanceRef.current.animationFrameId = undefined;
    }
    resetGameState(); 
    // User will click "Start Game" button again from the setup screen.
    // This brings them back to the pre-game card.
  };

  const handleQuitGame = () => {
    setIsGameActive(false);
    setIsGameOver(true); // Treat as game over to show submission UI
     if (gameInstanceRef.current?.animationFrameId) {
        cancelAnimationFrame(gameInstanceRef.current.animationFrameId);
        gameInstanceRef.current.animationFrameId = undefined;
    }
    // Update best score if current score is higher
    if (score > bestScore) {
        setBestScore(score);
        localStorage.setItem(`bestScore_${gameId}`, score.toString());
    }
  };


  if (!gameDetails) {
    return <div className="text-center py-10"><h1 className="text-2xl font-bold text-destructive font-headline">Game not found!</h1><Button asChild className="mt-4"><Link href="/"><ArrowLeft className="mr-2 h-4 w-4" />Go back</Link></Button></div>;
  }

  if (isGameActive) { // Fullscreen game view
      return (
          <div 
            className="fixed inset-0 z-[60] bg-background cursor-pointer" // Higher z-index, ensure cursor pointer for tap
            onClick={handleShoot} // Universal click/tap handler for shooting
          >
              <canvas ref={canvasRef} className="w-full h-full block outline-none" tabIndex={0} />
              {showRotatePrompt && <RotateDevicePrompt />}
               <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                      e.stopPropagation(); // Prevent shoot on quit
                      handleQuitGame();
                  }}
                  className="absolute top-4 right-4 z-[70] bg-black/40 hover:bg-black/60 text-white rounded-full p-2"
                  title="Quit Game"
              >
                  <RotateCcw className="h-5 w-5" /> {/* Slightly smaller icon for less intrusion */}
              </Button>
          </div>
      );
  }

  // Pre-game, game over, or score submitted view (within the card layout)
  return (
    <div className="space-y-8">
      <Button variant="outline" asChild className="mb-6 group">
        <Link href="/"><ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />Back to All Games</Link>
      </Button>

      <Card className="overflow-hidden shadow-xl rounded-xl">
         <CardHeader className="p-0 relative">
          <div className="relative w-full h-64 md:h-80">
            <Image src="/assets/banner.png" alt="Game Banner" layout="fill" objectFit="cover" data-ai-hint="game banner" priority />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          </div>
          <div className="absolute bottom-0 left-0 p-6 flex items-end space-x-4">
            <gameDetails.icon className="h-12 w-12 text-white drop-shadow-lg" />
            <div>
              <CardTitle className="font-headline text-4xl text-white drop-shadow-md">{gameDetails.name}</CardTitle>
              <CardDescription className="text-gray-200 text-lg drop-shadow-sm">{gameDetails.description}</CardDescription>
            </div>
          </div>
           <AlertDialog>
              <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full p-2">
                      <Info className="h-5 w-5" />
                  </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                  <AlertDialogHeader>
                  <AlertDialogTitle>How to Play: {gameDetails.name}</AlertDialogTitle>
                  <AlertDialogDescription className="text-left space-y-2 pt-2">
                      <p>Welcome to {gameDetails.name}!</p>
                      <p><strong>Objective:</strong> Score as many points as possible by hitting the target with your arrows.</p>
                      <p><strong>Controls:</strong> Click or tap anywhere on the game screen, or press the <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">Spacebar</kbd> to shoot an arrow.</p>
                      <p><strong>Gameplay:</strong></p>
                      <ul className="list-disc list-inside pl-4 space-y-1">
                      <li>The bow moves up and down automatically. Time your shot!</li>
                      <li>The target also moves up and down.</li>
                      <li>You start with {INITIAL_ARROWS} arrows.</li>
                      <li>Hitting the bullseye (9-10 points) awards you +2 bonus arrows.</li>
                      <li>The game ends when you run out of arrows.</li>
                      </ul>
                      <p>For the best experience, play in landscape mode on mobile devices.</p>
                  </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                  <AlertDialogAction>Got it!</AlertDialogAction>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          {isGameOver && !submittedScoreDetails ? ( // Game is over, show score submission UI
            <Card className="p-6 bg-muted/50 rounded-lg">
              <CardTitle className="text-xl mb-4 font-headline text-primary">Game Over! Submit Your Score</CardTitle>
               <div className="space-y-2 mb-4">
                    <p><span className="font-semibold">Player:</span> {username}</p>
                    <p><span className="font-semibold">Group:</span> {newGroup.trim() || selectedGroup || 'N/A'}</p>
                  </div>
              <div className="space-y-4">
                <div><Label htmlFor="finalScore" className="text-foreground/80">Your Score</Label><Input id="finalScore" type="number" value={score} readOnly className="mt-1 bg-white" /></div>
                <Button onClick={handleScoreSubmit} size="lg" className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground font-semibold" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : <><Trophy className="mr-2 h-5 w-5" /> Submit Score</>}</Button>
              </div>
              <div className="text-center mt-6">
                <Button onClick={handlePlayAgain} variant="outline" disabled={isSubmitting}><RotateCcw className="mr-2 h-4 w-4" /> Play Again</Button>
              </div>
            </Card>
          ) : submittedScoreDetails ? ( // Score has been submitted
            <div className="text-center p-6 border border-green-500 bg-green-50 rounded-xl shadow-lg">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" /><p className="text-2xl font-semibold text-green-700 font-headline">Score Submitted!</p>
              <p className="text-lg text-green-600 mt-1">Player: {submittedScoreDetails.username}</p><p className="text-lg text-green-600">Group: {submittedScoreDetails.group}</p>
              <p className="text-3xl font-bold text-accent my-3">{submittedScoreDetails.score} points</p>
              <div className="mt-4 space-x-3">
                <Button onClick={handlePlayAgain} variant="outline"><RotateCcw className="mr-2 h-4 w-4" /> Play Again</Button>
                <Button asChild><Link href="/leaderboard">View Leaderboards</Link></Button>
              </div>
            </div>
          ) : ( // Pre-game setup UI
            <div className="space-y-6">
              <Card className="p-6 bg-muted/50 rounded-lg">
                <CardTitle className="text-xl mb-4 font-headline text-primary">Player Details</CardTitle>
                <div className="space-y-4">
                  <div><Label htmlFor="username-setup" className="text-foreground/80">X Username</Label><Input id="username-setup" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@yourusername" className="mt-1"/></div>
                  <div><Label htmlFor="groupSelect-setup" className="text-foreground/80">Select Your K-pop Group</Label>
                    <Select value={selectedGroup} onValueChange={(value) => { setSelectedGroup(value); setNewGroup(''); }}>
                      <SelectTrigger id="groupSelect-setup" className="mt-1"><SelectValue placeholder="-- Select Your Group --" /></SelectTrigger>
                      <SelectContent>{kpopGroups.map(gn => (<SelectItem key={gn} value={gn}>{gn} ({fanbaseMap[gn] || 'N/A'})</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div><Label htmlFor="newGroup-setup" className="text-foreground/80">Or Enter New Group Name</Label><Input id="newGroup-setup" value={newGroup} onChange={(e) => { setNewGroup(e.target.value); if (e.target.value) setSelectedGroup(''); }} placeholder="If not in list" className="mt-1"/></div>
                </div>
              </Card>
              <div className="bg-card border rounded-lg flex flex-col items-center justify-center p-6 min-h-[200px] w-full text-center shadow-inner">
                <GameIcon className="h-16 w-16 text-primary mb-4" />
                <h3 className="text-2xl font-bold font-headline text-primary mb-2">Ready for {gameDetails.name}?</h3>
                 <p className="text-muted-foreground mb-1 max-w-md text-sm">Ensure you're in landscape mode on mobile for the best experience.</p>
                 <p className="text-muted-foreground mb-4 max-w-md text-sm">Click the <Info size={16} className="inline -mt-1" /> icon above for full instructions.</p>
                <Button onClick={startGame} size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"><Play className="mr-2 h-6 w-6" />Start Game</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {isClient && !isGameActive && (<div className="my-8 text-center"><p className="mb-4 text-sm text-muted-foreground">Advertisement</p><AdSenseUnit adClient="ca-pub-6305491227155574" adSlot="6193979423" className="inline-block" /></div>)}
    </div>
  );
}

