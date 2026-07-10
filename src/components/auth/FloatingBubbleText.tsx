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
  "Social Analytics"
];

interface Bubble {
  id: string;
  text: string;
  x: number; // percentage width
  y: number; // percentage height
  size: number;
  speed: number;
  direction: number; // angle or oscillation helper
  popped: boolean;
}

export function FloatingBubbleText() {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);

  // Initialize bubbles
  useEffect(() => {
    const initialBubbles: Bubble[] = Array.from({ length: 6 }).map((_, i) => ({
      id: Math.random().toString(),
      text: PHRASES[i % PHRASES.length],
      x: Math.random() * 80 + 10, // keep away from edges
      y: Math.random() * 70 + 15,
      size: Math.random() * 8 + 14, // 14px to 22px
      speed: Math.random() * 0.03 + 0.02, // much slower vertical drift
      direction: Math.random() > 0.5 ? 1 : -1,
      popped: false,
    }));
    setBubbles(initialBubbles);
  }, []);

  // Animate/Float bubble positions
  useEffect(() => {
    const interval = setInterval(() => {
      setBubbles((prev) =>
        prev.map((b) => {
          if (b.popped) return b;
          // Slowly drift upwards and gently oscillate horizontally
          let newY = b.y - b.speed;
          let newX = b.x + Math.sin(Date.now() / 2000 + parseFloat(b.id)) * 0.04 * b.direction;

          // Wrap around if it goes off top screen
          if (newY < -10) {
            newY = 110;
            newX = Math.random() * 80 + 10;
          }

          return { ...b, x: newX, y: newY };
        })
      );
    }, 16); // 60fps for buttery smooth motion
    return () => clearInterval(interval);
  }, []);

  const handlePop = (id: string) => {
    // 1. Mark popped to trigger pop animation/disappear
    setBubbles((prev) =>
      prev.map((b) => (b.id === id ? { ...b, popped: true } : b))
    );

    // 2. Re-spawn a new bubble after 3.5 seconds
    setTimeout(() => {
      setBubbles((prev) => {
        // Remove the popped bubble and add a new one
        const filtered = prev.filter((b) => b.id !== id);
        const newBubble: Bubble = {
          id: Math.random().toString(),
          text: PHRASES[Math.floor(Math.random() * PHRASES.length)],
          x: Math.random() * 80 + 10,
          y: 110, // spawn from bottom
          size: Math.random() * 8 + 14,
          speed: Math.random() * 0.03 + 0.02,
          direction: Math.random() > 0.5 ? 1 : -1,
          popped: false,
        };
        return [...filtered, newBubble];
      });
    }, 3500);
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
      <AnimatePresence>
        {bubbles.map((b) => {
          if (b.popped) {
            // Popped animation (expansion & burst particle representation)
            return (
              <motion.div
                key={`pop-${b.id}`}
                className="absolute flex items-center justify-center pointer-events-none"
                style={{ left: `${b.x}%`, top: `${b.y}%`, transform: "translate(-50%, -50%)" }}
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: 2.2, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                {/* Bubble ring expanding */}
                <div className="w-20 h-20 rounded-full border border-indigo-400/40 bg-indigo-500/10 flex items-center justify-center">
                  {/* Little pop sparkles */}
                  <span className="absolute w-1.5 h-1.5 rounded-full bg-indigo-400 -top-2" />
                  <span className="absolute w-1.5 h-1.5 rounded-full bg-indigo-400 -bottom-2" />
                  <span className="absolute w-1.5 h-1.5 rounded-full bg-indigo-400 -left-2" />
                  <span className="absolute w-1.5 h-1.5 rounded-full bg-indigo-400 -right-2" />
                </div>
              </motion.div>
            );
          }

          return (
            <motion.div
              key={b.id}
              className="absolute pointer-events-auto cursor-pointer"
              style={{
                left: `${b.x}%`,
                top: `${b.y}%`,
                fontSize: `${b.size}px`,
                transform: "translate(-50%, -50%)",
              }}
              whileHover={{ scale: 1.08, y: -2 }}
              onClick={() => handlePop(b.id)}
            >
              <div className="px-4 py-2 rounded-full border border-indigo-500/15 bg-white/5 dark:bg-black/5 hover:bg-indigo-500/10 hover:border-indigo-500/40 text-indigo-900/60 dark:text-indigo-200/50 backdrop-blur-[2px] transition-all shadow-sm font-medium whitespace-nowrap cursor-pointer">
                {b.text}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
