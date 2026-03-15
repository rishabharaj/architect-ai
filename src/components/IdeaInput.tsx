"use client";

import { useState } from "react";
import { Cpu, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface IdeaInputProps {
  onSubmit: (idea: string) => void;
  isLoading: boolean;
}

const examples = [
  "A food delivery app for local restaurants",
  "A platform where students share notes",
  "An AI-powered resume builder",
  "A marketplace for freelance designers",
];

export function IdeaInput({ onSubmit, isLoading }: IdeaInputProps) {
  const [value, setValue] = useState("");

  const handleSubmit = () => {
    if (value.trim() && !isLoading) onSubmit(value.trim());
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-screen px-4"
    >
      <div className="flex items-center gap-3 mb-2">
        <Cpu className="w-8 h-8 text-primary" />
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Architect<span className="text-primary">AI</span>
        </h1>
      </div>
      <p className="text-muted-foreground mb-8 text-center max-w-lg">
        Transform your startup idea into a complete technical architecture
      </p>

      <div className="w-full max-w-2xl">
        <div className="relative glow-primary rounded-lg">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
            placeholder="Describe your startup idea..."
            className="w-full h-28 resize-none rounded-lg border border-border bg-card p-4 pr-14 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-sans"
          />
          <Button
            onClick={handleSubmit}
            disabled={!value.trim() || isLoading}
            size="icon"
            className="absolute bottom-3 right-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
          </Button>
        </div>

        <div className="mt-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
            <Sparkles className="w-3 h-3" /> Try an example
          </div>
          <div className="flex flex-wrap gap-2">
            {examples.map((ex) => (
              <button
                key={ex}
                onClick={() => setValue(ex)}
                className="text-xs px-3 py-1.5 rounded-md border border-border bg-secondary/50 text-secondary-foreground hover:bg-secondary hover:border-primary/30 transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
