'use server';

import { generateCheerMessage, type GenerateCheerMessageInput } from '@/ai/flows/generate-cheer-message';
import { z } from 'zod';

const CheerSchema = z.object({
  gameName: z.string(),
  performance: z.string(),
  playerName: z.string().min(1, { message: "Player name cannot be empty." }),
});

export type CheerGenerationState = {
  message?: string;
  error?: string;
  fields?: Record<string, string>;
};

export async function handleGenerateCheer(
  prevState: CheerGenerationState,
  formData: FormData
): Promise<CheerGenerationState> {
  const validatedFields = CheerSchema.safeParse({
    gameName: formData.get('gameName'),
    performance: formData.get('performance'),
    playerName: formData.get('playerName'),
  });

  if (!validatedFields.success) {
    return {
      error: "Invalid input.",
      fields: {
        playerName: validatedFields.error.flatten().fieldErrors.playerName?.[0] ?? '',
        gameName: validatedFields.error.flatten().fieldErrors.gameName?.[0] ?? '',
        performance: validatedFields.error.flatten().fieldErrors.performance?.[0] ?? '',
      }
    };
  }
  
  const { gameName, performance, playerName } = validatedFields.data;

  try {
    const input: GenerateCheerMessageInput = { gameName, performance, playerName };
    const result = await generateCheerMessage(input);
    if (result.cheerMessage) {
      return { message: result.cheerMessage };
    } else {
      return { error: 'Failed to generate cheer message. The AI did not return a message.' };
    }
  } catch (e) {
    console.error(e);
    const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
    return { error: `Failed to generate cheer message: ${errorMessage}` };
  }
}
