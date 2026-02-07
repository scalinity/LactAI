import { Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import { useThemeStore } from "@/stores/useThemeStore";
import AppShell from "@/components/layout/AppShell";
import WelcomeLetter from "@/components/WelcomeLetter";
import OnboardingTutorial from "@/components/OnboardingTutorial";
import HomePage from "@/pages/HomePage";
import LogPage from "@/pages/LogPage";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { lazy, Suspense } from "react";

const HistoryPage = lazy(() => import("@/pages/HistoryPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));
const TrendsPage = lazy(() => import("@/pages/TrendsPage"));
const PhotoImportPage = lazy(() => import("@/pages/PhotoImportPage"));
const ChatPage = lazy(() => import("@/pages/ChatPage"));

export default function App() {
  useServiceWorker();

  const initThemeListener = useThemeStore((s) => s.initThemeListener);
  useEffect(() => {
    return initThemeListener();
  }, [initThemeListener]);

  return (
    <AppShell>
      <ErrorBoundary>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-gray-500">Loading...</div>
          </div>
        }>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/log" element={<LogPage />} />
            <Route path="/log/:sessionId" element={<LogPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/trends" element={<TrendsPage />} />
            <Route path="/photos" element={<PhotoImportPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/chat/:threadId" element={<ChatPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <WelcomeLetter />
      <OnboardingTutorial />
    </AppShell>
  );
}
