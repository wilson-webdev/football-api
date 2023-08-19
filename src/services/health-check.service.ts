import { formatDuration, intervalToDuration } from "date-fns";

export class HealthCheckService {
  public static get() {
    const duration = intervalToDuration({
      start: 0,
      end: new Date(process.uptime() * 1_000),
    });

    return {
      uptime:
        formatDuration(duration, {
          format: ["days", "hours", "minutes"],
        }) || "0 minutes",
      message: "OK",
      timestamp: new Date().toISOString(),
    };
  }
}
