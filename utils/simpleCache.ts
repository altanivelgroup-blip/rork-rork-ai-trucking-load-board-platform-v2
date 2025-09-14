import AsyncStorage from '@react-native-async-storage/async-storage';

export type CacheEntry<T> = {
  data: T;
  ts: number;
  ttlMs: number;
};

export async function setCache<T>(key: string, data: T, ttlMs: number): Promise<void> {
  try {
    const entry: CacheEntry<T> = { data, ts: Date.now(), ttlMs };
    await AsyncStorage.setItem(key, JSON.stringify(entry));
    console.log(`[cache] set ${key} (ttl ${ttlMs}ms)`);
  } catch (e) {
    console.warn('[cache] set failed', key, e);
  }
}

export async function getCache<T>(key: string): Promise<{ hit: boolean; data: T | null }> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return { hit: false, data: null };
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    const age = Date.now() - (parsed?.ts ?? 0);
    if (!parsed || typeof parsed.ts !== 'number' || typeof parsed.ttlMs !== 'number') {
      await AsyncStorage.removeItem(key);
      return { hit: false, data: null };
    }
    if (age > parsed.ttlMs) {
      console.log(`[cache] expired ${key} (age ${age}ms > ${parsed.ttlMs}ms)`);
      await AsyncStorage.removeItem(key);
      return { hit: false, data: null };
    }
    console.log(`[cache] hit ${key} (age ${age}ms)`);
    return { hit: true, data: parsed.data as T };
  } catch (e) {
    console.warn('[cache] get failed', key, e);
    return { hit: false, data: null };
  }
}

export async function clearCache(key: string) {
  try {
    await AsyncStorage.removeItem(key);
    console.log(`[cache] cleared ${key}`);
  } catch (e) {
    console.warn('[cache] clear failed', key, e);
  }
}
