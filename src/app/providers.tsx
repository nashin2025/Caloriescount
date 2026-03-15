'use client';

import { ReactNode, useEffect } from 'react';
import { useAppStore } from '@/store/store';
import { ToastProvider } from '@/components/ui/toast';
import { ThemeProvider } from 'next-themes';

export function Providers({ children }: { children: ReactNode }) {
  const { setLoading } = useAppStore();

  useEffect(() => {
    setLoading(false);
  }, [setLoading]);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <ToastProvider>
        {children}
      </ToastProvider>
    </ThemeProvider>
  );
}
