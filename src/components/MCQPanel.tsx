"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, Loader2, PenLine, Plus } from "lucide-react";
import type { MCQuestion } from "@/hooks/useArchitect";

interface MCQPanelProps {
  question: MCQuestion | null;
  isLoading: boolean;
  completedCategories: string[];
  onSelect: (questionId: string, category: string, selection: string) => void;
  onAddCategory: (category: string) => void;
}

export function MCQPanel({ question, isLoading, completedCategories, onSelect, onAddCategory }: MCQPanelProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  const handleCustomSubmit = () => {
    if (!customValue.trim() || !question) return;
    onSelect(question.id, question.category, customValue.trim());
    setCustomValue("");
    setShowCustomInput(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    onAddCategory(suggestion);
  };

  const handleAddCustomCategory = () => {
    if (!newCategory.trim()) return;
    onAddCategory(newCategory.trim());
    setNewCategory("");
    setShowAddCategory(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>Architecture Progress</span>
          <span>{completedCategories.length} completed</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {completedCategories.map((cat) => (
            <span
              key={cat}
              className="text-[9px] px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/20 font-mono"
            >
              {cat} ✓
            </span>
          ))}
          {question && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/20 font-mono animate-pulse">
              {question.category}
            </span>
          )}
        </div>
      </div>

      {/* Question area */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {isLoading && !question ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full gap-3"
            >
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Analyzing your idea...</p>
            </motion.div>
          ) : question ? (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-primary px-2 py-0.5 rounded bg-primary/10 border border-primary/20">
                  {question.category}
                </span>
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-4">{question.question}</h2>

              <div className="space-y-2">
                {question.options.map((opt) => (
                  <button
                    key={opt.label}
                    disabled={isLoading}
                    onClick={() => {
                      setShowCustomInput(false);
                      onSelect(question.id, question.category, opt.label);
                    }}
                    className="w-full text-left p-3 rounded-lg border border-border bg-card hover:border-primary/50 hover:bg-primary/5 transition-all group disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground text-sm">{opt.label}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{opt.description}</p>
                  </button>
                ))}

                {/* Other / Custom option */}
                {!showCustomInput ? (
                  <button
                    disabled={isLoading}
                    onClick={() => setShowCustomInput(true)}
                    className="w-full text-left p-3 rounded-lg border border-dashed border-border bg-card/50 hover:border-primary/50 hover:bg-primary/5 transition-all group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2">
                      <PenLine className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                      <span className="font-medium text-muted-foreground group-hover:text-foreground text-sm">Other (type your own)</span>
                    </div>
                  </button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-3 rounded-lg border border-primary/30 bg-primary/5"
                  >
                    <input
                      autoFocus
                      value={customValue}
                      onChange={(e) => setCustomValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleCustomSubmit(); if (e.key === "Escape") setShowCustomInput(false); }}
                      placeholder={`Enter your ${question.category.toLowerCase()} choice...`}
                      className="w-full h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleCustomSubmit}
                        disabled={!customValue.trim()}
                        className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        Submit
                      </button>
                      <button
                        onClick={() => { setShowCustomInput(false); setCustomValue(""); }}
                        className="text-xs px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Add custom category section */}
              <div className="mt-5 p-3 rounded-lg border border-border bg-secondary/30">
                <p className="text-xs text-muted-foreground mb-2">Click to add as a decision category:</p>
                <div className="flex flex-wrap gap-1.5">
                  {question.suggestions && question.suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSuggestionClick(s)}
                      className="text-[11px] px-2 py-1 rounded bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 hover:border-accent/40 transition-colors cursor-pointer"
                    >
                      + {s}
                    </button>
                  ))}

                  {!showAddCategory ? (
                    <button
                      onClick={() => setShowAddCategory(true)}
                      className="text-[11px] px-2 py-1 rounded bg-primary/10 text-primary border border-dashed border-primary/30 hover:bg-primary/20 hover:border-primary/50 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add your own
                    </button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      className="flex items-center gap-1"
                    >
                      <input
                        autoFocus
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleAddCustomCategory();
                          if (e.key === "Escape") { setShowAddCategory(false); setNewCategory(""); }
                        }}
                        placeholder="e.g. Push Notifications"
                        className="h-7 w-40 rounded border border-primary/30 bg-background px-2 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                      <button
                        onClick={handleAddCustomCategory}
                        disabled={!newCategory.trim()}
                        className="text-[11px] px-2 py-1 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        Add
                      </button>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="complete"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full gap-3"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                <Check className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm text-foreground font-medium">Architecture decisions complete!</p>
              <p className="text-xs text-muted-foreground">View your blueprint on the right panel</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
