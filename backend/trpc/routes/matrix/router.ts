import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../../create-context";

const providerEnum = z.enum(["ors", "mapbox"]).default("ors");

export default createTRPCRouter({
  matrix: publicProcedure
    .input(
      z.object({
        points: z.array(z.object({ lat: z.number(), lon: z.number() })).min(2),
        provider: providerEnum.optional(),
        orsKey: z.string().optional(),
        mapboxToken: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const provider = input.provider ?? "ors";
      if (provider === "mapbox") {
        if (!input.mapboxToken) throw new Error("Mapbox token required");
        const coords = input.points.map((p) => `${p.lon},${p.lat}`).join(";");
        const url = new URL(
          `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${coords}`
        );
        url.searchParams.set("access_token", input.mapboxToken);
        const res = await fetch(url.toString());
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Mapbox matrix failed: ${res.status} ${text}`);
        }
        const data = (await res.json()) as any;
        return {
          durations: data?.durations,
          distances: data?.distances,
        };
      }

      if (!input.orsKey) throw new Error("OpenRouteService API key required");
      const body = {
        locations: input.points.map((p) => [p.lon, p.lat]),
        metrics: ["distance", "duration"],
      };
      const res = await fetch("https://api.openrouteservice.org/v2/matrix/driving-hgv", {
        method: "POST",
        headers: {
          Authorization: input.orsKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`ORS matrix failed: ${res.status} ${text}`);
      }
      const data = (await res.json()) as any;
      return {
        durations: data?.durations,
        distances: data?.distances,
      };
    }),
});
