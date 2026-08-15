import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { RepositoryList } from "@/components/RepositoryList";
import { supabase } from "@/integrations/supabase/client";
import { Search, Filter, Plus } from "lucide-react";

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
    { 
      id: 1, 
      name: "ai-workflow-engine", 
      description: "Core engine for GitMoon automation", 
      language: "TypeScript", 
      stargazers_count: 124, 
      updated_at: "2h ago", 
      is_private: true 
    },
    { 
      id: 2, 
      name: "gitmoon-cli", 
      description: "Command line interface for local development", 
      language: "Go", 
      stargazers_count: 45, 
      updated_at: "5h ago", 
      is_private: false 
    },
    { 
      id: 3, 
      name: "docs", 
      description: "Technical documentation and guides", 
      language: "Markdown", 
      stargazers_count: 12, 
      updated_at: "1d ago", 
      is_private: false 
    },
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
                    className="w-full pl-10 pr-4 py-2 bg-accent/20 border border-border/50 rounded-lg text-sm focus:border-primary outline-none transition"
                  />
                </div>
                <button className="inline-flex items-center gap-2 px-3 py-2 bg-accent/30 border border-border/50 rounded-lg text-sm font-medium hover:bg-accent/50 transition">
                  <Filter className="h-4 w-4" />
                  Type
                </button>
              </div>
              <button className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:opacity-90 transition shadow-glow">
                <Plus className="h-4 w-4" />
                New
              </button>
            </div>

            <RepositoryList repositories={mockRepos} />
          </main>
        </div>
      </div>
    </div>
  );
}
