import { motion } from "framer-motion";
import { WizardImage } from "@/components/brand/Logo";

const SUGGESTIONS = [
  { text: "Generate 6 months of content", pos: "top-2 left-6 md:left-12", delay: 0, premium: true },
  { text: "Make my Picture Looks Professional", pos: "top-10 right-6 md:right-16", delay: 0.1 },
  { text: "Generate a catchy Hooks", pos: "bottom-10 left-8 md:left-24", delay: 0.15 },
  { text: "Create a story about trending topics", pos: "bottom-4 right-8 md:right-20", delay: 0.2 },
];

export function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-2 md:px-6 md:py-3">
      <div className="text-center mb-2 md:mb-4 max-w-xl">
        <h1
          className="text-2xl md:text-5xl tracking-tight"
          style={{ fontFamily: "'Instrument Serif', serif" }}
        >
          <span className="italic">So smart it probably ignores your bad ideas.</span>
        </h1>
        <p className="mt-1 md:mt-2 text-sm md:text-base text-muted-foreground">How can Louis Smart help today?</p>
      </div>

      <div className="relative flex h-[150px] w-full max-w-3xl items-center justify-center sm:h-[200px] md:h-[300px]">
        {/* mascot */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <div
            className="absolute inset-0 blur-3xl opacity-40"
            style={{ background: "var(--gradient-primary)" }}
          />
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            <WizardImage className="h-32 w-32 object-contain drop-shadow-2xl sm:h-40 sm:w-40 md:h-72 md:w-72" />
          </motion.div>
        </motion.div>

        {/* Floating suggestion pills */}
        {SUGGESTIONS.map((s, i) => (
          <motion.button
            key={i}
            onClick={() => onPick(s.text)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 + s.delay, duration: 0.4 }}
            whileHover={{ y: -3, scale: 1.03 }}
            className={`absolute ${s.pos} hidden md:flex items-center gap-2 text-left rounded-3xl backdrop-blur-xl border transition cursor-pointer ${
              s.premium
                ? "px-7 py-6 text-base font-bold text-slate-900 bg-white/95 border-indigo-200/80 shadow-[0_20px_50px_-10px_rgba(99,102,241,0.25)] ring-1 ring-indigo-100 max-w-[260px] z-10"
                : "px-5 py-3.5 text-sm font-medium text-muted-foreground bg-card/80 border-border/70 shadow-[0_10px_30px_-10px_rgba(15,23,42,0.15)] hover:text-foreground hover:shadow-[0_16px_40px_-10px_rgba(15,23,42,0.25)] max-w-[220px]"
            }`}
          >
            {s.premium && (
              <motion.img
                src="/premium-crown.png"
                alt="premium"
                className="w-16 h-16 absolute -top-13 -right-5 z-20 pointer-events-none drop-shadow-lg"
                animate={{
                  y: [0, -6, 0],
                  rotate: [12, 15, 12],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            )}
            <span>
              {s.premium ? (
                <>
                  Generate 6<br />months of content
                </>
              ) : (
                s.text
              )}
            </span>
          </motion.button>
        ))}
      </div>



      {/* Mobile suggestion grid */}
      <div className="mt-3 grid w-full max-w-md grid-cols-2 gap-2 md:hidden">
        {SUGGESTIONS.slice(0, 4).map((s, i) => (
          <button
            key={i}
            onClick={() => onPick(s.text)}
            className="rounded-xl border border-border bg-card/60 px-3 py-2 text-xs text-left hover:bg-muted transition"
          >
            {s.text}
          </button>
        ))}
      </div>
    </div>
  );
}
