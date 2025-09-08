import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../../create-context";
import { getStateAvgPrice, normalizeStateCode } from "@/utils/fuelStateAvg";

export default createTRPCRouter({
  stateAvg: publicProcedure
    .input(z.object({ state: z.string() }))
    .query(async ({ input }) => {
      const price = getStateAvgPrice(input.state);
      return { state: normalizeStateCode(input.state), price };
    }),
  eiaDiesel: publicProcedure
    .input(
      z.object({
        state: z.string().optional(),
        eiaApiKey: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const fallback = input.state ? getStateAvgPrice(input.state) : undefined;
      if (!input.eiaApiKey) {
        return { price: fallback, source: "fallback" as const };
      }

      const url = new URL("https://api.eia.gov/v2/petroleum/pri/gnd/data/");
      url.searchParams.set("api_key", input.eiaApiKey);
      url.searchParams.set("frequency", "weekly");
      url.searchParams.set("data", "value");
      url.searchParams.set("sort", "period|desc");
      url.searchParams.set("offset", "0");
      url.searchParams.set("length", "1");
      url.searchParams.set("facets[product]", "E35");
      if (input.state) {
        url.searchParams.set("facets[areaName]", normalizeStateCode(input.state));
      }
      const res = await fetch(url.toString());
      if (!res.ok) {
        return { price: fallback, source: "fallback" as const };
      }
      const data = (await res.json()) as any;
      const value = data?.response?.data?.[0]?.value;
      const price = typeof value === "number" ? value : fallback;
      return { price, source: typeof value === "number" ? (input.state ? "eia-state" : "eia-national") : "fallback" as const };
    }),
});
