import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { RepositoryList } from "@/components/RepositoryList";
import { supabase } from "@/integrations/supabase/client";
import { Book, Star, GitBranch, Search, Filter, GitMerge, Clock, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("repositories");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const mockRepos = [
    { id: 1, name: "ai-workflow-engine", desc: "Core engine for GitMoon automation", lang: "TypeScript", stars: 124, updated: "2h ago", private: true },
    { id: 2, name: "gitmoon-cli", desc: "Command line interface for local development", lang: "Go", stars: 45, updated: "5h ago", private: false },
    { id: 3, name: "docs", desc: "Technical documentation and guides", lang: "Markdown", stars: 12, updated: "1d ago", private: false },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <DashboardHeader user={user} />

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-8">
          <DashboardSidebar user={user} activeTab={activeTab} />

          <main className="flex-1 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/50 pb-6">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input 
                    type="text" 
                    placeholder="Find a repository..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-accent/20 border border-border/50 rounded-lg text-sm focus:border-primary outline-none"
                  />
                </div>
                <button className="inline-flex items-center gap-2 px-3 py-2 bg-accent/30 border border-border/50 rounded-lg text-sm font-medium hover:bg-accent/50 transition">
                  <Filter className="h-4 w-4" />
                  Type
                </button>
              </div>
              <button className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition">
                <PlusIcon className="h-4 w-4" />
                New
              </button>
            </div>

            <div className="divide-y divide-border/50">
              {mockRepos.map((repo) => (
                <div key={repo.id} className="py-6 flex items-start justify-between group">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-primary hover:underline cursor-pointer">
                        {repo.name}
                      </h3>
                      <span className="text-[10px] border border-border/50 rounded-full px-2 py-0.5 text-muted-foreground font-medium uppercase tracking-tighter">
                        {repo.private ? "Private" : "Public"}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-sm max-w-xl">
                      {repo.desc}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-primary/60"></div>
                        {repo.lang}
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5" />
                        {repo.stars}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {repo.updated}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                    <button className="p-2 border border-border/50 rounded-lg hover:bg-accent/50 text-muted-foreground transition">
                      <Star className="h-4 w-4" />
                    </button>
                    <div className="h-8 w-px bg-border/50 mx-1"></div>
                    <div className="flex items-center bg-accent/30 border border-border/50 rounded-lg overflow-hidden">
                      <button className="px-3 py-1.5 text-xs font-medium hover:bg-accent/50 border-r border-border/50 transition">
                        Graph
                      </button>
                      <button className="px-3 py-1.5 text-xs font-medium hover:bg-accent/50 transition">
                        Settings
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

