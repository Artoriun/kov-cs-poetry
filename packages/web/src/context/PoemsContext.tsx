import { POEMS, type Poem } from '@gedichtenv2/shared';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { apiGetPoems } from '../lib/api';

// Initial state is the bundled poems rather than an empty array. Starting empty meant
// React blanked the prerendered HTML on mount and only repainted once the API answered,
// and left the site showing nothing at all whenever the API was unreachable. The API
// response replaces this the moment it lands, so admin edits stay authoritative.
const SEED = POEMS.filter((p) => !p.deleted);

interface PoemsContextValue {
  poems: Poem[];
  loading: boolean;
  refreshPoems: () => Promise<void>;
}

const PoemsContext = createContext<PoemsContextValue>({
  poems: SEED,
  loading: false,
  refreshPoems: async () => {},
});

export function PoemsProvider({ children }: { children: ReactNode }) {
  const [poems, setPoems] = useState<Poem[]>(SEED);
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
