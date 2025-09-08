import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../../create-context";

const providerEnum = z.enum(["nominatim", "mapbox"]).default("nominatim");

export default createTRPCRouter({
  search: publicProcedure
    .input(
      z.object({
        q: z.string().min(2),
        limit: z.number().int().min(1).max(10).optional(),
        provider: providerEnum.optional(),
        mapboxToken: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const provider = input.provider ?? "nominatim";
      const limit = input.limit ?? 5;

      if (provider === "mapbox") {
        if (!input.mapboxToken) {
          throw new Error("Mapbox token is required for Mapbox geocoding");
        }
        const url = new URL(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            input.q
          )}.json`
        );
        url.searchParams.set("access_token", input.mapboxToken);
        url.searchParams.set("limit", String(limit));
        url.searchParams.set("autocomplete", "true");
        const res = await fetch(url.toString());
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Mapbox geocoding failed: ${res.status} ${text}`);
        }
        const data = (await res.json()) as any;
        const items = Array.isArray(data.features) ? data.features : [];
        return items.map((f: any) => {
          const [lon, lat] = f?.center ?? [undefined, undefined];
          const ctx = Array.isArray(f?.context) ? f.context : [];
          const placeName: string = f?.place_name ?? "";
          const parts: Record<string, string> = {};
          ctx.forEach((c: any) => {
            if (typeof c?.id === "string" && typeof c?.text === "string") {
              if (c.id.startsWith("place")) parts.city = c.text;
              if (c.id.startsWith("region")) parts.state = c.text;
              if (c.id.startsWith("country")) parts.country = c.text;
            }
          });
          return {
            name: f?.text ?? placeName,
            address: placeName,
            lat: typeof lat === "number" ? lat : undefined,
            lon: typeof lon === "number" ? lon : undefined,
            city: parts.city,
            state: parts.state,
            country: parts.country,
          } as const;
        });
      }

      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", input.q);
      url.searchParams.set("format", "json");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("limit", String(limit));
      const res = await fetch(url.toString(), {
        headers: {
          "User-Agent": "LoadrushApp/1.0 (+https://example.com)",
        },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Nominatim failed: ${res.status} ${text}`);
      }
      const data = (await res.json()) as any[];
      return data.map((d) => ({
        name: d?.display_name ?? "",
        address: d?.display_name ?? "",
        lat: d?.lat ? Number(d.lat) : undefined,
        lon: d?.lon ? Number(d.lon) : undefined,
        city: d?.address?.city ?? d?.address?.town ?? d?.address?.village,
        state: d?.address?.state,
        country: d?.address?.country,
      }));
    }),
});
