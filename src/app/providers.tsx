'use client';

import { ReactNode, useEffect } from 'react';
import { useAppStore } from '@/store/store';

export function Providers({ children }: { children: ReactNode }) {
  const { setLoading } = useAppStore();

  useEffect(() => {
    setLoading(false);
  }, [setLoading]);

  return <>{children}</>;
}
