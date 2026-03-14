'use client';

import { ReactNode, useEffect } from 'react';
import { useAppStore } from '@/store/store';
import { ToastProvider } from '@/components/ui/toast';

export function Providers({ children }: { children: ReactNode }) {
  const { setLoading } = useAppStore();

  useEffect(() => {
    setLoading(false);
  }, [setLoading]);

  return (
    <ToastProvider>
      {children}
    </ToastProvider>
  );
}
