"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSupabase } from "@/providers/supabase-provider";
import { Sidebar } from "@/components/sidebar";
import { BottomNav } from "@/components/bottom-nav";
import { AppHeader } from "@/components/app-header";
import { PresencePanel } from "@/components/presence-panel";
import type { ReactNode } from "react";
import type { Role } from "@/types";

interface AppShellProps {
  role: Role;
  userName: string;
  children: ReactNode;
}

export function AppShell({ role, userName, children }: AppShellProps) {
  const { supabase } = useSupabase();
  const [presenceOpen, setPresenceOpen] = useState(false);
  const pathname = usePathname();
  const firstRoute = useRef(true);

  // Close the presence panel automatically when navigating between pages.
  // Skip the initial mount so we don't setState on first render.
  useEffect(() => {
    if (firstRoute.current) {
      firstRoute.current = false;
      return;
    }
    setPresenceOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    try {
      await supabase.auth.signOut();
    } catch {
      // signOut may fail — still clear cookie and redirect
    }
    // Explicitly clear Supabase auth cookies (belt-and-suspenders)
    document.cookie.split(';').forEach((c) => {
      const name = c.split('=')[0].trim();
      if (name.includes('auth-token')) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      }
    });
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen max-w-[100vw] overflow-x-hidden bg-white">
      <Sidebar role={role} userName={userName} onSignOut={handleSignOut} />

      {/* Main content — offset for sidebar on desktop, padding for bottom nav on mobile */}
      <main className="md:pl-[260px] pb-20 md:pb-0">
        <AppHeader
          presenceOpen={presenceOpen}
          onTogglePresence={() => setPresenceOpen((o) => !o)}
        />
        <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      <PresencePanel open={presenceOpen} onClose={() => setPresenceOpen(false)} />

      <BottomNav role={role} />
    </div>
  );
}
