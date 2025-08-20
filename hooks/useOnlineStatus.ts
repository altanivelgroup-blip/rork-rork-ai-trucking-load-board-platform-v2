import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

export function useOnlineStatus() {
  const [online, setOnline] = useState<boolean>(true);

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
        if (!canceled) setOnline(res.ok);
      } catch {
        if (!canceled) setOnline(false);
      }
    };
    const id = setInterval(ping, 15000);
    void ping();
    return () => { canceled = true; clearInterval(id); };
  }, []);

  return useMemo(() => ({ online }), [online]);
}
export default useOnlineStatus;
