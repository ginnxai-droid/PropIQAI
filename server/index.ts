import { createApp } from "./app";
import { loadConfig } from "./config";

const config = loadConfig();
const app = createApp({ config });

app.listen(config.API_PORT, "0.0.0.0", () => {
  console.log(`PropIQ API listening on port ${config.API_PORT}`);
});
