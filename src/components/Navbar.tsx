import { Link, useLocation } from "react-router-dom";
import { User } from "firebase/auth";
import { FileText, Users, MessageSquare, LogOut, Heart } from "lucide-react";
import { cn } from "../utils";

interface NavbarProps {
  user: User;
  onSignOut: () => void;
}

export default function Navbar({ user, onSignOut }: NavbarProps) {
  const location = useLocation();

  const navItems = [
    { label: "Analysis Hub", path: "/", icon: FileText },
    { label: "Patient Records", path: "/patients", icon: Users },
    { label: "Med-Chat AI", path: "/chat", icon: MessageSquare },
  ];

  return (
    <aside className="w-[260px] bg-natural-sidebar border-r border-black/5 flex flex-col p-8 gap-10 h-screen sticky top-0 shrink-0 overflow-y-auto">
      <Link to="/" className="flex items-center gap-3">
        <Heart className="text-natural-accent size-8 fill-natural-accent" />
        <span className="font-serif text-2xl font-semibold tracking-tight text-natural-text uppercase text-xs">Meditrack-AI</span>
      </Link>

      <div className="flex-1 flex flex-col gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[2px] text-natural-muted/60 mb-2 pl-4">Platform Navigation</span>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[13px] font-medium transition-all group",
              location.pathname === item.path
                ? "bg-natural-card text-natural-text shadow-xl shadow-black/[0.03] ring-1 ring-black/5"
                : "text-natural-muted hover:text-natural-text hover:bg-black/5"
            )}
          >
            <item.icon className={cn("size-4", location.pathname === item.path ? "text-natural-accent" : "opacity-50")} />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>

      <div className="pt-8 border-t border-black/5 flex flex-col gap-6">
        <div className="flex items-center gap-3 px-4">
          <div className="size-10 rounded-full bg-natural-accent/20 flex items-center justify-center font-serif text-natural-accent border border-natural-accent/10">
            {user.displayName?.[0] || user.email?.[0]?.toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[13px] font-semibold truncate text-natural-text">{user.displayName}</span>
            <span className="text-[10px] text-natural-muted truncate">{user.email}</span>
          </div>
        </div>
        
        <button
          onClick={onSignOut}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-[13px] font-medium text-red-500/80 hover:text-red-600 hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
        >
          <LogOut className="size-4" />
          <span>Terminate Session</span>
        </button>
      </div>
    </aside>
  );
}
