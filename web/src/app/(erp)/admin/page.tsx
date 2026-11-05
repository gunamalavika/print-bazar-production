'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function AdminIndexPage() {
  const { user, isAuthenticated, isLoading, getRoleDestination } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace('/login');
      } else {
        const destination = getRoleDestination(user?.role);
        // If the destination is /admin (to avoid loop), fallback to /admin/dashboard or /login
        const finalDest = destination === '/admin' ? '/admin/dashboard' : destination;
        router.replace(finalDest);
      }
    }
  }, [isLoading, isAuthenticated, user, router, getRoleDestination]);

  return (
    <div className="flex flex-col items-center justify-center p-12 text-zinc-500 font-mono text-xs">
      <div className="h-8 w-8 border-2 border-[#FCDD55] border-t-transparent rounded-full animate-spin mb-3" />
      <span>ROUTING TO AUTHORIZED OPERATIONAL WORKSPACE...</span>
    </div>
  );
}
