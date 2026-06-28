const fs = require("fs");
const path = require("path");
const { env } = require("../config/env");

function ensureLogDir() {
  fs.mkdirSync(env.logsPath, { recursive: true });
}

function stringifyMeta(meta) {
  if (!meta) {
    return "";
  }

  if (meta instanceof Error) {
    return ` ${meta.stack || meta.message}`;
  }

  if (typeof meta === "string") {
    return ` ${meta}`;
  }

  return ` ${JSON.stringify(meta)}`;
}

function write(level, message, meta) {
  ensureLogDir();

  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level.toUpperCase()}] ${message}${stringifyMeta(meta)}`;
  const file = path.join(env.logsPath, `radar-${timestamp.slice(0, 10)}.log`);

  fs.appendFileSync(file, `${line}\n`, "utf8");

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

const logger = {
  info: (message, meta) => write("info", message, meta),
  warn: (message, meta) => write("warn", message, meta),
  error: (message, meta) => write("error", message, meta),
  success: (message, meta) => write("success", message, meta)
};

module.exports = logger;
