import type React from "react";
import type ReactNode from "react";
import Header from "./Header";
import BottomNav from "./BottomNav";
import { OfflineIndicator } from '@/components/ui/OfflineIndicator';

interface AppShellProps {
  children: ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <OfflineIndicator />
      <Header />
      <main className="px-4 pb-20 pt-4">{children}</main>
      <BottomNav />
    </div>
  );
}
