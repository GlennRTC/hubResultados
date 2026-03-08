// Stub — will be replaced in Task 3
interface DashboardSidebarProps {
  labName: string;
  userRole: "admin" | "technician" | "reception";
}

export function DashboardSidebar({ labName, userRole }: DashboardSidebarProps) {
  return (
    <aside className="flex w-60 flex-shrink-0 flex-col border-r bg-background">
      <div className="flex h-16 items-center border-b px-6">
        <span className="text-lg font-bold tracking-tight">LabFlash</span>
      </div>
      <div className="border-b px-6 py-3">
        <p className="truncate text-sm font-medium">{labName}</p>
        <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
      </div>
    </aside>
  );
}
