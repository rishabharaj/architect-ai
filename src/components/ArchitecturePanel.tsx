"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Server, FileCode, BookOpen, Rocket, Loader2, Download, FileText, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { downloadMarkdown, downloadPDF } from "@/lib/exportBlueprint";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ArchitectureEntry, GuideData } from "@/hooks/useArchitect";

interface ArchitecturePanelProps {
  idea: string;
  architecture: ArchitectureEntry[];
  guide: GuideData | null;
  isGeneratingGuide: boolean;
  phase: "input" | "deciding" | "complete";
  onGenerateGuide: () => void;
  onPersistState?: () => void;
}

const categoryIcons: Record<string, string> = {
  Platform: "🖥️", Frontend: "🎨", Backend: "⚙️", Database: "🗄️",
  Authentication: "🔐", Payments: "💳", Notifications: "🔔",
  Search: "🔍", Analytics: "📊", Deployment: "🚀",
  Infrastructure: "☁️", "Database Hosting": "💾", "CI/CD": "🔄",
};

export function ArchitecturePanel({ idea, architecture, guide, isGeneratingGuide, phase, onGenerateGuide, onPersistState }: ArchitecturePanelProps) {
  const { user } = useAuth();

  // Auto-trigger pending export after sign-in
  useEffect(() => {
    if (!user) return;
    try {
      const pendingExport = sessionStorage.getItem("architect-ai-pending-export");
      if (!pendingExport) return;
      sessionStorage.removeItem("architect-ai-pending-export");
      // Small delay to let state fully restore
      setTimeout(() => {
        if (pendingExport === "md") downloadMarkdown(idea, architecture, guide);
        else if (pendingExport === "pdf") downloadPDF(idea, architecture, guide);
      }, 500);
    } catch {}
  }, [user, idea, architecture, guide]);

  const handleGoogleLogin = async (pendingExportType?: "md" | "pdf") => {
    // Save current state before OAuth redirect so nothing is lost
    if (onPersistState) onPersistState();
    // Save pending export action so it auto-triggers after sign-in
    if (pendingExportType) {
      try { sessionStorage.setItem("architect-ai-pending-export", pendingExportType); } catch {}
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      toast.error("Google login failed. Please try again.");
      console.error("Google login error:", error);
    }
  };

  const handleExport = async (type: "md" | "pdf") => {
    if (type === "md") downloadMarkdown(idea, architecture, guide);
    else await downloadPDF(idea, architecture, guide);
  };

  if (phase === "input") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <Server className="w-10 h-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">Your architecture blueprint will appear here</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Architecture Blueprint</h3>
        </div>
        <div className="flex items-center gap-1">
          {!user && (
            <Button variant="ghost" size="sm" onClick={() => handleGoogleLogin()} className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
              <LogIn className="w-3 h-3 mr-1" /> Sign in
            </Button>
          )}
          {user && (
            <span className="text-[10px] text-muted-foreground mr-1 hidden sm:inline truncate max-w-[100px]">
              {user.email}
            </span>
          )}
          {architecture.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground">
                  <Download className="w-3 h-3 mr-1" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport("md")}>
                  <FileText className="w-3.5 h-3.5 mr-2" /> Markdown (.md)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("pdf")}>
                  <FileCode className="w-3.5 h-3.5 mr-2" /> PDF (.pdf)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <div className="p-4 space-y-2 flex-1">
        {architecture.map((entry, i) => (
          <motion.div
            key={`${entry.category}-${i}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-3 rounded-lg border border-border bg-card"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 shrink-0 max-w-[50%]">
                <span className="text-sm shrink-0">{categoryIcons[entry.category] || "📦"}</span>
                <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground truncate">{entry.category}</span>
              </div>
              <span className="text-sm font-medium text-primary text-right break-words pl-2">{entry.selection}</span>
            </div>
            {entry.details && (
              <div className="mt-2 pt-2 border-t border-border space-y-1.5">
                {entry.details.credentials && entry.details.credentials.length > 0 && (
                  <Detail label="Credentials" items={entry.details.credentials} />
                )}
                {entry.details.apis && entry.details.apis.length > 0 && (
                  <Detail label="APIs" items={entry.details.apis} />
                )}
                {entry.details.libraries && entry.details.libraries.length > 0 && (
                  <Detail label="Libraries" items={entry.details.libraries} />
                )}
              </div>
            )}
          </motion.div>
        ))}

        {architecture.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-8">
            Selections will appear as you make decisions...
          </div>
        )}
      </div>

      {phase === "complete" && !guide && (
        <div className="p-4 border-t border-border">
          <Button
            onClick={onGenerateGuide}
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

      {guide && (
        <div className="p-4 border-t border-border space-y-4">
          <div>
            <h4 className="text-xs font-mono uppercase tracking-widest text-primary mb-2 flex items-center gap-2">
              <Rocket className="w-3 h-3" /> Project Structure
            </h4>
            <div className="bg-secondary/50 rounded-md p-3 font-mono text-xs text-foreground space-y-0.5">
              {guide.projectStructure.map((p) => <div key={p}>{p}</div>)}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-mono uppercase tracking-widest text-primary mb-2">Implementation Steps</h4>
            <div className="space-y-2">
              {guide.implementationSteps.map((s) => (
                <div key={s.step} className="flex gap-3 items-start">
                  <span className="text-[10px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded border border-primary/20 shrink-0">
                    {s.step}
                  </span>
                  <div>
                    <p className="text-xs font-medium text-foreground">{s.title}</p>
                    <p className="text-[11px] text-muted-foreground">{s.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {guide.envVars.length > 0 && (
            <div>
              <h4 className="text-xs font-mono uppercase tracking-widest text-primary mb-2">Environment Variables</h4>
              <div className="bg-secondary/50 rounded-md p-3 font-mono text-[11px] text-accent space-y-0.5">
                {guide.envVars.map((v) => <div key={v}>{v}</div>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Detail({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <span className="text-[10px] font-mono uppercase text-muted-foreground">{label}: </span>
      <span className="text-[11px] text-foreground">{items.join(", ")}</span>
    </div>
  );
}
