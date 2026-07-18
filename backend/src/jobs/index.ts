import { runDailySync } from "./dailySync";
import { runWeeklySync } from "./weeklySync";
import { runMonthlySync } from "./monthlySync";

export const JOBS = {
  daily: runDailySync,
  weekly: runWeeklySync,
  monthly: runMonthlySync,
} as const;

export type JobName = keyof typeof JOBS;

export function isJobName(value: string): value is JobName {
  return value in JOBS;
}
