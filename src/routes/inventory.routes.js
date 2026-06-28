const express = require("express");
const inventoryService = require("../services/inventory.service");

const router = express.Router();

router.get("/", (req, res) => {
  const result = inventoryService.list({
    status: req.query.status || undefined,
    search: req.query.search || undefined
  });
  res.json({ data: result.items, summary: result.summary });
});

router.get("/:id", (req, res) => {
  const item = inventoryService.get(req.params.id);
  if (!item) {
    res.status(404).json({ error: "Item de estoque nao encontrado." });
    return;
  }

  res.json({
    ...item,
    movements: inventoryService.listMovements(item.id)
  });
});

router.post("/", (req, res, next) => {
  try {
    res.status(201).json(inventoryService.create(req.body || {}));
  } catch (error) {
    next(error);
  }
});

router.put("/:id", (req, res, next) => {
  try {
    const item = inventoryService.update(req.params.id, req.body || {});
    if (!item) {
      res.status(404).json({ error: "Item de estoque nao encontrado." });
      return;
    }
    res.json(item);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", (req, res) => {
  if (!inventoryService.remove(req.params.id)) {
    res.status(404).json({ error: "Item de estoque nao encontrado." });
    return;
  }
  res.status(204).send();
});

router.post("/:id/movement", (req, res, next) => {
  try {
    const result = inventoryService.addMovement(req.params.id, req.body || {});
    if (!result) {
      res.status(404).json({ error: "Item de estoque nao encontrado." });
      return;
    }
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
