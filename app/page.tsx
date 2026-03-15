"use client";

import { useArchitect } from "@/hooks/useArchitect";
import { IdeaInput } from "@/components/IdeaInput";
import { MCQPanel } from "@/components/MCQPanel";
import { ArchitecturePanel } from "@/components/ArchitecturePanel";
import { AIChatPanel } from "@/components/AIChatPanel";
import { Cpu, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KnowledgeBasePanel } from "@/components/KnowledgeBasePanel";
import { toast } from "sonner";

export default function HomePage() {
  const {
    idea, phase, isAnalyzing, currentQuestion, architecture,
    completedCategories, guide, isGeneratingGuide,
    analyzeIdea, selectOption, addCategory, generateGuide, reset,
    persistState, blueprintId,
  } = useArchitect();

  const handleAddCategory = (category: string) => {
    addCategory(category);
    toast.success(`"${category}" added to decision queue`);
  };

  if (phase === "input") {
    return (
      <div className="min-h-screen grid-bg">
        <IdeaInput onSubmit={analyzeIdea} isLoading={isAnalyzing} />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col grid-bg">
      {/* Header */}
      <header className="h-12 border-b border-border flex items-center justify-between px-4 bg-card/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-primary" />
          <span className="text-sm font-bold text-foreground">
            Architect<span className="text-primary">AI</span>
          </span>
          <span className="text-[10px] text-muted-foreground font-mono ml-2 truncate max-w-[120px] sm:max-w-[300px] hidden sm:inline">
            — {idea}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <KnowledgeBasePanel />
          <Button variant="ghost" size="sm" onClick={reset} className="text-xs text-muted-foreground hover:text-foreground">
            <RotateCcw className="w-3 h-3 mr-1" /> Start Over
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="h-1/2 md:h-auto md:w-1/2 border-b md:border-b-0 md:border-r border-border overflow-auto">
          <MCQPanel
            question={currentQuestion}
            isLoading={isAnalyzing}
            completedCategories={completedCategories}
            onSelect={selectOption}
            onAddCategory={handleAddCategory}
          />
        </div>

        <div className="h-1/2 md:h-auto md:w-1/2 overflow-auto">
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

      <AIChatPanel idea={idea} architecture={architecture} blueprintId={blueprintId} />
    </div>
  );
}
