import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-row bg-background">
      <AdminSidebar />
      <main
        id="main-content"
        tabIndex={-1}
        className="relative z-10 min-w-0 flex-1 focus:outline-none"
      >
        {children}
      </main>
    </div>
  );
}
