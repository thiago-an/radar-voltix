const express = require("express");
const watchlistRepository = require("../repositories/watchlist.repository");

const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    data: watchlistRepository.list({
      includeDisabled: req.query.includeDisabled === "true"
    })
  });
});

router.post("/", (req, res, next) => {
  try {
    const created = watchlistRepository.create(req.body || {});
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
});

router.put("/:id", (req, res, next) => {
  try {
    const updated = watchlistRepository.update(req.params.id, req.body || {});

    if (!updated) {
      res.status(404).json({ error: "Item da watchlist nao encontrado." });
      return;
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", (req, res) => {
  const removed = watchlistRepository.remove(req.params.id);

  if (!removed) {
    res.status(404).json({ error: "Item da watchlist nao encontrado." });
    return;
  }

  res.status(204).send();
});

module.exports = router;
