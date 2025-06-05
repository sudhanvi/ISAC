import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type GameProgressBarProps = {
  currentProgress: number;
  totalGames: number;
  className?: string;
};

export default function GameProgressBar({ currentProgress, totalGames, className }: GameProgressBarProps) {
  const progressPercentage = totalGames > 0 ? (currentProgress / totalGames) * 100 : 0;

  return (
    <div className={cn("w-full", className)}>
      <div className="flex justify-between mb-1 text-sm font-medium text-primary">
        <span className="font-headline">Overall Progress</span>
        <span>{currentProgress} / {totalGames} Games</span>
      </div>
      <Progress value={progressPercentage} className="h-4 bg-primary/20 [&>div]:bg-gradient-to-r [&>div]:from-accent [&>div]:to-primary" />
      {currentProgress === totalGames && totalGames > 0 && (
        <p className="mt-2 text-center text-lg font-semibold text-accent font-headline">
          Congratulations! All games explored!
        </p>
      )}
    </div>
  );
}
