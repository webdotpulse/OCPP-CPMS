"use client";

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '@/hooks/useAuth';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedState = localStorage.getItem('sidebarCollapsed');
    if (storedState !== null) {
      setIsCollapsed(storedState === 'true');
    }
  }, []);

  const handleSetIsCollapsed = (val: boolean) => {
    setIsCollapsed(val);
    localStorage.setItem('sidebarCollapsed', val.toString());
  };

  useEffect(() => {
    // Auth unwired for local use
    if (!isLoading && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [user, isLoading, router, pathname]);

  // Don't render shell on login page
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Prevent hydration mismatch by only rendering after mount
  if (!mounted || isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Auth unwired for local use
  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={handleSetIsCollapsed} />
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'ml-16' : 'ml-64'}`}>
        <Topbar />
        <main className="flex-1 p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
