"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/types";
import { NotificationBadge } from "@/components/notification-badge";
import {
  Clock,
  ClipboardList,
  Bell,
  Users,
  BarChart3,
  Settings,
  Palmtree,
  Briefcase,
} from "lucide-react";

interface BottomNavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
  roles: Role[];
}

const BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  {
    href: "/app/clock",
    label: "Stempeln",
    icon: <Clock className="size-5" />,
    activeIcon: <Clock className="size-5" strokeWidth={2.5} />,
    roles: ["admin", "manager", "employee"],
  },
  {
    href: "/app/my-times",
    label: "Zeiten",
    icon: <ClipboardList className="size-5" />,
    activeIcon: <ClipboardList className="size-5" strokeWidth={2.5} />,
    roles: ["admin", "manager", "employee"],
  },
  {
    href: "/app/employees",
    label: "Team",
    icon: <Users className="size-5" />,
    activeIcon: <Users className="size-5" strokeWidth={2.5} />,
    roles: ["admin", "manager"],
  },
  {
    href: "/app/reports",
    label: "Berichte",
    icon: <BarChart3 className="size-5" />,
    activeIcon: <BarChart3 className="size-5" strokeWidth={2.5} />,
    roles: ["admin", "manager"],
  },
  {
    href: "/app/projects",
    label: "Projekte",
    icon: <Briefcase className="size-5" />,
    activeIcon: <Briefcase className="size-5" strokeWidth={2.5} />,
    roles: ["admin", "manager"],
  },
  {
    href: "/app/settings",
    label: "Mehr",
    icon: <Settings className="size-5" />,
    activeIcon: <Settings className="size-5" strokeWidth={2.5} />,
    roles: ["admin", "manager"],
  },
];

const EMPLOYEE_NAV_ITEMS: BottomNavItem[] = [
  {
    href: "/app/clock",
    label: "Stempeln",
    icon: <Clock className="size-5" />,
    activeIcon: <Clock className="size-5" strokeWidth={2.5} />,
    roles: ["employee"],
  },
  {
    href: "/app/my-times",
    label: "Zeiten",
    icon: <ClipboardList className="size-5" />,
    activeIcon: <ClipboardList className="size-5" strokeWidth={2.5} />,
    roles: ["employee"],
  },
  {
    href: "/app/notifications",
    label: "Meldungen",
    icon: <Bell className="size-5" />,
    activeIcon: <Bell className="size-5" strokeWidth={2.5} />,
    roles: ["employee"],
  },
  {
    href: "/app/vacation",
    label: "Urlaub",
    icon: <Palmtree className="size-5" />,
    activeIcon: <Palmtree className="size-5" strokeWidth={2.5} />,
    roles: ["employee"],
  },
  {
    href: "/app/settings",
    label: "Mehr",
    icon: <Settings className="size-5" />,
    activeIcon: <Settings className="size-5" strokeWidth={2.5} />,
    roles: ["employee"],
  },
];

interface BottomNavProps {
  role: Role;
}

export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();

  const items =
    role === "employee"
      ? EMPLOYEE_NAV_ITEMS
      : BOTTOM_NAV_ITEMS.filter((item) => item.roles.includes(role));

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-gray-200 bg-white/95 backdrop-blur-md safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                isActive
                  ? "text-violet-600"
                  : "text-gray-400"
              }`}
            >
              {isActive ? item.activeIcon : item.icon}
              <span className={`text-[10px] ${isActive ? "font-semibold" : "font-medium"}`}>
                {item.label}
              </span>
              {item.href === "/app/notifications" && (
                <NotificationBadge className="absolute top-1.5 right-1/4" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
