import { getLabUser } from "@/lib/auth/get-lab-user";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, lab } = await getLabUser();

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar labName={lab.name} userRole={user.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <DashboardHeader labName={lab.name} userFullName={user.fullName} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
