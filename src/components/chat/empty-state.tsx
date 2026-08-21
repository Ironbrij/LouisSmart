import mascot from "@/assets/louis-mascot.png";

const SUGGESTIONS = [
  "Generate 6 months of content",
  "Make my picture look professional",
  "Generate a catchy hook",
  "Create a story about trending topics",
];

export function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="mx-auto flex h-full w-full max-w-[1100px] flex-1 flex-col items-center justify-center px-4 pb-2 pt-2 text-center sm:px-6">
      <h1 className="max-w-[980px] font-display text-[2.5rem] leading-[0.9] tracking-[-0.04em] text-foreground italic sm:text-[3.6rem] md:text-[4.8rem]">
        So smart it probably ignores your
        <span className="block">bad ideas.</span>
      </h1>

      <p className="mt-3 text-[1rem] text-muted-foreground sm:text-[1.25rem]">
        How can Louis Smart help today?
      </p>

      <div className="relative mt-1 flex w-full justify-center">
        <div className="pointer-events-none absolute inset-x-0 top-6 bottom-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(132,150,255,0.12),transparent_58%)]" />
        <img
          src={mascot}
          alt="Louis Smart mascot"
          width={768}
          height={1024}
          className="relative mx-auto h-[220px] w-auto object-contain sm:h-[260px] md:h-[300px]"
        />
      </div>

      <div className="mt-2 grid w-full max-w-[860px] gap-3 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="rounded-[1.5rem] border border-border/80 bg-white/40 px-5 py-3 text-left text-[1rem] font-medium text-foreground shadow-soft transition-colors hover:border-primary/40 hover:bg-accent/60"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
