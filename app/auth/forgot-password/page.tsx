"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Cpu, Mail, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading(true);
    
    await resetPassword(email);
    
    setIsLoading(false);
    
    // For security reasons, we always show a success message 
    // to prevent email enumeration attacks.
    toast.success("Reset link sent!");
    setIsSuccess(true);
  };

  return (
    <div className="min-h-screen grid-bg flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="relative rounded-2xl border border-border bg-card/80 backdrop-blur-xl shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full" />

          <div className="p-8">
            {isSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-6 text-center"
              >
                <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-6 border border-primary/20">
                  <Mail className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3">Check Your Inbox!</h2>
                <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                  If an account exists for <br/>
                  <span className="text-foreground font-medium">{email}</span> <br/><br/>
                  we have sent a password reset link.
                </p>
                <Button 
                  onClick={() => router.push("/auth/signin")}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium transition-all"
                >
                  Return to Sign In
                </Button>
              </motion.div>
            ) : (
              <>
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="flex flex-col items-center mb-8"
                >
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                      <Cpu className="w-6 h-6 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                      Architect<span className="text-primary">AI</span>
                    </h1>
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Enter your email to receive a password reset link.
                  </p>
                </motion.div>

                <motion.form
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  onSubmit={handleReset}
                  className="space-y-4"
                >
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      required
                      className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-background/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all text-sm"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading || !email.trim()}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm transition-all duration-200 glow-primary"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ArrowRight className="w-4 h-4 mr-2" />
                    )}
                    Send Reset Link
                  </Button>
                </motion.form>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  className="text-center text-sm text-muted-foreground mt-6"
                >
                  Remembered your password?{" "}
                  <Link
                    href="/auth/signin"
                    className="text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    Sign In
                  </Link>
                </motion.p>
              </>
            )}
          </div>
        </div>

        {/* Back to home */}
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ delay: 0.35 }}
           className="text-center mt-6"
        >
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to ArchitectAI
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}
