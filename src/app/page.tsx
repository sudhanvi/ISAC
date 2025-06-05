import Link from 'next/link';
import Image from 'next/image';
import { miniGames } from '@/lib/data';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold text-center font-headline text-primary">
        Welcome to ISAC Studio!
      </h1>
      <p className="text-xl text-center text-foreground/80">
        Choose your challenge and become an ISAC champion!
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr">
        {miniGames.map((game) => (
          <Card key={game.id} className="flex flex-col overflow-hidden shadow-xl hover:shadow-2xl transition-shadow duration-300 ease-in-out bg-card rounded-xl">
            <CardHeader className="p-0">
               <div className="relative w-full h-48">
                <Image
                  src={game.imagePlaceholder}
                  alt={game.name}
                  layout="fill"
                  objectFit="cover"
                  data-ai-hint={game.aiHint}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <game.icon className="h-10 w-10 text-white drop-shadow-lg" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-grow p-6 space-y-3">
              <CardTitle className="font-headline text-2xl text-primary">{game.name}</CardTitle>
              <CardDescription className="text-foreground/70 text-sm line-clamp-3">{game.description}</CardDescription>
            </CardContent>
            <CardFooter className="p-6 bg-muted/30">
              <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold group">
                <Link href={game.href}>
                  Play Game
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
