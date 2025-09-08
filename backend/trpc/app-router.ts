import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import geocodeRouter from "./routes/geocode/router";
import routeRouter from "./routes/route/router";
import matrixRouter from "./routes/matrix/router";
import fuelRouter from "./routes/fuel/router";
import weatherRouter from "./routes/weather/router";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  geocode: geocodeRouter,
  route: routeRouter,
  matrix: matrixRouter,
  fuel: fuelRouter,
  weather: weatherRouter,
});

export type AppRouter = typeof appRouter;