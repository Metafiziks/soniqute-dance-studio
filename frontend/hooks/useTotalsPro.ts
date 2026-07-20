import { useEffect, useMemo, useState } from 'react';
import { userRequest } from '../services/RequestMethods';

function shape(data: any) {
  const d = data || {};
  const b = d.breakdown?.combined || d.breakdown || {};
  return {
    total: Number(d.total || 0),

    // Flatten from combined block (covers all platforms)
    posterPoints:      Number(b.posterPoints || 0),
    interactionPoints: Number(b.interactionPoints || 0),
    creatorPoints:     Number(b.creatorPoints || 0),
    referralPoints:    Number(b.referralPoints || 0),
    pumpPoints:        Number(b.pumpPoints || 0),
    dumpPoints:        Number(b.dumpPoints || 0),

    breakdown: b,
  };
}

  export default function useTotalsPro(userId: string | null | undefined) {
  const [data, setData] = useState(shape(null));
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState(null);

  const url = useMemo(() => (userId ? `/totalScore/userTotalsPro/${userId}` : null), [userId]);

  useEffect(() => {
    if (!url) return;
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);

    userRequest
      .get(url, { signal: ctrl.signal })
      .then((res) => setData(shape(res?.data)))
      .catch((e) => {
        if (e?.name !== 'CanceledError' && e?.message !== 'canceled') setError(e);
        // keep previous data, it’s already shaped with zeros as needed
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [url]);

  return { data, loading, error };
}
