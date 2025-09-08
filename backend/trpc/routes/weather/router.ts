import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../../create-context";

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
        return { tempK: undefined, description: undefined };
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
      };
    }),
});
