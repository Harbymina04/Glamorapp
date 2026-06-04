'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { TrialBanner } from '@/components/layout/trial-banner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, checkAuth, user } = useAuthStore();
  const sidebarOpen = useUIStore(s => s.sidebarOpen);
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    checkAuth();
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    // Role-based redirect: only store-level roles belong in /dashboard
    if (user?.role === 'superadmin') {
      router.replace('/admin');
    } else if (user?.role === 'tenant_admin') {
      router.replace('/tenant');
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (!mounted) return null;

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface-primary">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-glamor-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-primary">
      <div className={`h-full transition-all duration-300 ease-in-out overflow-hidden ${sidebarOpen ? 'w-60' : 'w-0'}`}>
        <div className="w-60 h-full">
          <Sidebar />
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <TrialBanner />
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}
