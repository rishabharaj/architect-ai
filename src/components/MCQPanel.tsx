"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, Loader2, PenLine, Plus, BookOpen, FileCode, Download, ChevronDown } from "lucide-react";
import type { MCQuestion, GuideData } from "@/hooks/useArchitect";

interface MCQPanelProps {
  question: MCQuestion | null;
  isLoading: boolean;
  completedCategories: string[];
  onSelect: (questionId: string, category: string, selection: string) => void;
  onAddCategory: (category: string) => void;
  // Guided completion props
  phase?: "input" | "deciding" | "complete";
  guide?: GuideData | null;
  isGeneratingGuide?: boolean;
  onGenerateGuide?: () => void;
  onViewBlueprint?: () => void;
  onDownload?: (type: "md" | "pdf") => void;
  architectureCount?: number;
}

export function MCQPanel({ question, isLoading, completedCategories, onSelect, onAddCategory, phase, guide, isGeneratingGuide, onGenerateGuide, onViewBlueprint, onDownload, architectureCount = 0 }: MCQPanelProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);

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
      <div className="flex-1 overflow-y-auto p-4 pb-32 md:pb-4">
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
              className="flex flex-col items-center justify-center h-full gap-4"
            >
              {/* Success icon */}
              <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                <Check className="w-7 h-7 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-foreground">Architecture decisions complete!</p>
                <p className="text-xs text-muted-foreground mt-1">Follow the steps below to finish your blueprint</p>
              </div>

              {/* Guided steps */}
              <div className="w-full max-w-sm space-y-3 mt-2">
                {/* Step 1: Generate Guide */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${guide ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-primary text-primary-foreground'}`}>
                    {guide ? <Check className="w-3.5 h-3.5" /> : '1'}
                  </div>
                  <div className="flex-1">
                    {!guide ? (
                      <button
                        onClick={onGenerateGuide}
                        disabled={isGeneratingGuide}
                        className="w-full text-left p-3 rounded-lg border border-primary/40 bg-primary/5 hover:bg-primary/10 transition-all group disabled:opacity-70"
                      >
                        <div className="flex items-center gap-2">
                          {isGeneratingGuide ? (
                            <Loader2 className="w-4 h-4 text-primary animate-spin" />
                          ) : (
                            <BookOpen className="w-4 h-4 text-primary" />
                          )}
                          <span className="text-sm font-medium text-foreground">
                            {isGeneratingGuide ? 'Generating Guide...' : 'Generate Implementation Guide'}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">Get project structure, steps & deployment guide</p>
                      </button>
                    ) : (
                      <div className="p-3 rounded-lg border border-primary/20 bg-primary/5">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium text-primary">Guide Generated ✓</span>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Step 2: View Architecture */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-start gap-3"
                >
                  <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${guide ? 'bg-card border border-border text-foreground' : 'bg-card border border-border text-muted-foreground'}`}>
                    2
                  </div>
                  <button
                    onClick={onViewBlueprint}
                    className={`flex-1 text-left p-3 rounded-lg border transition-all group ${architectureCount > 0 ? 'border-border hover:border-primary/40 bg-card hover:bg-primary/5' : 'border-border/50 bg-card/50 opacity-60'}`}
                  >
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium text-foreground">View Architecture Blueprint</span>
                      {architectureCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-mono border border-primary/20 ml-auto">
                          {architectureCount}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">Review your tech stack decisions & guide</p>
                  </button>
                </motion.div>

                {/* Step 3: Download */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-start gap-3"
                >
                  <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${guide ? 'bg-card border border-border text-foreground' : 'bg-card border border-border text-muted-foreground'}`}>
                    3
                  </div>
                  <div className="flex-1">
                    <button
                      onClick={() => setShowDownloadOptions(!showDownloadOptions)}
                      disabled={!guide}
                      className={`w-full text-left p-3 rounded-lg border transition-all group ${guide ? 'border-border hover:border-primary/40 bg-card hover:bg-primary/5' : 'border-border/50 bg-card/50 opacity-60'}`}
                    >
                      <div className="flex items-center gap-2">
                        <Download className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium text-foreground">Download Blueprint</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground ml-auto transition-transform ${showDownloadOptions ? 'rotate-180' : ''}`} />
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">Export as Markdown or PDF</p>
                    </button>
                    <AnimatePresence>
                      {showDownloadOptions && guide && onDownload && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 flex gap-2"
                        >
                          <button
                            onClick={() => onDownload("md")}
                            className="flex-1 text-xs px-3 py-2 rounded-md border border-border bg-card hover:bg-secondary transition-colors text-foreground font-medium"
                          >
                            📄 Markdown
                          </button>
                          <button
                            onClick={() => onDownload("pdf")}
                            className="flex-1 text-xs px-3 py-2 rounded-md border border-border bg-card hover:bg-secondary transition-colors text-foreground font-medium"
                          >
                            📑 PDF
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
