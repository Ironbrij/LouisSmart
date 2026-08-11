import React from "react";
import { Sparkles, MessageSquare, Compass, Zap } from "lucide-react";

interface EmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
  isLoading?: boolean;
}

const SUGGESTIONS = [
  {
    icon: Sparkles,
    title: "Generate 6 months of Content",
    prompt: "Generate 6 months of content strategy and high-converting hooks for my brand.",
  },
  {
    icon: MessageSquare,
    title: "Create 20 Viral Hooks",
    prompt: "Give me 20 high-converting viral hooks based on my target audience psychology.",
  },
  {
    icon: Compass,
    title: "Build Customer Dream Table",
    prompt: "Dream",
  },
  {
    icon: Zap,
    title: "Write High-Converting Posts",
    prompt: "Posts",
  },
];

export const EmptyState: React.FC<EmptyStateProps> = ({ onSelectPrompt, isLoading }) => {
  const handleClick = (e: React.MouseEvent, prompt: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading) {
      onSelectPrompt(prompt);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Sparkles className="w-8 h-8 text-primary animate-pulse" />
      </div>

      <h1 className="text-3xl font-bold tracking-tight mb-2">
        What are we building today?
      </h1>
      <p className="text-muted-foreground max-w-md mb-8">
        Select a quick command below or type your strategy goals to begin.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl w-full">
        {SUGGESTIONS.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={index}
              type="button"
              onClick={(e) => handleClick(e, item.prompt)}
              disabled={isLoading}
              className="flex items-start p-4 text-left rounded-xl border border-border bg-card hover:bg-accent/50 hover:border-primary/50 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="p-2 rounded-lg bg-secondary text-secondary-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors mr-3 mt-0.5">
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <div className="font-semibold text-sm mb-1">{item.title}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">
                  "{item.prompt}"
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
