import type { ReactNode } from "react";
import DashboardHeader from "./DashboardHeader";
import CartSidebar from "./CartSidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f7f6f3] text-stone-900 print:bg-white">
      <div className="print:hidden">
        <DashboardHeader />
        <CartSidebar />
      </div>
      <main className="pt-24 pb-16 print:pt-0 print:pb-0">{children}</main>
    </div>
  );
}
