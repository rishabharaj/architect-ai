"use client";

import { useState } from "react";
import { useArchitect } from "@/hooks/useArchitect";
import { useAuth } from "@/hooks/useAuth";
import { IdeaInput } from "@/components/IdeaInput";
import { MCQPanel } from "@/components/MCQPanel";
import { ArchitecturePanel } from "@/components/ArchitecturePanel";
import { AIChatPanel } from "@/components/AIChatPanel";
import { Cpu, RotateCcw, FileCode, X, Loader2, BookOpen, LogIn, LogOut, User, PanelLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KnowledgeBasePanel } from "@/components/KnowledgeBasePanel";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { downloadMarkdown, downloadPDF } from "@/lib/exportBlueprint";
import Link from "next/link";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

export default function HomePage() {
  const {
    idea, phase, isAnalyzing, currentQuestion, architecture,
    completedCategories, guide, isGeneratingGuide,
    analyzeIdea, selectOption, addCategory, generateGuide, reset, loadBlueprint,
    persistState, blueprintId,
  } = useArchitect();
  const { user, signOut } = useAuth();

  const [showArchMobile, setShowArchMobile] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleAddCategory = (category: string) => {
    addCategory(category);
    toast.success(`"${category}" added to decision queue`);
  };

  const handleDownload = async (type: "md" | "pdf") => {
    if (type === "md") downloadMarkdown(idea, architecture, guide);
    else await downloadPDF(idea, architecture, guide);
  };

  const handleViewBlueprint = () => {
    // On mobile: open the overlay. On desktop: scroll architecture panel into view
    if (window.innerWidth < 768) {
      setShowArchMobile(true);
    } else {
      // Desktop: architecture panel is always visible on the right
      const archPanel = document.querySelector('[data-arch-panel]');
      archPanel?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (phase === "input") {
    return (
      <SidebarProvider defaultOpen={true}>
        <AppSidebar 
          currentBlueprintId={blueprintId} 
          onSelectBlueprint={loadBlueprint} 
          onNewBlueprint={reset} 
        />
        <SidebarInset className="bg-transparent h-screen flex flex-col min-w-0">
          <div className="absolute top-4 left-4 z-50">
            {user ? (
              <SidebarTrigger className="w-8 h-8 bg-card border border-border shadow-sm text-foreground hover:text-accent flex items-center justify-center transition-colors rounded-md" />
            ) : (
              <Link href="/auth/signin">
                <Button variant="outline" size="sm" className="h-7 sm:h-8 bg-card border-border shadow-sm text-foreground hover:text-accent flex items-center justify-center text-[10px] sm:text-xs px-2 sm:px-3">
                  <LogIn className="w-3 h-3 mr-1.5" /> Sign In
                </Button>
              </Link>
            )}
          </div>
          <div className="flex-1 overflow-auto grid-bg relative">
            <IdeaInput onSubmit={analyzeIdea} isLoading={isAnalyzing} />
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar 
        currentBlueprintId={blueprintId} 
        onSelectBlueprint={loadBlueprint} 
        onNewBlueprint={reset} 
      />
      <SidebarInset className="bg-transparent h-screen flex flex-col min-w-0 grid-bg">
        {/* Header */}
        <header className="h-12 border-b border-border flex items-center justify-between px-2 sm:px-4 bg-card/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            {user && (
              <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors shrink-0" />
            )}
            <Cpu className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-foreground whitespace-nowrap">
              Architect<span className="text-primary">AI</span>
            </span>
            <span className="text-[10px] text-muted-foreground font-mono ml-1 truncate max-w-[80px] sm:max-w-[300px] hidden sm:inline">
              — {idea}
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <KnowledgeBasePanel />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={reset} 
              className="text-[10px] sm:text-xs bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 hover:border-emerald-500/40 text-emerald-300 hover:text-emerald-200 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] px-1.5 sm:px-2.5 h-7 sm:h-8 flex items-center gap-1 sm:gap-1.5 shadow-sm shadow-emerald-500/5 font-medium shrink-0"
            >
              <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Start New</span>
              <span className="inline sm:hidden">New</span>
            </Button>
            {!user && (
              <Link href="/auth/signin">
                <Button variant="ghost" size="sm" className="text-[10px] sm:text-xs text-primary hover:text-primary/80 shrink-0 px-1.5 sm:px-2 h-7 sm:h-8">
                  <LogIn className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1" />
                  <span className="hidden sm:inline">Sign In</span>
                  <span className="inline sm:hidden">Login</span>
                </Button>
              </Link>
            )}
          </div>
        </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 min-w-0">
        {/* MCQ Panel: full height on mobile, half on desktop */}
        <div className="flex-1 md:flex-none md:h-full md:w-1/2 border-b md:border-b-0 md:border-r border-border overflow-auto min-h-0 min-w-0">
          <MCQPanel
            question={currentQuestion}
            isLoading={isAnalyzing}
            completedCategories={completedCategories}
            onSelect={selectOption}
            onAddCategory={handleAddCategory}
            phase={phase}
            guide={guide}
            isGeneratingGuide={isGeneratingGuide}
            onGenerateGuide={generateGuide}
            onViewBlueprint={handleViewBlueprint}
            onDownload={handleDownload}
            architectureCount={architecture.length}
          />
        </div>

        {/* Architecture Panel: hidden on mobile (shown via overlay), visible on desktop */}
        <div data-arch-panel className="hidden md:block md:h-full md:w-1/2 overflow-auto min-h-0 min-w-0">
          <ArchitecturePanel
            idea={idea}
            architecture={architecture}
            guide={guide}
            isGeneratingGuide={isGeneratingGuide}
            phase={phase}
            onGenerateGuide={generateGuide}
            onPersistState={persistState}
          />
        </div>
      </div>

      {/* Mobile: Floating Blueprint Toggle Button */}
      {!showArchMobile && (
        <button
          onClick={() => setShowArchMobile(true)}
          className="md:hidden fixed bottom-20 right-4 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-card border border-border shadow-lg hover:border-primary/50 transition-all active:scale-95"
        >
          <FileCode className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-foreground">Blueprint</span>
          {architecture.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-mono border border-primary/20">
              {architecture.length}
            </span>
          )}
        </button>
      )}

      {/* Mobile: Architecture Panel Overlay */}
      <AnimatePresence>
        {showArchMobile && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowArchMobile(false)}
              className="md:hidden fixed inset-0 bg-black/50 z-40"
            />
            {/* Slide-up panel */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border rounded-t-2xl shadow-2xl"
              style={{ maxHeight: "80vh" }}
            >
              {/* Drag handle & close */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Architecture Blueprint</span>
                </div>
                <button
                  onClick={() => setShowArchMobile(false)}
                  className="rounded-full p-1.5 hover:bg-secondary transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              {/* Scrollable content */}
              <div className="overflow-y-auto" style={{ maxHeight: "calc(80vh - 52px)" }}>
                <ArchitecturePanel
                  idea={idea}
                  architecture={architecture}
                  guide={guide}
                  isGeneratingGuide={isGeneratingGuide}
                  phase={phase}
                  onGenerateGuide={generateGuide}
                  onPersistState={persistState}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Sticky bottom: Generate Implementation Guide button */}
      {phase === "complete" && !guide && (
        <div className="shrink-0 border-t border-border bg-card/95 backdrop-blur-sm px-4 py-3 z-30">
          <Button
            onClick={generateGuide}
            disabled={isGeneratingGuide}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isGeneratingGuide ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating Guide...</>
            ) : (
              <><BookOpen className="w-4 h-4 mr-2" />Generate Implementation Guide</>
            )}
          </Button>
        </div>
      )}

      <AIChatPanel idea={idea} architecture={architecture} blueprintId={blueprintId} />
      </SidebarInset>
    </SidebarProvider>
  );
}
