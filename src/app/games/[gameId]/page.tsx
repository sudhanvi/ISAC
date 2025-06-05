
'use client';

import { useParams } from 'next/navigation';
import Image from 'next/image';
import { miniGames, kpopGroups, addScoreToLeaderboard, fanbaseMap } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Trophy } from 'lucide-react';
import React, { useContext, useEffect, useState } from 'react';
import { ProgressContext } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

export default function MiniGamePage() {
  const params = useParams();
  const gameId = params.gameId as string;
  const game = miniGames.find(g => g.id === gameId);
  const progressContext = useContext(ProgressContext);
  const { toast } = useToast();

  const [isClient, setIsClient] = useState(false);
  const [username, setUsername] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [newGroup, setNewGroup] = useState('');
  const [score, setScore] = useState<number | ''>('');
  const [submittedScoreDetails, setSubmittedScoreDetails] = useState<{ score: number; username: string; group: string } | null>(null);

  useEffect(() => {
    setIsClient(true);
    // Load username from localStorage if available
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
    if (score === '' || isNaN(Number(score)) || Number(score) < 0) {
      toast({ title: "Validation Error", description: "Please enter a valid score (0 or higher).", variant: "destructive" });
      return;
    }

    const numericScore = Number(score);

    addScoreToLeaderboard({ username: username.trim(), group: finalGroup, gameId, score: numericScore });
    if (progressContext && !gameCompleted) {
      progressContext.completeGame(gameId);
    }
    
    // Save username and group for next time
    localStorage.setItem('isacStudioUsername', username.trim());
    localStorage.setItem('isacStudioGroup', finalGroup);

    setSubmittedScoreDetails({ score: numericScore, username: username.trim(), group: finalGroup });
    toast({ title: "Score Submitted!", description: `Your score of ${numericScore} for ${game.name} has been recorded.`, className: "bg-green-500 text-white" });
    
    // Optionally reset form fields here if desired, or keep them for resubmission
    // setScore(''); 
  };

  const handlePlayAgain = () => {
    setSubmittedScoreDetails(null);
    setScore('');
    // Keep username and group pre-filled
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
          <div className="space-y-6">
            {!submittedScoreDetails && !gameCompleted && (
              <Card className="p-6 bg-muted/50">
                <CardTitle className="text-xl mb-4 font-headline text-primary">Enter Your Details & Score</CardTitle>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="username" className="text-foreground/80">X Username</Label>
                    <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@yourusername" className="mt-1"/>
                  </div>
                  <div>
                    <Label htmlFor="groupSelect" className="text-foreground/80">Select Your K-pop Group</Label>
                    <Select value={selectedGroup} onValueChange={setSelectedGroup}>
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
                    <Input id="newGroup" value={newGroup} onChange={(e) => setNewGroup(e.target.value)} placeholder="If not in list or for sub-units" className="mt-1"/>
                  </div>
                  <div>
                    <Label htmlFor="score" className="text-foreground/80">Your Score</Label>
                    <Input id="score" type="number" value={score} onChange={(e) => setScore(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Enter score" className="mt-1"/>
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
                  {submittedScoreDetails ? `Score Submitted for ${game.name}!` : `You've already participated in ${game.name}!`}
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
                      Enter Another Score
                   </Button>
                   <Button asChild>
                     <Link href="/leaderboard">View Leaderboards</Link>
                   </Button>
                </div>
              </div>
            )}

            <h2 className="text-2xl font-semibold font-headline text-primary mt-8">Game Arena</h2>
            <div className="aspect-video bg-muted rounded-lg flex items-center justify-center p-4">
              <p className="text-muted-foreground text-center">
                This is the interactive area for {game.name}.<br />
                Imagine exciting gameplay happening here!
                <span role="img" aria-label="Sparkles" className="ml-1">✨</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    