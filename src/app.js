const express = require("express");
const alertsRoutes = require("./routes/alerts.routes");
const crawlersRoutes = require("./routes/crawlers.routes");
const dealSourcesRoutes = require("./routes/dealSources.routes");
const dashboardRoutes = require("./routes/dashboard.routes");
const healthRoutes = require("./routes/health.routes");
const historyRoutes = require("./routes/history.routes");
const inventoryRoutes = require("./routes/inventory.routes");
const marketplaceAdvisorRoutes = require("./routes/marketplaceAdvisor.routes");
const profitRoutes = require("./routes/profit.routes");
const radarRoutes = require("./routes/radar.routes");
const watchlistRoutes = require("./routes/watchlist.routes");
const whatsappRoutes = require("./routes/whatsapp.routes");
const rankingRoutes = require("./routes/ranking.routes");

const app = express();

app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => {
  res.json({
    app: "Radar Voltix",
    status: "online",
    routes: [
      "GET /health",
      "GET /dashboard",
      "GET /crawlers/status",
      "GET /deal-sources/status",
      "GET /history",
      "GET /history/:productHash",
      "GET /inventory",
      "POST /inventory",
      "PUT /inventory/:id",
      "DELETE /inventory/:id",
      "POST /inventory/:id/movement",
      "GET /marketplace-advisor/:productId",
      "GET /profit/simulate",
      "GET /profit/top",
      "POST /radar/run",
      "GET /alerts",
      "GET /watchlist",
      "POST /watchlist",
      "PUT /watchlist/:id",
      "DELETE /watchlist/:id",
      "GET /whatsapp/status",
      "POST /whatsapp/test",
      "GET /ranking/latest",
    ]
  });
});

app.use("/health", healthRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/crawlers", crawlersRoutes);
app.use("/deal-sources", dealSourcesRoutes);
app.use("/history", historyRoutes);
app.use("/inventory", inventoryRoutes);
app.use("/marketplace-advisor", marketplaceAdvisorRoutes);
app.use("/profit", profitRoutes);
app.use("/radar", radarRoutes);
app.use("/watchlist", watchlistRoutes);
app.use("/alerts", alertsRoutes);
app.use("/whatsapp", whatsappRoutes);
app.use("/ranking", rankingRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: "Rota nao encontrada.",
    path: req.originalUrl
  });
});

app.use((error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    error: error.message || "Erro interno do Radar Voltix."
  });
});

module.exports = app;
