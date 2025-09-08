import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../../create-context";

const providerEnum = z.enum(["ors", "mapbox"]).default("ors");

export default createTRPCRouter({
  eta: publicProcedure
    .input(
      z.object({
        origin: z.object({ lat: z.number(), lon: z.number() }),
        destination: z.object({ lat: z.number(), lon: z.number() }),
        provider: providerEnum.optional(),
        orsKey: z.string().optional(),
        mapboxToken: z.string().optional(),
        profile: z.enum(["driving-hgv", "driving-car"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const provider = input.provider ?? "ors";
      const profile = input.profile ?? "driving-hgv";

      if (provider === "mapbox") {
        if (!input.mapboxToken) throw new Error("Mapbox token required");
        const url = new URL(
          `https://api.mapbox.com/directions/v5/mapbox/${profile}/${input.origin.lon},${input.origin.lat};${input.destination.lon},${input.destination.lat}`
        );
        url.searchParams.set("alternatives", "false");
        url.searchParams.set("overview", "simplified");
        url.searchParams.set("geometries", "geojson");
        url.searchParams.set("access_token", input.mapboxToken);
        const res = await fetch(url.toString());
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Mapbox directions failed: ${res.status} ${text}`);
        }
        const data = (await res.json()) as any;
        const route = Array.isArray(data.routes) ? data.routes[0] : undefined;
        const durationSec = route?.duration ?? undefined;
        const distanceMeters = route?.distance ?? undefined;
        return { durationSec, distanceMeters };
      }

      if (!input.orsKey) throw new Error("OpenRouteService API key required");
      const body = {
        coordinates: [
          [input.origin.lon, input.origin.lat],
          [input.destination.lon, input.destination.lat],
        ],
      };
      const res = await fetch(
        `https://api.openrouteservice.org/v2/directions/${profile}`,
        {
          method: "POST",
          headers: {
            Authorization: input.orsKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`ORS directions failed: ${res.status} ${text}`);
      }
      const data = (await res.json()) as any;
      const s = data?.routes?.[0]?.summary;
      const durationSec = s?.duration ?? undefined;
      const distanceMeters = s?.distance ?? undefined;
      return { durationSec, distanceMeters };
    }),
});
