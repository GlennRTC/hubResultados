import Link from "next/link";
import { cn } from "@/lib/utils";
import { FlaskConical, Users, ClipboardList, Settings } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Inicio", icon: FlaskConical },
  { href: "/dashboard/pacientes", label: "Pacientes", icon: Users },
  { href: "/dashboard/ordenes", label: "Órdenes", icon: ClipboardList },
  { href: "/dashboard/configuracion", label: "Configuración", icon: Settings },
];

interface DashboardSidebarProps {
  labName: string;
  userRole: "admin" | "technician" | "reception";
}

export function DashboardSidebar({ labName, userRole }: DashboardSidebarProps) {
  return (
    <aside className="flex w-60 flex-shrink-0 flex-col border-r bg-background">
      {/* Branding */}
      <div className="flex h-16 items-center border-b px-6">
        <span className="text-lg font-bold tracking-tight">LabFlash</span>
      </div>

      {/* Lab name */}
      <div className="border-b px-6 py-3">
        <p className="truncate text-sm font-medium">{labName}</p>
        <p className="text-xs text-muted-foreground capitalize">
          {userRole === "admin"
            ? "Administrador"
            : userRole === "technician"
              ? "Técnico"
              : "Recepción"}
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4">
        <ul className="grid gap-1">
          {navItems.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium",
                  "text-muted-foreground hover:bg-muted hover:text-foreground",
                  "transition-colors"
                )}
              >
                <item.icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
