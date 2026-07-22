import { pathToFileURL } from "node:url";
import { createApp } from "./app.js";
import { config } from "./config.js";

const runtime = createApp();

export const app = runtime.app;

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  app.listen(config.port, () => {
    console.log(`Kaoyan Pomodoro API listening on port ${config.port}`);
    if (runtime.storageStatus.status === "risk") {
      console.warn(runtime.storageStatus.message);
    }
  });
}
