'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { handleGenerateCheer, type CheerGenerationState } from '@/app/actions';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Sparkles, MessageSquareHeart } from 'lucide-react';
import { performanceOptions, type MiniGamePerformance } from '@/lib/data';
import React from 'react';

interface CheerGeneratorFormProps {
  gameName: string;
  onCheerGenerated?: () => void;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
      {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
      Get Cheer Message
    </Button>
  );
}

export default function CheerGeneratorForm({ gameName, onCheerGenerated }: CheerGeneratorFormProps) {
  const initialState: CheerGenerationState = { message: undefined, error: undefined };
  const [state, formAction] = useFormState(handleGenerateCheer, initialState);
  
  React.useEffect(() => {
    if (state?.message && onCheerGenerated) {
      onCheerGenerated();
    }
  }, [state?.message, onCheerGenerated]);

  return (
    <Card className="w-full max-w-md shadow-lg rounded-xl">
      <CardHeader>
        <CardTitle className="font-headline text-2xl text-primary flex items-center">
          <MessageSquareHeart className="mr-2 h-6 w-6" />
          Cheer Generator
        </CardTitle>
        <CardDescription>Get a personalized cheer message for your performance in {gameName}!</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-6">
          <input type="hidden" name="gameName" value={gameName} />
          
          <div className="space-y-2">
            <Label htmlFor="playerName" className="text-foreground/80">Player Name</Label>
            <Input 
              id="playerName" 
              name="playerName" 
              placeholder="Enter your name (e.g., Idol Superstar)" 
              required 
              className="bg-background border-input focus:ring-primary"
              defaultValue={state?.fields?.playerName}
            />
            {state?.fields?.playerName && <p className="text-sm text-destructive">{state.fields.playerName}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="performance" className="text-foreground/80">Your Performance</Label>
            <Select name="performance" defaultValue="Good">
              <SelectTrigger id="performance" className="w-full bg-background border-input focus:ring-primary">
                <SelectValue placeholder="Select performance" />
              </SelectTrigger>
              <SelectContent>
                {performanceOptions.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <SubmitButton />
        </form>

        {state?.message && (
          <Alert variant="default" className="mt-6 bg-secondary border-primary/50">
            <Sparkles className="h-5 w-5 text-primary" />
            <AlertTitle className="font-headline text-primary">Cheer Message!</AlertTitle>
            <AlertDescription className="text-foreground">
              {state.message}
            </AlertDescription>
          </Alert>
        )}
        {state?.error && (
           <Alert variant="destructive" className="mt-6">
            <AlertTitle className="font-headline">Error</AlertTitle>
            <AlertDescription>
              {state.error}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
