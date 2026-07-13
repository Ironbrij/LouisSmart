import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PHRASES = [
  "6-Month Content Plan",
  "Viral Hooks",
  "Post Scheduler",
  "AI Copywriter",
  "SEO Optimizer",
  "Growth Strategy",
  "Engagement Boost",
  "N8N Automation",
  "Brand Identity",
  "Target Audience",
  "Content Calendar",
  "Social Analytics",
];

interface Bubble {
  id: string;
  text: string;
  x: number; // percentage width, fixed at spawn
  size: number;
  duration: number; // seconds for one full drift cycle
  delay: number;
  popped: boolean;
}

function randomBubble(spawnFromBottom: boolean): Bubble {
  return {
    id: Math.random().toString(36).slice(2),
    text: PHRASES[Math.floor(Math.random() * PHRASES.length)],
    x: Math.random() * 80 + 10,
    size: Math.random() * 8 + 14,
    duration: Math.random() * 10 + 18, // 18s - 28s per drift cycle, slow & gentle
    delay: spawnFromBottom ? 0 : Math.random() * -20, // stagger initial bubbles
    popped: false,
  };
}

export function FloatingBubbleText() {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  useEffect(() => {
    setBubbles(Array.from({ length: 6 }).map(() => randomBubble(false)));
  }, []);

  const handlePop = (id: string) => {
    setBubbles((prev) => prev.map((b) => (b.id === id ? { ...b, popped: true } : b)));
    setTimeout(() => {
      setBubbles((prev) => [...prev.filter((b) => b.id !== id), randomBubble(true)]);
    }, 3500);
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
      <AnimatePresence>
        {bubbles.map((b) => {
          if (b.popped) {
            return (
              <motion.div
                key={`pop-${b.id}`}
                className="absolute flex items-center justify-center pointer-events-none louis-bubble-drift"
                style={{ left: `${b.x}%`, ["--drift-duration" as any]: `${b.duration}s`, ["--drift-delay" as any]: `${b.delay}s` }}
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: 2.2, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <div className="w-20 h-20 rounded-full border border-indigo-400/40 bg-indigo-500/10 flex items-center justify-center">
                  <span className="absolute w-1.5 h-1.5 rounded-full bg-indigo-400 -top-2" />
                  <span className="absolute w-1.5 h-1.5 rounded-full bg-indigo-400 -bottom-2" />
                  <span className="absolute w-1.5 h-1.5 rounded-full bg-indigo-400 -left-2" />
                  <span className="absolute w-1.5 h-1.5 rounded-full bg-indigo-400 -right-2" />
                </div>
              </motion.div>
            );
          }

          return (
            <div
              key={b.id}
              className="absolute pointer-events-auto cursor-pointer louis-bubble-drift"
              style={{
                left: `${b.x}%`,
                fontSize: `${b.size}px`,
                ["--drift-duration" as any]: `${b.duration}s`,
                ["--drift-delay" as any]: `${b.delay}s`,
              }}
            >
              <motion.div
                whileHover={{ scale: 1.08, y: -2 }}
                onClick={() => handlePop(b.id)}
                className="px-4 py-2 rounded-full border border-indigo-500/15 bg-white/5 dark:bg-black/5 hover:bg-indigo-500/10 hover:border-indigo-500/40 text-indigo-900/60 dark:text-indigo-200/50 backdrop-blur-[2px] transition-all shadow-sm font-medium whitespace-nowrap cursor-pointer"
              >
                {b.text}
              </motion.div>
            </div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
