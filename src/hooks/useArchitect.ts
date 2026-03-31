"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";

const SESSION_KEY = "architect-ai-state";

export interface MCQOption {
  label: string;
  description: string;
}

export interface MCQuestion {
  id: string;
  category: string;
  question: string;
  options: MCQOption[];
  suggestions?: string[];
}

export interface ArchitectureEntry {
  category: string;
  selection: string;
  details?: {
    credentials?: string[];
    apis?: string[];
    libraries?: string[];
    services?: string[];
  };
}

export interface ImplementationStep {
  step: number;
  title: string;
  description: string;
}

export interface GuideData {
  projectStructure: string[];
  implementationSteps: ImplementationStep[];
  deploymentSteps: string[];
  envVars: string[];
}

export function useArchitect() {
  const [idea, setIdea] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<MCQuestion | null>(null);
  const [architecture, setArchitecture] = useState<ArchitectureEntry[]>([]);
  const [completedCategories, setCompletedCategories] = useState<string[]>([]);
  const [remainingCategories, setRemainingCategories] = useState<string[]>([]);
  const [guide, setGuide] = useState<GuideData | null>(null);
  const [isGeneratingGuide, setIsGeneratingGuide] = useState(false);
  const [phase, setPhase] = useState<"input" | "deciding" | "complete">("input");
  const [blueprintId, setBlueprintId] = useState<string | null>(null);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const restoredRef = useRef(false);

  // ── Persist state to localStorage so refreshes don't lose progress ──
  const persistState = useCallback((overrides?: Partial<{
    idea: string; architecture: ArchitectureEntry[]; completedCategories: string[];
    remainingCategories: string[]; guide: GuideData | null; phase: string;
    currentQuestion: MCQuestion | null; blueprintId: string | null;
  }>) => {
    try {
      const state = {
        idea: overrides?.idea ?? idea,
        architecture: overrides?.architecture ?? architecture,
        completedCategories: overrides?.completedCategories ?? completedCategories,
        remainingCategories: overrides?.remainingCategories ?? remainingCategories,
        guide: overrides?.guide ?? guide,
        phase: overrides?.phase ?? phase,
        currentQuestion: overrides?.currentQuestion ?? currentQuestion,
        blueprintId: overrides?.blueprintId ?? blueprintId,
        customCategories: customCategories,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(state));
    } catch {
      // localStorage may be unavailable
    }
  }, [idea, architecture, completedCategories, remainingCategories, guide, phase, currentQuestion, blueprintId, customCategories]);

  // ── Restore state from localStorage on mount (survives page refreshes) ──
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      if (!saved) return;
      const state = JSON.parse(saved);
      if (state.idea) setIdea(state.idea);
      if (state.architecture?.length) setArchitecture(state.architecture);
      if (state.completedCategories?.length) setCompletedCategories(state.completedCategories);
      if (state.remainingCategories?.length) setRemainingCategories(state.remainingCategories);
      if (state.guide) setGuide(state.guide);
      if (state.phase && state.phase !== "input") setPhase(state.phase);
      if (state.currentQuestion) setCurrentQuestion(state.currentQuestion);
      if (state.blueprintId) setBlueprintId(state.blueprintId);
      if (state.customCategories?.length) setCustomCategories(state.customCategories);
    } catch {
      // Ignore parse errors
    }
  }, []);

  // ── Auto-save state to localStorage on every meaningful change ──
  useEffect(() => {
    // Skip auto-save until initial restore is done
    if (!restoredRef.current) return;
    // Only persist when user has started a session
    if (phase === "input" && !idea) return;
    try {
      const state = {
        idea, architecture, completedCategories, remainingCategories,
        guide, phase, currentQuestion, blueprintId, customCategories,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(state));
    } catch {
      // localStorage may be unavailable
    }
  }, [idea, architecture, completedCategories, remainingCategories, guide, phase, currentQuestion, blueprintId, customCategories]);

  // Save blueprint — placeholder for future Firestore integration
  const saveBlueprint = useCallback(async (
    currentIdea: string,
    currentArch: ArchitectureEntry[],
    currentCompleted: string[],
    currentRemaining: string[],
    currentGuide: GuideData | null,
    currentPhase: string,
    currentBlueprintId: string | null,
  ) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return currentBlueprintId;
      // TODO: Save to Firestore when ready
      // For now, state is persisted via localStorage
      return currentBlueprintId;
    } catch (err) {
      console.error("Failed to save blueprint:", err);
      return currentBlueprintId;
    }
  }, [customCategories]);

  // Call Next.js API route instead of Supabase edge function
  const callArchitectAPI = useCallback(async (body: any) => {
    const res = await fetch("/api/architect-ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({ error: "Request failed" }));
      throw new Error(errData.error || `Request failed with status ${res.status}`);
    }
    return res.json();
  }, []);

  const analyzeIdea = useCallback(async (userIdea: string) => {
    setIdea(userIdea);
    setIsAnalyzing(true);
    setPhase("deciding");
    try {
      const data = await callArchitectAPI({ action: "analyze", idea: userIdea });

      const cats = data?.categories as string[] || [];
      const remaining = cats.slice(1);
      setRemainingCategories(remaining);
      if (data?.question) setCurrentQuestion(data.question);

      const id = await saveBlueprint(userIdea, [], [], remaining, null, "deciding", null);
      if (id) setBlueprintId(id);
    } catch (err: any) {
      console.error("Analysis failed:", err);
      if (err?.message) toast.error(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  }, [saveBlueprint, callArchitectAPI]);

  const selectOption = useCallback(async (questionId: string, category: string, selection: string) => {
    setIsAnalyzing(true);
    const newEntry: ArchitectureEntry = { category, selection };
    const updatedArch = [...architecture, newEntry];
    const updatedCategories = [...completedCategories, category];
    setArchitecture(updatedArch);
    setCompletedCategories(updatedCategories);

    const updatedRemaining = remainingCategories.filter(c => c !== category);
    setRemainingCategories(updatedRemaining);

    try {
      const data = await callArchitectAPI({
        action: "next_question",
        idea,
        decisions: updatedArch,
        completedCategories: updatedCategories,
        remainingCategories: updatedRemaining,
      });

      let finalArch = updatedArch;
      if (data?.question) {
        setCurrentQuestion(data.question);
      }
      if (data?.details) {
        finalArch = [...updatedArch];
        finalArch[finalArch.length - 1] = { ...finalArch[finalArch.length - 1], details: data.details };
        setArchitecture(finalArch);
      }

      let newPhase: "deciding" | "complete" = "deciding";
      if (data?.complete) {
        setCurrentQuestion(null);
        setPhase("complete");
        newPhase = "complete";
      }

      const id = await saveBlueprint(idea, finalArch, updatedCategories, updatedRemaining, null, newPhase, blueprintId);
      if (id) setBlueprintId(id);
    } catch (err: any) {
      console.error("Next question failed:", err);
      if (err?.message) toast.error(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  }, [idea, architecture, completedCategories, remainingCategories, blueprintId, saveBlueprint, callArchitectAPI]);

  const addCategory = useCallback((category: string) => {
    if (!completedCategories.includes(category) && !remainingCategories.includes(category)) {
      setRemainingCategories(prev => [...prev, category]);
      setCustomCategories(prev => [...prev, category]);
    }
  }, [completedCategories, remainingCategories]);

  const generateGuide = useCallback(async () => {
    setIsGeneratingGuide(true);
    try {
      const data = await callArchitectAPI({
        action: "generate_guide",
        idea,
        decisions: architecture,
      });
      if (data?.guide) {
        setGuide(data.guide);
        await saveBlueprint(idea, architecture, completedCategories, remainingCategories, data.guide, "complete", blueprintId);
      }
    } catch (err: any) {
      console.error("Guide generation failed:", err);
      if (err?.message) toast.error(err.message);
    } finally {
      setIsGeneratingGuide(false);
    }
  }, [idea, architecture, completedCategories, remainingCategories, blueprintId, saveBlueprint, callArchitectAPI]);

  const reset = useCallback(() => {
    setIdea("");
    setCurrentQuestion(null);
    setArchitecture([]);
    setCompletedCategories([]);
    setRemainingCategories([]);
    setGuide(null);
    setPhase("input");
    setIsGeneratingGuide(false);
    setBlueprintId(null);
    setCustomCategories([]);
    try { localStorage.removeItem(SESSION_KEY); } catch {}
  }, []);

  // Load saved blueprints — placeholder for future Firestore integration
  const loadBlueprint = useCallback(async (id: string) => {
    // TODO: Load from Firestore when ready
    // For now, state is persisted via localStorage
    console.log("loadBlueprint called with id:", id);
  }, []);

  return {
    idea, phase, isAnalyzing, currentQuestion, architecture,
    completedCategories, remainingCategories, guide, isGeneratingGuide,
    analyzeIdea, selectOption, addCategory, generateGuide, reset, loadBlueprint, blueprintId,
    persistState,
  };
}
