// Stub — will be replaced in Task 3
interface DashboardHeaderProps {
  labName: string;
  userFullName: string;
}

export function DashboardHeader({ labName, userFullName }: DashboardHeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      <div />
      <div className="text-sm text-muted-foreground">{userFullName} — {labName}</div>
    </header>
  );
}
