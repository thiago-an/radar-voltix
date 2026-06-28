const fs = require("fs");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const { env } = require("../config/env");
const logger = require("../utils/logger");

let client;
let initialized = false;
let ready = false;
let lastQrAt = null;
let lastError = null;

function createClient() {
  fs.mkdirSync(env.whatsappSessionPath, { recursive: true });

  return new Client({
    authStrategy: new LocalAuth({
      clientId: "radar-voltix",
      dataPath: env.whatsappSessionPath
    }),
    puppeteer: {
      headless: env.headless,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    }
  });
}

function attachEvents(selectedClient) {
  selectedClient.on("qr", (qr) => {
    lastQrAt = new Date().toISOString();
    logger.warn("Escaneie o QR Code abaixo com o WhatsApp da Voltix.");
    qrcode.generate(qr, { small: true });
  });

  selectedClient.on("authenticated", () => {
    logger.success("WhatsApp autenticado.");
  });

  selectedClient.on("ready", () => {
    ready = true;
    lastError = null;
    logger.success("WhatsApp Web conectado e pronto para alertas.");
  });

  selectedClient.on("auth_failure", (message) => {
    ready = false;
    lastError = message;
    logger.error("Falha de autenticacao no WhatsApp.", message);
  });

  selectedClient.on("disconnected", (reason) => {
    ready = false;
    initialized = false;
    lastError = reason;
    logger.warn("WhatsApp desconectado.", reason);
  });
}

function initializeWhatsApp() {
  if (!client) {
    client = createClient();
    attachEvents(client);
  }

  if (!initialized) {
    initialized = true;
    client.initialize().catch((error) => {
      ready = false;
      initialized = false;
      lastError = error.message;
      logger.error("Erro ao iniciar WhatsApp Web.", error);
    });
  }

  return client;
}

function waitUntilReady(timeoutMs = 15000) {
  initializeWhatsApp();

  if (ready) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      if (ready) {
        clearInterval(timer);
        resolve(true);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        clearInterval(timer);
        resolve(false);
      }
    }, 500);
  });
}

async function sendMessage(text, targetNumber = env.whatsappTargetNumber) {
  if (!targetNumber) {
    logger.warn("WHATSAPP_TARGET_NUMBER nao configurado. Alerta nao enviado.");
    return {
      sent: false,
      reason: "missing_target_number"
    };
  }

  const isReady = await waitUntilReady(15000);

  if (!isReady) {
    logger.warn("WhatsApp ainda nao esta pronto. Alerta nao enviado agora.");
    return {
      sent: false,
      reason: "whatsapp_not_ready"
    };
  }

  try {
    await client.sendMessage(targetNumber, text);
    logger.success("Mensagem enviada pelo WhatsApp.");
    return {
      sent: true,
      targetNumber
    };
  } catch (error) {
    lastError = error.message;
    logger.error("Erro ao enviar mensagem pelo WhatsApp.", error);
    return {
      sent: false,
      reason: error.message
    };
  }
}

async function shutdownWhatsApp() {
  if (!client) {
    return;
  }

  try {
    await client.destroy();
  } catch (error) {
    logger.warn("Nao foi possivel encerrar o WhatsApp Web com limpeza completa.", error.message);
  } finally {
    client = null;
    initialized = false;
    ready = false;
  }
}

function getStatus() {
  return {
    initialized,
    ready,
    hasTargetNumber: Boolean(env.whatsappTargetNumber),
    lastQrAt,
    lastError
  };
}

module.exports = {
  initializeWhatsApp,
  waitUntilReady,
  sendMessage,
  shutdownWhatsApp,
  getStatus
};
