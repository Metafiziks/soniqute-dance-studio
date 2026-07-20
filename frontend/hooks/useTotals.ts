import { useEffect, useState } from 'react';
import { userRequest } from '../services/RequestMethods';

export function useTotalsPro(userId: string | null | undefined) {
  const [data, setData] = useState({
    total: 0,
    creatorPoints: 0,
    posterPoints: 0,
    interactionPoints: 0,
    referralPoints: 0,
    pumpPoints: 0,
    dumpPoints: 0,
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);

    userRequest
      .get(`/totalScore/userTotalsPro/${userId}`)
      .then((res) => {
        if (cancelled) return;
        const b = res?.data?.breakdown || {};
        setData({
          total: Number(res?.data?.total || 0),
          creatorPoints: Number(b.creatorPoints || 0),
          posterPoints: Number(b.posterPoints || 0),
          interactionPoints: Number(b.interactionPoints || 0),
          referralPoints: Number(b.referralPoints || 0),
          pumpPoints: Number(b.pumpPoints || 0),
          dumpPoints: Number(b.dumpPoints || 0),
        });
      })
      .catch((e) => !cancelled && setErr(e))
      .finally(() => !cancelled && setLoading(false));

    return () => { cancelled = true; };
  }, [userId]);

  return { data, loading, error: err };
}
