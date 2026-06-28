const cron = require("node-cron");
const { env } = require("../config/env");
const radarService = require("../services/radar.service");
const logger = require("../utils/logger");

let scheduledTask;
let running = false;
let lastRun = null;
let lastError = null;

function getCronExpression(minutes) {
  const safeMinutes = Math.max(1, Math.min(59, Number(minutes || 30)));
  return `*/${safeMinutes} * * * *`;
}

function scheduleRadarJob() {
  if (scheduledTask) {
    return scheduledTask;
  }

  const expression = getCronExpression(env.radarIntervalMinutes);

  scheduledTask = cron.schedule(expression, async () => {
    try {
      await runRadarNow({ source: "cron" });
    } catch (error) {
      logger.error("Erro no job automatico do radar.", error);
    }
  });

  logger.success(`Job automatico do Radar Voltix agendado: ${expression}.`);
  return scheduledTask;
}

async function runRadarNow(options = {}) {
  if (running) {
    const error = new Error("O Radar Voltix ja esta em execucao.");
    error.statusCode = 409;
    throw error;
  }

  running = true;
  lastError = null;

  try {
    const summary = await radarService.runRadar({
      source: options.source || "manual",
      notify: options.notify !== false
    });

    lastRun = summary;
    return summary;
  } catch (error) {
    lastError = {
      message: error.message,
      occurredAt: new Date().toISOString()
    };
    throw error;
  } finally {
    running = false;
  }
}

function getStatus() {
  return {
    running,
    lastRun,
    lastError
  };
}

module.exports = {
  scheduleRadarJob,
  runRadarNow,
  getCronExpression,
  getStatus
};
