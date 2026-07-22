import type { Poem } from '@gedichtenv2/shared';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { apiGetPoems } from '../lib/api';

interface PoemsContextValue {
  poems: Poem[];
  loading: boolean;
  refreshPoems: () => Promise<void>;
}

const PoemsContext = createContext<PoemsContextValue>({
  poems: [],
  loading: false,
  refreshPoems: async () => {},
});

export function PoemsProvider({ children }: { children: ReactNode }) {
  const [poems, setPoems] = useState<Poem[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshPoems = useCallback(async () => {
    try {
      const fresh = await apiGetPoems();
      setPoems(fresh);
    } catch {
      // keep current data on error
    }
  }, []);

  useEffect(() => {
    refreshPoems().finally(() => setLoading(false));
  }, [refreshPoems]);

  return (
    <PoemsContext.Provider value={{ poems, loading, refreshPoems }}>
      {children}
    </PoemsContext.Provider>
  );
}

export function usePoems() {
  return useContext(PoemsContext).poems;
}

export function usePoemsContext() {
  return useContext(PoemsContext);
}
