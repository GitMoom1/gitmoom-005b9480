import { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { 
  User, Book, Star, GitBranch, 
  Users, Building, Heart, Settings,
  LogOut, Plus, Moon, Sun, Key, RefreshCw, Shield, Terminal, Workflow
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/lib/theme";

interface DashboardSidebarProps {
  user: any;
  activeTab: string;
}

export function DashboardSidebar({ user, activeTab }: DashboardSidebarProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const menuItems = [
    { id: "profile", icon: User, label: "Profile", to: "/dashboard" },
    { id: "repositories", icon: Book, label: "Repositories", to: "/dashboard/repositories" },
    { id: "stars", icon: Star, label: "Stars", to: "/dashboard" },
    { id: "gists", icon: GitBranch, label: "Gists", to: "/dashboard" },
    { id: "organizations", icon: Users, label: "Organizations", to: "/admin/organizations" },
    { id: "enterprises", icon: Building, label: "Enterprises", to: "/dashboard" },
    { id: "sponsors", icon: Heart, label: "Sponsors", to: "/dashboard" },
    { id: "api-keys", icon: Key, label: "API Keys", to: "/dashboard/settings/api-keys" },
    { id: "integrations", icon: RefreshCw, label: "Integrations", to: "/dashboard/settings/integrations" },
    { id: "actions", icon: Workflow, label: "GitMoom Action", to: "/dashboard/actions" },
    { id: "secrets", icon: Shield, label: "Secrets", to: "/dashboard/settings/secrets" },
    { id: "keys", icon: Terminal, label: "SSH & GPG Keys", to: "/dashboard/settings/keys" },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <aside className="w-64 flex-shrink-0">
      <div className="bg-card rounded-lg shadow-soft p-4 border border-border/50">
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-full mx-auto mb-3 bg-gradient-cosmic flex items-center justify-center text-primary-foreground text-2xl font-bold">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
          <h2 className="font-semibold text-lg">{user?.user_metadata?.full_name || user?.email?.split('@')[0]}</h2>
          <p className="text-sm text-muted-foreground truncate px-2">
            {user?.email}
          </p>
          <span className="inline-block mt-2 px-3 py-1 text-xs bg-accent/20 text-accent rounded-full border border-accent/30">
            Plan: {user?.plan || "Free"}
          </span>
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.id}
              to={item.to}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                activeTab === item.id 
                  ? "bg-primary/10 text-primary font-medium" 
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <hr className="my-4 border-border/50" />

        <div className="space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground">
            <Settings className="h-4 w-4" />
            Settings
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground">
            <Plus className="h-4 w-4" />
            <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded mr-1">New</span>
            Feature Preview
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-primary font-medium hover:bg-primary/5">
            <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded mr-1">Upgrade</span>
            Pro Plan
          </button>
        </div>

        <hr className="my-4 border-border/50" />

        <button 
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
