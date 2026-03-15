-- ============================================================
-- Architect AI — Complete Supabase SQL Schema
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- ── 1. BLUEPRINTS TABLE ─────────────────────────────────────
-- Stores each user's architecture session:
--   • idea (prompt)
--   • architecture decisions (AI response)
--   • custom categories added by user
--   • implementation guide
-- ============================================================

-- Drop existing table if you want a clean start (CAUTION: deletes data)
-- DROP TABLE IF EXISTS public.chat_messages;
-- DROP TABLE IF EXISTS public.blueprints;

CREATE TABLE IF NOT EXISTS public.blueprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- The user's startup idea (prompt)
  idea TEXT NOT NULL,

  -- AI-generated architecture decisions
  -- Format: [{"category": "Backend", "selection": "Node.js", "details": {"apis": [...], "libraries": [...]}}]
  architecture JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Categories that have been answered
  completed_categories JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Categories still pending (includes custom ones added by user)
  remaining_categories JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Custom categories added by the user manually (via "Add Category" or suggestions)
  custom_categories JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Implementation guide generated at the end
  -- Format: {"projectStructure": [...], "implementationSteps": [...], "deploymentSteps": [...], "envVars": [...]}
  guide JSONB,

  -- Current phase: 'input' | 'deciding' | 'complete'
  phase TEXT NOT NULL DEFAULT 'input',

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ── 2. CHAT MESSAGES TABLE ──────────────────────────────────
-- Stores all AI chat messages per blueprint session
-- ============================================================

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blueprint_id UUID REFERENCES public.blueprints(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- 'user' or 'assistant'
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),

  -- The message content
  content TEXT NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ── 3. ROW LEVEL SECURITY ───────────────────────────────────
-- Users can only see/modify their own data
-- ============================================================

ALTER TABLE public.blueprints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own blueprints" ON public.blueprints
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own blueprints" ON public.blueprints
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own blueprints" ON public.blueprints
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own blueprints" ON public.blueprints
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat messages" ON public.chat_messages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat messages" ON public.chat_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat messages" ON public.chat_messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ── 4. INDEXES ──────────────────────────────────────────────
-- Fast lookups for user dashboards
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_blueprints_user_id ON public.blueprints(user_id);
CREATE INDEX IF NOT EXISTS idx_blueprints_created_at ON public.blueprints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_blueprint_id ON public.chat_messages(blueprint_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);

-- ── 5. AUTO-UPDATE updated_at ───────────────────────────────
-- Automatically set updated_at on every UPDATE
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_blueprints_updated_at ON public.blueprints;
CREATE TRIGGER set_blueprints_updated_at
  BEFORE UPDATE ON public.blueprints
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
