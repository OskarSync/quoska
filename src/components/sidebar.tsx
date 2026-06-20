"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { Role } from "@/types";
import { NotificationBadge } from "@/components/notification-badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Clock,
  ClipboardList,
  Bell,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Palmtree,
  Thermometer,
  Briefcase,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: Role[];
  group: "main" | "manage";
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/app/clock",
    label: "Stempeln",
    icon: <Clock className="size-[18px]" />,
    roles: ["admin", "manager", "employee"],
    group: "main",
  },
  {
    href: "/app/my-times",
    label: "Meine Zeiten",
    icon: <ClipboardList className="size-[18px]" />,
    roles: ["admin", "manager", "employee"],
    group: "main",
  },
  {
    href: "/app/notifications",
    label: "Benachrichtigungen",
    icon: <Bell className="size-[18px]" />,
    roles: ["admin", "manager", "employee"],
    group: "main",
  },
  {
    href: "/app/vacation",
    label: "Urlaub",
    icon: <Palmtree className="size-[18px]" />,
    roles: ["admin", "manager", "employee"],
    group: "main",
  },
  {
    href: "/app/sick",
    label: "Krankmeldung",
    icon: <Thermometer className="size-[18px]" />,
    roles: ["admin", "manager", "employee"],
    group: "main",
  },
  {
    href: "/app/employees",
    label: "Mitarbeiter",
    icon: <Users className="size-[18px]" />,
    roles: ["admin", "manager"],
    group: "manage",
  },
  {
    href: "/app/projects",
    label: "Projekte",
    icon: <Briefcase className="size-[18px]" />,
    roles: ["admin", "manager"],
    group: "manage",
  },
  {
    href: "/app/reports",
    label: "Berichte",
    icon: <BarChart3 className="size-[18px]" />,
    roles: ["admin", "manager"],
    group: "manage",
  },
  {
    href: "/app/settings",
    label: "Einstellungen",
    icon: <Settings className="size-[18px]" />,
    roles: ["admin", "manager"],
    group: "manage",
  },
];

interface SidebarProps {
  role: Role;
  userName: string;
  onSignOut: () => void;
}

export function Sidebar({ role, userName, onSignOut }: SidebarProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));
  const mainItems = visibleItems.filter((i) => i.group === "main");
  const manageItems = visibleItems.filter((i) => i.group === "manage");

  return (
    <aside className="hidden md:flex md:w-[260px] md:flex-col md:fixed md:inset-y-0 border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 h-16 border-b border-gray-100">
        {/* Next/Image with fixed dims avoids layout shift; the source PNG has
            white knocked out to transparency so it sits on the white sidebar. */}
        <Image
          src="/icons/logo.png"
          alt="Quoska"
          width={24}
          height={24}
          priority
          className="size-6 shrink-0"
        />
        <span className="text-base font-bold text-gray-900">
          Quoska
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto">
        <div className="space-y-0.5">
          <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            Zeiterfassung
          </p>
          {mainItems.map((item) => (
            <NavItemLink
              key={item.href}
              item={item}
              isActive={pathname.startsWith(item.href)}
              showNotificationBadge={item.href === "/app/notifications"}
            />
          ))}
        </div>

        {manageItems.length > 0 && (
          <div className="space-y-0.5">
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Verwaltung
            </p>
            {manageItems.map((item) => (
              <NavItemLink
                key={item.href}
                item={item}
                isActive={pathname.startsWith(item.href)}
              />
            ))}
          </div>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-gray-100 px-3 py-3">
        <div className="flex items-center gap-3 px-2">
          <Avatar size="sm">
            <AvatarFallback className="bg-violet-100 text-violet-700 text-xs font-semibold">
              {userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onSignOut}
            className="size-8 text-gray-400 hover:text-gray-600 shrink-0"
            aria-label="Abmelden"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}

function NavItemLink({
  item,
  isActive,
  showNotificationBadge,
}: {
  item: NavItem;
  isActive: boolean;
  showNotificationBadge?: boolean;
}) {
  return (
    <Link
      href={item.href}
      className={`relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        isActive
          ? "bg-violet-50 text-violet-700"
          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      {isActive ? (
        <span className="text-violet-600">{item.icon}</span>
      ) : (
        <span className="text-gray-400">{item.icon}</span>
      )}
      <span>{item.label}</span>
      {showNotificationBadge && <NotificationBadge />}
    </Link>
  );
}
