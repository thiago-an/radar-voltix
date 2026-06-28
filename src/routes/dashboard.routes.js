const express = require("express");
const path = require("path");

const router = express.Router();
const dashboardPath = path.resolve(__dirname, "..", "public", "dashboard");

router.use("/assets", express.static(dashboardPath, {
  fallthrough: false,
  index: false,
  maxAge: "1h"
}));

router.get("/", (_req, res) => {
  res.sendFile(path.join(dashboardPath, "index.html"));
});

module.exports = router;
