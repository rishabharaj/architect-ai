"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ArrowLeft, CheckCircle2, XCircle, Key, Package, Columns2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TechOption {
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  credentials: string[];
  libraries: string[];
  bestFor: string;
}

interface KBCategory {
  name: string;
  icon: string;
  options: TechOption[];
}

const knowledgeBase: KBCategory[] = [
  {
    name: "Frontend",
    icon: "🖥️",
    options: [
      {
        name: "Next.js",
        description: "Full-stack React framework with SSR, SSG, and API routes.",
        pros: ["SEO-friendly SSR/SSG", "File-based routing", "Built-in API routes", "Excellent DX"],
        cons: ["Vercel lock-in risk", "Complex caching model", "Heavier bundle than SPA"],
        credentials: [],
        libraries: ["next", "react", "react-dom"],
        bestFor: "Content-heavy apps, SEO-critical products, full-stack projects",
      },
      {
        name: "React + Vite",
        description: "Lightweight SPA setup with blazing-fast HMR.",
        pros: ["Ultra-fast dev server", "Minimal config", "Flexible deployment", "Small footprint"],
        cons: ["No SSR out of box", "Manual routing setup", "No built-in API layer"],
        credentials: [],
        libraries: ["react", "react-dom", "vite", "react-router-dom"],
        bestFor: "SPAs, dashboards, internal tools, rapid prototyping",
      },
      {
        name: "Remix",
        description: "Web-standard focused framework with nested routing.",
        pros: ["Progressive enhancement", "Nested layouts", "Web standards first", "Great error handling"],
        cons: ["Smaller ecosystem", "Learning curve", "Less community resources"],
        credentials: [],
        libraries: ["@remix-run/react", "@remix-run/node"],
        bestFor: "Complex UIs with nested data needs, progressive web apps",
      },
    ],
  },
  {
    name: "Backend",
    icon: "⚙️",
    options: [
      {
        name: "Supabase",
        description: "Open-source Firebase alternative with Postgres, Auth, and Realtime.",
        pros: ["Instant API from schema", "Built-in auth", "Realtime subscriptions", "Row-level security"],
        cons: ["Postgres-only", "Vendor-specific RLS syntax", "Limited compute for complex logic"],
        credentials: ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"],
        libraries: ["@supabase/supabase-js"],
        bestFor: "MVPs, real-time apps, projects needing fast auth + DB setup",
      },
      {
        name: "Node.js + Express",
        description: "Flexible, minimal backend framework for custom APIs.",
        pros: ["Maximum flexibility", "Huge ecosystem", "Easy to learn", "Great for microservices"],
        cons: ["Everything is manual", "No built-in ORM", "Security is DIY"],
        credentials: [],
        libraries: ["express", "cors", "helmet", "dotenv"],
        bestFor: "Custom APIs, microservices, when you need full control",
      },
      {
        name: "Firebase",
        description: "Google's serverless backend with NoSQL, Auth, and Cloud Functions.",
        pros: ["Zero server management", "Great mobile SDKs", "Generous free tier", "Real-time DB"],
        cons: ["NoSQL limitations", "Vendor lock-in", "Complex pricing at scale", "Limited querying"],
        credentials: ["FIREBASE_API_KEY", "FIREBASE_PROJECT_ID", "FIREBASE_AUTH_DOMAIN"],
        libraries: ["firebase", "firebase-admin"],
        bestFor: "Mobile apps, rapid prototypes, real-time features",
      },
    ],
  },
  {
    name: "Database",
    icon: "🗄️",
    options: [
      {
        name: "PostgreSQL",
        description: "Advanced open-source relational database.",
        pros: ["ACID compliant", "Rich data types (JSONB)", "Extensions ecosystem", "Battle-tested"],
        cons: ["Complex tuning", "Vertical scaling limits", "Steeper learning curve"],
        credentials: ["DATABASE_URL"],
        libraries: ["pg", "prisma", "drizzle-orm"],
        bestFor: "Complex queries, relational data, financial applications",
      },
      {
        name: "MongoDB",
        description: "Document-oriented NoSQL database.",
        pros: ["Flexible schema", "Horizontal scaling", "Great for unstructured data", "Easy to start"],
        cons: ["No ACID by default", "Memory hungry", "Weak joins", "Data duplication"],
        credentials: ["MONGODB_URI"],
        libraries: ["mongoose", "mongodb"],
        bestFor: "Content management, IoT, rapidly evolving schemas",
      },
      {
        name: "PlanetScale",
        description: "Serverless MySQL platform with branching workflows.",
        pros: ["Git-like branching", "Serverless scaling", "Non-blocking schema changes", "MySQL compatible"],
        cons: ["No foreign keys", "MySQL only", "Cost at scale", "Limited regions"],
        credentials: ["DATABASE_URL"],
        libraries: ["@planetscale/database", "prisma"],
        bestFor: "High-traffic apps, teams wanting DB branching, MySQL shops",
      },
    ],
  },
  {
    name: "Authentication",
    icon: "🔐",
    options: [
      {
        name: "Supabase Auth",
        description: "Built-in auth with email, OAuth, and magic links.",
        pros: ["Integrated with DB", "Row-level security", "Multiple providers", "Free tier"],
        cons: ["Tied to Supabase", "Limited customization", "Email templates basic"],
        credentials: ["SUPABASE_URL", "SUPABASE_ANON_KEY"],
        libraries: ["@supabase/supabase-js"],
        bestFor: "Supabase projects, quick auth setup, RLS-based security",
      },
      {
        name: "Clerk",
        description: "Drop-in auth with pre-built UI components.",
        pros: ["Beautiful pre-built UI", "Easy integration", "Multi-factor auth", "Organization support"],
        cons: ["Pricing at scale", "Vendor lock-in", "Limited free tier"],
        credentials: ["CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"],
        libraries: ["@clerk/nextjs", "@clerk/clerk-react"],
        bestFor: "SaaS products, teams wanting quick beautiful auth",
      },
      {
        name: "NextAuth.js",
        description: "Flexible open-source auth for Next.js.",
        pros: ["Open source", "Many providers", "Database adapters", "Full control"],
        cons: ["Next.js only", "Complex config", "Breaking changes between versions"],
        credentials: ["NEXTAUTH_SECRET", "NEXTAUTH_URL"],
        libraries: ["next-auth"],
        bestFor: "Next.js projects needing custom auth flows",
      },
    ],
  },
  {
    name: "Payments",
    icon: "💳",
    options: [
      {
        name: "Stripe",
        description: "Industry-standard payment processing platform.",
        pros: ["Excellent docs", "Subscription support", "Global payments", "Webhooks"],
        cons: ["Complex API", "Fees add up", "Disputes handling", "Learning curve"],
        credentials: ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_SECRET"],
        libraries: ["stripe", "@stripe/stripe-js", "@stripe/react-stripe-js"],
        bestFor: "SaaS subscriptions, marketplaces, e-commerce",
      },
      {
        name: "Lemon Squeezy",
        description: "Merchant of record for digital products.",
        pros: ["Handles taxes/VAT", "Simple API", "Built-in checkout", "Digital product focus"],
        cons: ["Higher fees", "Less customizable", "Smaller ecosystem", "Limited regions"],
        credentials: ["LEMONSQUEEZY_API_KEY", "LEMONSQUEEZY_WEBHOOK_SECRET"],
        libraries: ["@lemonsqueezy/lemonsqueezy.js"],
        bestFor: "Digital products, indie hackers, global tax compliance",
      },
    ],
  },
  {
    name: "Deployment",
    icon: "🚀",
    options: [
      {
        name: "Vercel",
        description: "Optimized platform for frontend frameworks.",
        pros: ["Zero-config deploys", "Edge network", "Preview deployments", "Great DX"],
        cons: ["Expensive at scale", "Vendor lock-in", "Cold starts", "Limited compute"],
        credentials: ["VERCEL_TOKEN"],
        libraries: ["vercel"],
        bestFor: "Next.js apps, JAMstack sites, frontend-heavy projects",
      },
      {
        name: "Railway",
        description: "Simple cloud platform for full-stack apps.",
        pros: ["One-click deploy", "Built-in databases", "Fair pricing", "Great logs"],
        cons: ["Smaller community", "Limited regions", "No edge functions"],
        credentials: ["RAILWAY_TOKEN"],
        libraries: [],
        bestFor: "Full-stack apps, backend services, side projects",
      },
      {
        name: "Docker + Fly.io",
        description: "Container-based deployment on edge infrastructure.",
        pros: ["Run anywhere", "Edge deployment", "Persistent volumes", "Low latency"],
        cons: ["Docker knowledge needed", "Config complexity", "Debugging harder"],
        credentials: ["FLY_API_TOKEN"],
        libraries: [],
        bestFor: "Custom runtimes, edge computing, global low-latency apps",
      },
    ],
  },
];

type View = "categories" | "options" | "detail" | "compare-select" | "compare-view";

export function KnowledgeBasePanel() {
  const [selectedCategory, setSelectedCategory] = useState<KBCategory | null>(null);
  const [selectedTech, setSelectedTech] = useState<TechOption | null>(null);
  const [view, setView] = useState<View>("categories");
  const [compareItems, setCompareItems] = useState<TechOption[]>([]);

  const handleBack = () => {
    if (view === "detail") {
      setSelectedTech(null);
      setView("options");
    } else if (view === "options" || view === "compare-select") {
      setSelectedCategory(null);
      setView("categories");
      setCompareItems([]);
    } else if (view === "compare-view") {
      setView("compare-select");
    } else {
      setSelectedCategory(null);
      setView("categories");
    }
  };

  const toggleCompareItem = (tech: TechOption) => {
    setCompareItems((prev) =>
      prev.find((t) => t.name === tech.name)
        ? prev.filter((t) => t.name !== tech.name)
        : prev.length < 2 ? [...prev, tech] : [prev[1], tech]
    );
  };

  const title = (() => {
    if (view === "compare-view") return "⚖️ Side-by-Side Comparison";
    if (view === "compare-select") return `Select 2 to Compare`;
    if (selectedTech) return selectedTech.name;
    if (selectedCategory) return `${selectedCategory.icon} ${selectedCategory.name}`;
    return "📚 Knowledge Base";
  })();

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
          <BookOpen className="w-3 h-3 mr-1" /> Knowledge Base
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className={`p-0 bg-card border-border ${view === "compare-view" ? "w-full sm:max-w-2xl" : "w-full sm:max-w-lg"}`}
      >
        <SheetHeader className="p-4 pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            {view !== "categories" && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <SheetTitle className="text-sm font-bold text-foreground">{title}</SheetTitle>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-4rem)]">
          <div className="p-4 space-y-3">
            {/* Category list */}
            {view === "categories" && (
              <>
                <p className="text-xs text-muted-foreground mb-4">
                  Research technologies before making architecture decisions.
                </p>
                {knowledgeBase.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => { setSelectedCategory(cat); setView("options"); }}
                    className="w-full text-left p-3 rounded-lg border border-border bg-background hover:border-primary/50 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{cat.icon}</span>
                        <span className="text-sm font-medium text-foreground">{cat.name}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {cat.options.length} options
                      </Badge>
                    </div>
                  </button>
                ))}
              </>
            )}

            {/* Tech options within a category */}
            {view === "options" && selectedCategory && (
              <>
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => { setView("compare-select"); setCompareItems([]); }}
                  >
                    <Columns2 className="w-3 h-3 mr-1" /> Compare
                  </Button>
                </div>
                {selectedCategory.options.map((tech) => (
                  <button
                    key={tech.name}
                    onClick={() => { setSelectedTech(tech); setView("detail"); }}
                    className="w-full text-left p-3 rounded-lg border border-border bg-background hover:border-primary/50 hover:bg-accent/50 transition-colors"
                  >
                    <div className="font-medium text-sm text-foreground">{tech.name}</div>
                    <p className="text-xs text-muted-foreground mt-1">{tech.description}</p>
                    <p className="text-[10px] text-primary mt-2 font-mono">{tech.bestFor}</p>
                  </button>
                ))}
              </>
            )}

            {/* Compare selection */}
            {view === "compare-select" && selectedCategory && (
              <>
                <p className="text-xs text-muted-foreground">
                  Tap two technologies to compare them side by side.
                </p>
                {selectedCategory.options.map((tech) => {
                  const isSelected = compareItems.find((t) => t.name === tech.name);
                  return (
                    <button
                      key={tech.name}
                      onClick={() => toggleCompareItem(tech)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-background hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-foreground">{tech.name}</span>
                        {isSelected && <Badge className="text-[10px] bg-primary text-primary-foreground">Selected</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{tech.description}</p>
                    </button>
                  );
                })}
                <Button
                  className="w-full mt-2"
                  disabled={compareItems.length !== 2}
                  onClick={() => setView("compare-view")}
                >
                  <Columns2 className="w-4 h-4 mr-2" />
                  Compare {compareItems.length === 2 ? `${compareItems[0].name} vs ${compareItems[1].name}` : "(select 2)"}
                </Button>
              </>
            )}

            {/* Side-by-side comparison */}
            {view === "compare-view" && compareItems.length === 2 && (
              <ComparisonView a={compareItems[0]} b={compareItems[1]} />
            )}

            {/* Tech detail view */}
            {view === "detail" && selectedTech && (
              <TechDetail tech={selectedTech} />
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function ComparisonView({ a, b }: { a: TechOption; b: TechOption }) {
  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
          <p className="text-sm font-bold text-foreground">{a.name}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{a.description}</p>
        </div>
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
          <p className="text-sm font-bold text-foreground">{b.name}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{b.description}</p>
        </div>
      </div>

      {/* Best For */}
      <CompareSection label="Best For">
        <div className="grid grid-cols-2 gap-3">
          <p className="text-xs text-foreground">{a.bestFor}</p>
          <p className="text-xs text-foreground">{b.bestFor}</p>
        </div>
      </CompareSection>

      {/* Pros */}
      <CompareSection label="Advantages">
        <div className="grid grid-cols-2 gap-3">
          <CompareList items={a.pros} icon={<CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />} />
          <CompareList items={b.pros} icon={<CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 shrink-0" />} />
        </div>
      </CompareSection>

      {/* Cons */}
      <CompareSection label="Drawbacks">
        <div className="grid grid-cols-2 gap-3">
          <CompareList items={a.cons} icon={<XCircle className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />} />
          <CompareList items={b.cons} icon={<XCircle className="w-3 h-3 text-red-500 mt-0.5 shrink-0" />} />
        </div>
      </CompareSection>

      {/* Credentials */}
      <CompareSection label="Credentials">
        <div className="grid grid-cols-2 gap-3">
          <BadgeList items={a.credentials} variant="outline" fallback="None required" />
          <BadgeList items={b.credentials} variant="outline" fallback="None required" />
        </div>
      </CompareSection>

      {/* Libraries */}
      <CompareSection label="Key Packages">
        <div className="grid grid-cols-2 gap-3">
          <BadgeList items={a.libraries} variant="secondary" fallback="None" />
          <BadgeList items={b.libraries} variant="secondary" fallback="None" />
        </div>
      </CompareSection>
    </div>
  );
}

function CompareSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
      {children}
    </div>
  );
}

function CompareList({ items, icon }: { items: string[]; icon: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-1.5">
          {icon}
          <span className="text-[11px] text-foreground">{item}</span>
        </div>
      ))}
    </div>
  );
}

function BadgeList({ items, variant, fallback }: { items: string[]; variant: "outline" | "secondary"; fallback: string }) {
  if (items.length === 0) return <p className="text-[11px] text-muted-foreground">{fallback}</p>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item, i) => (
        <Badge key={i} variant={variant} className="text-[9px] font-mono">{item}</Badge>
      ))}
    </div>
  );
}

function TechDetail({ tech }: { tech: TechOption }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{tech.description}</p>
      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
        <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Best For</p>
        <p className="text-xs text-foreground">{tech.bestFor}</p>
      </div>
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Advantages</p>
        <div className="space-y-1.5">
          {tech.pros.map((pro, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
              <span className="text-xs text-foreground">{pro}</span>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Drawbacks</p>
        <div className="space-y-1.5">
          {tech.cons.map((con, i) => (
            <div key={i} className="flex items-start gap-2">
              <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
              <span className="text-xs text-foreground">{con}</span>
            </div>
          ))}
        </div>
      </div>
      {tech.credentials.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <Key className="w-3 h-3" /> Required Credentials
          </p>
          <div className="flex flex-wrap gap-1.5">
            {tech.credentials.map((cred, i) => (
              <Badge key={i} variant="outline" className="text-[10px] font-mono">{cred}</Badge>
            ))}
          </div>
        </div>
      )}
      {tech.libraries.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <Package className="w-3 h-3" /> Key Packages
          </p>
          <div className="flex flex-wrap gap-1.5">
            {tech.libraries.map((lib, i) => (
              <Badge key={i} variant="secondary" className="text-[10px] font-mono">{lib}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}