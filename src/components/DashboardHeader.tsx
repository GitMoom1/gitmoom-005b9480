import { Moon, Book, Plus, Search, Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface DashboardHeaderProps {
  user: any;
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  return (
    <header className="bg-card/80 backdrop-blur-md border-b border-border/50 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2">
            <Moon className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">GitMoon</h1>
            <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
              Beta
            </span>
          </Link>
          
          <div className="hidden md:flex items-center bg-accent/30 rounded-lg px-3 py-1.5 border border-border/30 w-64">
            <Search className="h-4 w-4 text-muted-foreground mr-2" />
            <input 
              type="text" 
              placeholder="Search or jump to..." 
              className="bg-transparent text-sm outline-none w-full text-foreground placeholder:text-muted-foreground"
            />
            <span className="text-[10px] border border-border/50 rounded px-1.5 text-muted-foreground">/</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition text-sm font-medium">
            <Plus className="h-4 w-4" />
            <Book className="h-4 w-4" />
            <span>New</span>
          </button>
          
          <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-full transition relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full border-2 border-card"></span>
          </button>
          
          <div className="h-8 w-8 rounded-full bg-gradient-cosmic flex items-center justify-center text-primary-foreground text-xs font-bold border border-border/50 cursor-pointer">
            {user?.email?.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
