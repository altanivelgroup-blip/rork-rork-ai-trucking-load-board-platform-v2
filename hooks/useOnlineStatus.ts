import { useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';

export function useOnlineStatus() {
  const [online, setOnline] = useState<boolean>(true);
  const failures = useRef<number>(0);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const update = () => setOnline(navigator.onLine);
      window.addEventListener('online', update);
      window.addEventListener('offline', update);
      update();
      return () => {
        window.removeEventListener('online', update);
        window.removeEventListener('offline', update);
      };
    }
    let canceled = false;
    const ping = async () => {
      try {
        const res = await fetch('https://www.google.com/generate_204', { method: 'GET' });
        if (canceled) return;
        if (res.ok) {
          failures.current = 0;
          setOnline(true);
        } else {
          failures.current += 1;
          if (failures.current >= 2) setOnline(false);
        }
      } catch {
        if (canceled) return;
        failures.current += 1;
        if (failures.current >= 2) setOnline(false);
      }
    };
    const id = setInterval(ping, 30000);
    void ping();
    return () => { canceled = true; clearInterval(id); };
  }, []);

  return useMemo(() => ({ online }), [online]);
}
export default useOnlineStatus;
