import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../../create-context";

function pickIconFromOWM(main?: string): string | undefined {
  const m = String(main || '').toLowerCase();
  if (m.includes('thunder')) return 'thunderstorm';
  if (m.includes('snow')) return 'snow';
  if (m.includes('rain') || m.includes('drizzle')) return 'rain';
  if (m.includes('clear')) return 'clear';
  if (m.includes('cloud')) return 'clouds';
  return undefined;
}

export default createTRPCRouter({
  current: publicProcedure
    .input(
      z.object({
        lat: z.number(),
        lon: z.number(),
        openWeatherKey: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      if (!input.openWeatherKey) {
        return { tempF: undefined as unknown as number, description: undefined as unknown as string };
      }
      const url = new URL("https://api.openweathermap.org/data/2.5/weather");
      url.searchParams.set("lat", String(input.lat));
      url.searchParams.set("lon", String(input.lon));
      url.searchParams.set("appid", input.openWeatherKey);
      url.searchParams.set("units", "imperial");
      const res = await fetch(url.toString());
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`OpenWeather failed: ${res.status} ${text}`);
      }
      const data = (await res.json()) as any;
      return {
        tempF: data?.main?.temp,
        description: Array.isArray(data?.weather) ? data.weather[0]?.description : undefined,
        main: Array.isArray(data?.weather) ? data.weather[0]?.main : undefined,
        windMph: typeof data?.wind?.speed === 'number' ? data.wind.speed : undefined,
      };
    }),
  forecastAt: publicProcedure
    .input(
      z.object({
        lat: z.number(),
        lon: z.number(),
        etaTs: z.number(),
        openWeatherKey: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      if (!input.openWeatherKey) {
        return { tempF: undefined as unknown as number, description: undefined as unknown as string };
      }
      const url = new URL("https://api.openweathermap.org/data/2.5/forecast");
      url.searchParams.set("lat", String(input.lat));
      url.searchParams.set("lon", String(input.lon));
      url.searchParams.set("appid", input.openWeatherKey);
      url.searchParams.set("units", "imperial");
      const res = await fetch(url.toString());
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`OpenWeather forecast failed: ${res.status} ${text}`);
      }
      const data = (await res.json()) as any;
      const list: any[] = Array.isArray(data?.list) ? data.list : [];
      const target = input.etaTs;
      let best: any | undefined;
      let bestDiff = Number.MAX_SAFE_INTEGER;
      for (const it of list) {
        const ts = typeof it?.dt === 'number' ? it.dt * 1000 : undefined;
        if (!ts) continue;
        const diff = Math.abs(ts - target);
        if (diff < bestDiff) {
          best = it;
          bestDiff = diff;
        }
      }
      const main = best?.main;
      const weather0 = Array.isArray(best?.weather) ? best.weather[0] : undefined;
      const wind = best?.wind;
      return {
        tempF: typeof main?.temp === 'number' ? main.temp : undefined,
        description: weather0?.description,
        main: weather0?.main,
        iconKey: pickIconFromOWM(weather0?.main),
        windMph: typeof wind?.speed === 'number' ? wind.speed : undefined,
        at: typeof best?.dt === 'number' ? best.dt * 1000 : undefined,
      };
    }),
});
