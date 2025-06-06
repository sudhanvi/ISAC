
'use client';

import { useParams } from 'next/navigation';
import { miniGames, kpopGroups, fanbaseMap } from '@/lib/data';
import { addScoreToLeaderboardAction, AddScorePayload } from '@/app/actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Trophy, Play, RotateCcw, Info, Target as GameIcon } from 'lucide-react';
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

// Game specific constants
const ARROW_SPEED = 25;
const BOW_SPEED = 2;
const TARGET_SPEED = 3;
const INITIAL_ARROWS = 10;

interface GameInstance {
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
  // For decoupled state management to prevent loop interruptions
  score: number;
  arrows: number;
  personalBest: number;
}

export default function MiniGamePage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const gameDetails = miniGames.find(g => g.id === gameId);
  const progressContext = useContext(ProgressContext);
  const { toast } = useToast();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameInstanceRef = useRef<GameInstance | null>(null);

  const [isClient, setIsClient] = useState(false);
  const [username, setUsername] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [newGroup, setNewGroup] = useState('');
  
  // React state for game values (drives UI outside canvas and game over logic)
  const [gameScore, setGameScore] = useState(0);
  const [arrowsLeft, setArrowsLeft] = useState(INITIAL_ARROWS);
  const [bestScore, setBestScore] = useState(0); 

  const [isGameActive, setIsGameActive] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false); 
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
    if (gameId) {
        const storedBest = parseInt(localStorage.getItem(`bestScore_${gameId}`) || '0');
        setBestScore(storedBest);
        // Initialize ref if it's the first load
        if (gameInstanceRef.current) {
            gameInstanceRef.current.personalBest = storedBest;
        }
    }
  }, [gameId]);

 useEffect(() => {
    if (!isClient) return;

    const handleResizeOrOrientation = () => {
        const isPortrait = window.innerHeight > window.innerWidth;
        const isLikelyMobile = window.matchMedia("(max-width: 767px)").matches;
        const gameShouldBePaused = isGameActive && isPortrait && isLikelyMobile;
        setShowRotatePrompt(gameShouldBePaused);

        if (canvasRef.current && isGameActive && !gameShouldBePaused) { 
            const canvas = canvasRef.current;
            const dpr = window.devicePixelRatio || 1;
            // Ensure canvas logical size matches window for DPR scaling
            canvas.width = window.innerWidth * dpr;
            canvas.height = window.innerHeight * dpr;
            canvas.style.width = `${window.innerWidth}px`;
            canvas.style.height = `${window.innerHeight}px`;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.scale(dpr, dpr); // Apply scaling for high-res drawing
            }
        }
    };
    
    window.addEventListener('resize', handleResizeOrOrientation);
    window.addEventListener('orientationchange', handleResizeOrOrientation);
    
    handleResizeOrOrientation(); 

    return () => {
        window.removeEventListener('resize', handleResizeOrOrientation);
        window.removeEventListener('orientationchange', handleResizeOrOrientation);
    };
}, [isClient, isGameActive]); 

  const resetGameState = useCallback(() => {
    setGameScore(0);
    setArrowsLeft(INITIAL_ARROWS);
    setIsGameOver(false);
    setSubmittedScoreDetails(null);
    
    const currentBest = parseInt(localStorage.getItem(`bestScore_${gameId}`) || '0');
    setBestScore(currentBest); // Ensure React state for bestScore is also up-to-date

    gameInstanceRef.current = {
        score: 0,
        arrows: INITIAL_ARROWS,
        personalBest: currentBest,
        bowY: undefined, 
        bowDY: BOW_SPEED, 
        targetY: undefined, 
        targetDY: TARGET_SPEED, 
        arrowX: undefined,
        arrowY: undefined,
        isArrowFlying: false,
        bowSpeedIncremented: false,
        animationFrameId: undefined,
        // Preserve loaded images if they exist
        backgroundImage: gameInstanceRef.current?.backgroundImage,
        bowImage: gameInstanceRef.current?.bowImage,
        targetImage: gameInstanceRef.current?.targetImage,
        arrowImage: gameInstanceRef.current?.arrowImage,
    };
  }, [gameId]);


  const actualGameLoop = useCallback(() => {
    const gameCurrentlyActive = !isGameOver && isGameActive && !showRotatePrompt;

    if (!gameCurrentlyActive || !canvasRef.current || !gameInstanceRef.current) {
      if (gameInstanceRef.current?.animationFrameId) {
        cancelAnimationFrame(gameInstanceRef.current.animationFrameId);
        gameInstanceRef.current.animationFrameId = undefined;
      }
      return;
    }

    const gameData = gameInstanceRef.current; // Use gameData for current values
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.error("Context not available in game loop");
      setIsGameActive(false); 
      return;
    }
    
    const W = window.innerWidth; // Logical width for drawing
    const H = window.innerHeight; // Logical height for drawing

    ctx.clearRect(0, 0, W, H); // Clear using logical dimensions

    if (gameData.backgroundImage) {
        ctx.drawImage(gameData.backgroundImage, 0, 0, W, H);
    }

    const bowHeight = H * 0.25; 
    const bowWidth = bowHeight * (120 / 180); 
    const bowX = W * 0.10;

    const targetHeight = H * 0.22; 
    const targetWidth = targetHeight * (100 / 160); 
    const targetX = W * 0.85;
    
    const arrowHeight = H * 0.03; 
    const arrowWidth = arrowHeight * (100 / 20);

    if (gameData.bowY === undefined) gameData.bowY = H / 2;
    if (gameData.targetY === undefined) gameData.targetY = H / 2;
    
    let currentBowSpeed = BOW_SPEED * (gameData.bowSpeedIncremented ? 1.5 : 1);
    if (gameData.bowDY === undefined || gameData.bowDY === 0) gameData.bowDY = BOW_SPEED;
    gameData.bowDY = Math.sign(gameData.bowDY) * currentBowSpeed;
    
    gameData.bowY += gameData.bowDY;
    if (gameData.bowY + bowHeight / 2 > H * 0.85 || gameData.bowY - bowHeight / 2 < H * 0.15) {
      gameData.bowDY *= -1;
    }
    if (gameData.bowImage) ctx.drawImage(gameData.bowImage, bowX, gameData.bowY - bowHeight / 2, bowWidth, bowHeight);

    if (gameData.targetDY === undefined || gameData.targetDY === 0) gameData.targetDY = TARGET_SPEED;
    gameData.targetY += gameData.targetDY;
    if (gameData.targetY + targetHeight / 2 > H * 0.9 || gameData.targetY - targetHeight / 2 < H * 0.1) {
      gameData.targetDY *= -1;
    }
    if (gameData.targetImage) ctx.drawImage(gameData.targetImage, targetX - targetWidth / 2, gameData.targetY - targetHeight / 2, targetWidth, targetHeight);

    if (gameData.isArrowFlying) {
      if (gameData.arrowX === undefined) { 
          const initialArrowX_bowX = W * 0.10;
          const initialArrowX_bowHeight = H * 0.25; // Use new bow height factor
          const initialArrowX_bowWidth = initialArrowX_bowHeight * (120/180);
          gameData.arrowX = initialArrowX_bowX + initialArrowX_bowWidth / 2;
      }
      gameData.arrowX += ARROW_SPEED;

      if (gameData.arrowX > targetX - targetWidth / 2 && gameData.arrowX < targetX + targetWidth/2 &&
          gameData.arrowY && gameData.arrowY > gameData.targetY - targetHeight / 2 && gameData.arrowY < gameData.targetY + targetHeight / 2) {
        const offset = Math.abs(gameData.arrowY - gameData.targetY);
        const points = Math.max(0, 10 - Math.floor(offset / (targetHeight / 20))); 
        
        gameData.score += points;
        setGameScore(prev => prev + points); // Update React state

        if (gameData.score > 20 && !gameData.bowSpeedIncremented) {
            gameData.bowSpeedIncremented = true;
        }

        if (points >= 9) { 
          gameData.arrows += 2;
          setArrowsLeft(prev => prev + 2); // Update React state
        }
        gameData.isArrowFlying = false; 
      }

      if (gameData.arrowX > W) {
        gameData.isArrowFlying = false;
      }
    } else { 
      const currentBowXPos = W * 0.10;
      const currentBowHeightVal = H * 0.25; // Use new bow height factor
      const currentBowWidthVal = currentBowHeightVal * (120/180);
      gameData.arrowX = currentBowXPos + currentBowWidthVal / 2; 
      if(gameData.bowY) gameData.arrowY = gameData.bowY; 
    }

    if (gameData.isArrowFlying && gameData.arrowImage && gameData.arrowY) { 
       ctx.drawImage(gameData.arrowImage, gameData.arrowX, gameData.arrowY - arrowHeight / 2, arrowWidth, arrowHeight);
    }

    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Poppins';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 5;
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${gameData.score}`, 20, 40);
    ctx.fillText(`Arrows: ${gameData.arrows}`, 20, 70);
    ctx.textAlign = 'right';
    ctx.fillText(`Best: ${gameData.personalBest}`, W - 20, 40);
    ctx.shadowBlur = 0;

    if (gameData.arrows <= 0 && !gameData.isArrowFlying && !isGameOver) {
      setIsGameOver(true); // Triggers React effect for game over
      setIsGameActive(false); 
      if (gameData.score > gameData.personalBest) {
        gameData.personalBest = gameData.score;
        setBestScore(gameData.score); // Update React state
        if(gameId) localStorage.setItem(`bestScore_${gameId}`, gameData.score.toString());
      }
      toast({
        title: "Game Over!",
        description: `You scored ${gameData.score} points. ${gameData.score > gameData.personalBest ? "That's a new personal best!" : ""}`,
      });
    } else {
      gameData.animationFrameId = requestAnimationFrame(actualGameLoop);
    }
  }, [isGameActive, isGameOver, gameId, showRotatePrompt, setGameScore, setArrowsLeft, setBestScore, setIsGameOver, setIsGameActive, toast]);


  useEffect(() => {
    if (isGameActive && !isGameOver && !showRotatePrompt && canvasRef.current && isClient) {
      const game = gameInstanceRef.current; 
      if (!game) {
          console.error("Game instance ref not initialized before asset loading.");
          resetGameState(); // Try to re-initialize
          return;
      }
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        console.error("Failed to get canvas context for game initialization.");
        toast({ title: "Error", description: "Could not initialize game canvas.", variant: "destructive" });
        setIsGameActive(false);
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);

      const loadImage = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
          const img = new window.Image();
          img.onload = () => resolve(img);
          img.onerror = (e) => {
            console.error(`Failed to load image: ${src}`, e);
            reject(new Error(`Failed to load image: ${src}`));
          };
          img.src = src;
      });

      const loadAssetsIfNeeded = async () => {
        if (game.backgroundImage && game.bowImage && game.targetImage && game.arrowImage) {
          return; 
        }
        const [bg, bowImg, targetImg, arrowImg] = await Promise.all([
            loadImage('/assets/stadium-background.png'),
            loadImage('/assets/bow-sprite.png'),
            loadImage('/assets/target-sprite.png'),
            loadImage('/assets/arrow-sprite.png'),
        ]);
        game.backgroundImage = bg;
        game.bowImage = bowImg;
        game.targetImage = targetImg;
        game.arrowImage = arrowImg;
      };


      loadAssetsIfNeeded().then(() => {
          const H_logical = window.innerHeight;
          if(game.bowY === undefined) game.bowY = H_logical / 2;
          if(game.targetY === undefined) game.targetY = H_logical / 2;
          if (game.bowDY === undefined || game.bowDY === 0) game.bowDY = BOW_SPEED;
          if (game.targetDY === undefined || game.targetDY === 0) game.targetDY = TARGET_SPEED;

          if (gameInstanceRef.current && isGameActive && !isGameOver && !showRotatePrompt) { 
            gameInstanceRef.current.animationFrameId = requestAnimationFrame(actualGameLoop);
          }
      }).catch(err => {
          console.error("Failed to load game assets:", err);
          toast({title: "Asset Loading Error", description: String(err) || "Could not load game assets. Please try refreshing.", variant: "destructive", duration: 7000});
          setIsGameActive(false); 
      });

      return () => { 
        if (gameInstanceRef.current?.animationFrameId) {
          cancelAnimationFrame(gameInstanceRef.current.animationFrameId);
          gameInstanceRef.current.animationFrameId = undefined;
        }
      };
    } else if ((!isGameActive || isGameOver || showRotatePrompt) && gameInstanceRef.current?.animationFrameId) {
      cancelAnimationFrame(gameInstanceRef.current.animationFrameId);
      gameInstanceRef.current.animationFrameId = undefined;
    }
  }, [isGameActive, isGameOver, isClient, actualGameLoop, showRotatePrompt, resetGameState, toast]);


  const handleStartGameClick = () => {
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
    setIsGameOver(false); 
    setSubmittedScoreDetails(null);
  };

  const handleShoot = useCallback(() => {
    if (!isGameActive || isGameOver || showRotatePrompt) return;
    
    const game = gameInstanceRef.current;
    if (!game || game.isArrowFlying || game.arrows <= 0) return;

    if (game.bowY !== undefined) { 
      game.isArrowFlying = true;
      game.arrowY = game.bowY; 
      
      const currentW = window.innerWidth;
      const currentH = window.innerHeight;
      const currentBowX = currentW * 0.10;
      const currentBowHeight = currentH * 0.25; // Use new bow height factor
      const currentBowWidth = currentBowHeight * (120 / 180);
      game.arrowX = currentBowX + currentBowWidth / 2;
      
      game.arrows -= 1;
      setArrowsLeft(prev => prev - 1); // Update React state
    }
  }, [isGameActive, isGameOver, showRotatePrompt, setArrowsLeft]); 

  useEffect(() => {
    if (!isGameActive || showRotatePrompt) return; 

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleShoot();
      }
    };
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isGameActive, handleShoot, showRotatePrompt]); 


  const handleScoreSubmit = async () => {
    const finalUsername = username.trim();
    const finalGroup = (newGroup.trim() || selectedGroup).trim();
    const scoreToSubmit = gameScore; 


    if (!finalUsername || !finalGroup || scoreToSubmit < 0) { 
      toast({ title: "Validation Error", description: "Please ensure username, group, and score are valid.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: AddScorePayload = { username: finalUsername, group: finalGroup, gameId: gameId!, score: scoreToSubmit }; 
      await addScoreToLeaderboardAction(payload);
      if (progressContext && gameId && !progressContext.isGameCompleted(gameId)) {
        progressContext.completeGame(gameId);
      }
      setSubmittedScoreDetails({ score: scoreToSubmit, username: finalUsername, group: finalGroup }); 
      toast({ title: "Score Submitted!", description: `Your score of ${scoreToSubmit} has been recorded.`, className: "bg-green-500 text-white" });
    } catch (error: any) {
      console.error("Failed to submit score:", error);
      const serverErrorMessage = error.message && error.message.includes("Database client not available")
        ? "Could not connect to the leaderboard server. Please try again later."
        : error.message && error.message.includes("Failed to submit score. Database insert operation failed")
        ? "Failed to submit score to the database. Please check server logs for details."
        : error.message || "Could not submit score.";
      toast({ title: "Submission Error", description: serverErrorMessage, variant: "destructive", duration: 7000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePlayAgain = () => {
    setIsGameActive(false); 
    setIsGameOver(false); 
    setSubmittedScoreDetails(null); 
  };
  
  const handleQuitGame = () => {
    setIsGameActive(false); 
    setIsGameOver(true); 
    if (gameInstanceRef.current && gameInstanceRef.current.score > bestScore && gameId) {
      setBestScore(gameInstanceRef.current.score);
      localStorage.setItem(`bestScore_${gameId}`, gameInstanceRef.current.score.toString());
    }
  };


  if (!gameDetails) {
    return <div className="text-center py-10"><h1 className="text-2xl font-bold text-destructive font-headline">Game not found!</h1><Button asChild className="mt-4"><Link href="/"><ArrowLeft className="mr-2 h-4 w-4" />Go back</Link></Button></div>;
  }

  if (isGameActive && !isGameOver && !showRotatePrompt) { 
      return (
          <div 
            className="fixed inset-0 z-[60] bg-gray-800 cursor-pointer" 
            onClick={handleShoot} 
            onTouchStart={(e) => { e.preventDefault(); handleShoot(); }}
          >
              <canvas ref={canvasRef} className="w-full h-full block outline-none" tabIndex={0} />
               <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                      e.stopPropagation(); 
                      handleQuitGame();
                  }}
                  className="absolute top-4 right-4 z-[70] bg-black/40 hover:bg-black/60 text-white rounded-full p-2"
                  title="Quit Game & Submit Score"
              >
                  <RotateCcw className="h-5 w-5" /> 
              </Button>
          </div>
      );
  }
  
  return (
    <div className="space-y-8 relative">
      {showRotatePrompt && <RotateDevicePrompt />}
      <div className={showRotatePrompt ? 'opacity-20 pointer-events-none blur-sm' : ''}>
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
            {isGameOver && !submittedScoreDetails ? ( 
              <Card className="p-6 bg-muted/50 rounded-lg">
                <CardTitle className="text-xl mb-4 font-headline text-primary">Game Over! Submit Your Score</CardTitle>
                 <div className="space-y-2 mb-4">
                      <p><span className="font-semibold">Player:</span> {username}</p>
                      <p><span className="font-semibold">Group:</span> {newGroup.trim() || selectedGroup || 'N/A'}</p>
                    </div>
                <div className="space-y-4">
                  <div><Label htmlFor="finalScore" className="text-foreground/80">Your Score</Label><Input id="finalScore" type="number" value={gameScore} readOnly className="mt-1 bg-white" /></div>
                  <Button onClick={handleScoreSubmit} size="lg" className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground font-semibold" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : <><Trophy className="mr-2 h-5 w-5" /> Submit Score</>}</Button>
                </div>
                <div className="text-center mt-6">
                  <Button onClick={handlePlayAgain} variant="outline" disabled={isSubmitting}><RotateCcw className="mr-2 h-4 w-4" /> Play Again & Start Over</Button>
                </div>
              </Card>
            ) : submittedScoreDetails ? ( 
              <div className="text-center p-6 border border-green-500 bg-green-50 rounded-xl shadow-lg">
                <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" /><p className="text-2xl font-semibold text-green-700 font-headline">Score Submitted!</p>
                <p className="text-lg text-green-600 mt-1">Player: {submittedScoreDetails.username}</p><p className="text-lg text-green-600">Group: {submittedScoreDetails.group}</p>
                <p className="text-3xl font-bold text-accent my-3">{submittedScoreDetails.score} points</p>
                <div className="mt-4 space-x-3">
                  <Button onClick={handlePlayAgain} variant="outline"><RotateCcw className="mr-2 h-4 w-4" /> Play Again</Button>
                  <Button asChild><Link href="/leaderboard">View Leaderboards</Link></Button>
                </div>
              </div>
            ) : ( 
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
                  <Button onClick={handleStartGameClick} size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"><Play className="mr-2 h-6 w-6" />Start Game</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        {isClient && (isGameOver || (!isGameActive && !submittedScoreDetails)) && (<div className="my-8 text-center"><p className="mb-4 text-sm text-muted-foreground">Advertisement</p><AdSenseUnit adClient="ca-pub-6305491227155574" adSlot="6193979423" className="inline-block" /></div>)}
      </div>
    </div>
  );
}


    