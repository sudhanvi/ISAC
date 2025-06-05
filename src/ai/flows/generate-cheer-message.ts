// use server'

/**
 * @fileOverview Cheer message generator.
 *
 * - generateCheerMessage - A function that generates an encouraging cheer message after each mini-game.
 * - GenerateCheerMessageInput - The input type for the generateCheerMessage function.
 * - GenerateCheerMessageOutput - The return type for the generateCheerMessage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateCheerMessageInputSchema = z.object({
  gameName: z.string().describe('The name of the mini-game played.'),
  performance: z.string().describe('The player performance in the mini-game (e.g., excellent, good, average, poor).'),
  playerName: z.string().describe('The name of the player.'),
});
export type GenerateCheerMessageInput = z.infer<typeof GenerateCheerMessageInputSchema>;

const GenerateCheerMessageOutputSchema = z.object({
  cheerMessage: z.string().describe('An encouraging cheer message based on the game and performance.'),
});
export type GenerateCheerMessageOutput = z.infer<typeof GenerateCheerMessageOutputSchema>;

export async function generateCheerMessage(input: GenerateCheerMessageInput): Promise<GenerateCheerMessageOutput> {
  return generateCheerMessageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateCheerMessagePrompt',
  input: {schema: GenerateCheerMessageInputSchema},
  output: {schema: GenerateCheerMessageOutputSchema},
  prompt: `You are a motivational coach for the KPOP ISAC (Idol Star Athletics Championships).

  Based on the mini-game that the player completed, and their performance, generate an encouraging cheer message to motivate them.
  The player's name is {{playerName}}.
  The name of the game is {{gameName}}.
  The player's performance was {{performance}}.
  
  The cheer message should be short, and tailored to the player's performance. Focus on encouragement and positivity.
  `,
});

const generateCheerMessageFlow = ai.defineFlow(
  {
    name: 'generateCheerMessageFlow',
    inputSchema: GenerateCheerMessageInputSchema,
    outputSchema: GenerateCheerMessageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
