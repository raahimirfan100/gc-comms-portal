import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level(label) {
      return { level: label };
    },
  },
  base: {
    service: "railway-service",
  },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "*.password",
      "*.token",
      "*.apiKey",
      "*.api_key",
    ],
    censor: "[REDACTED]",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export const cronLogger = logger.child({ subsystem: "cron" });
export const whatsappLogger = logger.child({ subsystem: "whatsapp" });
export const sheetsLogger = logger.child({ subsystem: "sheets" });
export const callingLogger = logger.child({ subsystem: "calling" });
