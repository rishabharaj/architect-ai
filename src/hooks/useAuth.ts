"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Check if there's an auth code in the URL (from OAuth redirect)
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code) {
      // Exchange the code for a session using the PKCE code_verifier stored by Supabase client
      supabase.auth.exchangeCodeForSession(code).then(({ data, error }) => {
        if (error) {
          console.error("Auth code exchange failed:", error);
        } else {
          setUser(data.session?.user ?? null);
        }
        setLoading(false);
        // Clean up the URL (remove ?code=xxx)
        window.history.replaceState({}, "", window.location.pathname);
      });
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setLoading(false);
      });
    }

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
