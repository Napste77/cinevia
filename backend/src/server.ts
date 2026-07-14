import { createApp } from "./app";
import { env } from "./config/env";
import { startInternalScheduler } from "./jobs/scheduler";

const app = createApp();

app.listen(env.port, () => {
  console.log(`NowSee API escuchando en :${env.port}`);
  if (env.enableInternalCron) startInternalScheduler();
});
