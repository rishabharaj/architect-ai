"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Bot, User, Copy, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { auth } from "@/lib/firebase";
import type { ArchitectureEntry } from "@/hooks/useArchitect";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIChatPanelProps {
  idea: string;
  architecture: ArchitectureEntry[];
  blueprintId?: string | null;
}

const CHAT_URL = "/api/architect-ai";

async function streamChat({
  idea,
  architecture,
  messages,
  message,
  onDelta,
  onDone,
  onError,
}: {
  idea: string;
  architecture: ArchitectureEntry[];
  messages: Message[];
  message: string;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "chat",
      idea,
      decisions: architecture,
      message,
      history: messages,
    }),
  });

  if (!resp.ok) {
    if (resp.status === 429) {
      onError("Rate limit exceeded. Please wait a moment and try again.");
      return;
    }
    onError("Something went wrong. Please try again.");
    return;
  }

  if (!resp.body) {
    onError("No response stream.");
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") {
        onDone();
        return;
      }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }

  // Flush remaining
  if (buffer.trim()) {
    for (let raw of buffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch { /* ignore */ }
    }
  }

  onDone();
}

function CopyButton({ text, className = "" }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={handleCopy}
      title="Copy"
      className={`p-1.5 rounded-md flex items-center justify-center transition-colors ${className}`}
    >
      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export function AIChatPanel({ idea, architecture, blueprintId }: AIChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const STORAGE_KEY = blueprintId ? `architect_chat_${blueprintId}` : 'architect_chat_local';

  // Load initial messages
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setMessages(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load chat history', e);
    }
  }, [STORAGE_KEY]);

  const saveToStorage = (newMessages: Message[]) => {
    try {
      if (newMessages.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newMessages));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to save chat history', e);
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  // Save a chat message (fire-and-forget) — placeholder for future DB integration
  const saveChatMessage = async (role: "user" | "assistant", content: string) => {
    if (!blueprintId) return;
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      // TODO: Save to Firestore when ready
      // For now we just check auth — no DB writes yet
    } catch {
      // Silent fail — chat saving shouldn't block UX
    }
  };

  const send = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const currentMessages = [...messages, userMsg];
    setMessages(currentMessages);
    saveToStorage(currentMessages);
    setInput("");
    setIsLoading(true);

    // Save user message to DB
    saveChatMessage("user", userMsg.content);

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      const snapshot = assistantSoFar;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        let nextMsgs: Message[];
        if (last?.role === "assistant") {
          nextMsgs = prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: snapshot } : m));
        } else {
          nextMsgs = [...prev, { role: "assistant", content: snapshot }];
        }
        saveToStorage(nextMsgs);
        return nextMsgs;
      });
    };

    try {
      await streamChat({
        idea,
        architecture,
        messages,
        message: userMsg.content,
        onDelta: upsertAssistant,
        onDone: () => {
          setIsLoading(false);
          // Save completed assistant response to DB
          if (assistantSoFar.trim()) {
            saveChatMessage("assistant", assistantSoFar);
          }
        },
        onError: (err) => {
          toast.error(err);
          setMessages((m) => [...m, { role: "assistant", content: err }]);
          setIsLoading(false);
        },
      });
    } catch {
      toast.error("Connection failed.");
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, connection failed." }]);
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-center gap-1">
        {!open && (
          <span className="text-[10px] font-semibold text-violet-400 tracking-wide">Chatbot</span>
        )}
        <button
          onClick={() => setOpen(!open)}
          className="w-12 h-12 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-lg hover:bg-violet-500 hover:scale-105 transition-all"
        >
          {open ? <X className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-20 right-3 left-3 sm:left-auto sm:right-5 z-50 sm:w-96 h-[70vh] sm:h-[500px] rounded-xl border border-border bg-card shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">AI Architect Assistant</span>
              </div>
              {messages.length > 0 && (
                <button
                  onClick={() => {
                    setMessages([]);
                    saveToStorage([]);
                  }}
                  title="Clear Chat"
                  className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-8">
                  Ask me about your architecture, APIs, deployment, or implementation details.
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 group ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && <Bot className="w-5 h-5 text-primary shrink-0 mt-1" />}
                  <div className="relative max-w-[80%] flex flex-col gap-1 items-start">
                    <div className={`w-full rounded-lg px-3 py-2 text-xs ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground whitespace-pre-wrap"
                        : "bg-secondary text-secondary-foreground chat-markdown"
                    }`}>
                      {msg.role === "assistant" ? (
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                            ul: ({ children }) => <ul className="list-disc ml-3 mb-1.5 space-y-0.5">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal ml-3 mb-1.5 space-y-0.5">{children}</ol>,
                            li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                            pre: ({ children }: any) => <>{children}</>,
                            code: ({ className, children, ...props }: any) => {
                              const isInline = !className;
                              if (isInline) {
                                return <code className="bg-background/80 text-primary px-1 py-0.5 rounded text-[10px] font-mono" {...props}>{children}</code>;
                              }
                              const text = String(children).replace(/\n$/, "");
                              return (
                                <div className="relative group/code my-1.5 rounded-md bg-[#1e1e1e] border border-border overflow-hidden shadow-sm">
                                  <div className="absolute right-1 top-1 opacity-0 group-hover/code:opacity-100 transition-opacity z-10 bg-[#1e1e1e]/80 rounded p-0.5">
                                    <CopyButton text={text} className="text-gray-400 hover:text-white" />
                                  </div>
                                  <pre className="p-3 m-0 overflow-x-auto">
                                    <code className={`text-[10px] font-mono text-gray-300 ${className || ""}`} {...props}>
                                      {children}
                                    </code>
                                  </pre>
                                </div>
                              );
                            },
                            h1: ({ children }) => <h1 className="text-sm font-bold mb-1">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-xs font-bold mb-1">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-xs font-semibold mb-1">{children}</h3>,
                            a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline">{children}</a>,
                            blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/30 pl-2 italic text-muted-foreground my-1.5">{children}</blockquote>,
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        msg.content
                      )}
                    </div>
                    {msg.role === "assistant" && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity -mt-0.5 ml-1">
                        <CopyButton text={msg.content} className="text-muted-foreground hover:text-foreground hover:bg-secondary/50 p-1" />
                      </div>
                    )}
                  </div>
                  {msg.role === "user" && <User className="w-5 h-5 text-muted-foreground shrink-0 mt-1" />}
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-2">
                  <Bot className="w-5 h-5 text-primary shrink-0" />
                  <div className="bg-secondary rounded-lg px-3 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-border">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                  placeholder="Ask about your architecture..."
                  className="flex-1 h-9 rounded-md border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                <Button onClick={send} size="icon" disabled={!input.trim() || isLoading} className="h-9 w-9 bg-primary text-primary-foreground">
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
