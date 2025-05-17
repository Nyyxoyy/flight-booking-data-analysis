import { useState, useEffect, useRef } from 'react';

export default function usePollingState(fetchFn, intervalMs = 1000, enabled = true) {
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const pollingRef = useRef();

  useEffect(() => {
    if (!enabled) return;

    async function poll() {
      try {
        const result = await fetchFn();
        setState(result);
        setLoading(false);
        if (result?.complete) {
          clearInterval(pollingRef.current);
        }
      } catch (err) {
        setError(err);
        setLoading(false);
        clearInterval(pollingRef.current);
      }
    }

    poll();
    pollingRef.current = setInterval(poll, intervalMs);

    return () => clearInterval(pollingRef.current);
  }, [fetchFn, intervalMs, enabled]);

  return { state, loading, error };
}