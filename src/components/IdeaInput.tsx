"use client";

import { useState } from "react";
import { Cpu, ArrowRight, Sparkles, Github, Linkedin, Heart } from "lucide-react";
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
      className="flex flex-col items-center justify-center min-h-screen px-4 relative pb-20"
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

      {/* Footer */}
      <div className="absolute bottom-6 w-full left-0 px-4 flex flex-col items-center gap-3 text-muted-foreground animate-in fade-in duration-700 delay-500">
        <div className="flex flex-wrap justify-center items-center gap-6">
          <a
            href="https://www.linkedin.com/in/rishabharaj-sharma-57a7a8256"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            <Linkedin className="w-5 h-5" />
          </a>
          <a
            href="https://github.com/rishabharaj"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            <Github className="w-5 h-5" />
          </a>
          <a
            href="https://discord.com/users/rishabharaj"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            <svg
              role="img"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5 fill-current"
            >
              <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
            </svg>
          </a>
        </div>
        <p className="text-sm flex items-center justify-center gap-1.5 flex-wrap text-center">
          Made with <Heart className="w-4 h-4 text-red-500 fill-red-500 shrink-0" /> by rishabharaj
        </p>
      </div>
    </motion.div>
  );
}
