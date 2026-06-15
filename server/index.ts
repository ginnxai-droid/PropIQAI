import { createApp } from "./app";
import { loadConfig, validateRuntimeConfig } from "./config";
import { logStartup } from "./observability";

const config = loadConfig();
validateRuntimeConfig(config);
const app = createApp({ config });

app.listen(config.API_PORT, "0.0.0.0", () => {
  logStartup({
    service: "propiq-api",
    port: config.API_PORT,
    environment: config.NODE_ENV,
    allowedOriginCount: config.ALLOWED_ORIGINS.split(",").filter(Boolean).length,
  });
});
