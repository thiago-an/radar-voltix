const { getDatabase } = require("../database/db");

function mapItem(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    sku: row.sku,
    category: row.category,
    quantity: row.quantity,
    purchasePrice: row.purchase_price,
    expectedSellPrice: row.expected_sell_price,
    marketplace: row.marketplace,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapMovement(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    inventoryItemId: row.inventory_item_id,
    type: row.type,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    notes: row.notes,
    createdAt: row.created_at
  };
}

function findById(id) {
  return mapItem(getDatabase()
    .prepare("SELECT * FROM inventory_items WHERE id = ?")
    .get(Number(id)));
}

function list(options = {}) {
  const clauses = [];
  const params = [];

  if (options.status) {
    clauses.push("status = ?");
    params.push(options.status);
  }

  if (options.search) {
    clauses.push("(name LIKE ? OR sku LIKE ? OR category LIKE ?)");
    const search = `%${options.search}%`;
    params.push(search, search, search);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return getDatabase()
    .prepare(`SELECT * FROM inventory_items ${where} ORDER BY updated_at DESC, name ASC`)
    .all(...params)
    .map(mapItem);
}

function insertMovement(database, input) {
  const result = database.prepare(`
    INSERT INTO inventory_movements (
      inventory_item_id,
      type,
      quantity,
      unit_price,
      notes,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    Number(input.inventoryItemId),
    input.type,
    Number(input.quantity),
    input.unitPrice ?? null,
    input.notes || null,
    input.createdAt || new Date().toISOString()
  );

  return Number(result.lastInsertRowid);
}

function findMovementById(id) {
  return mapMovement(getDatabase()
    .prepare("SELECT * FROM inventory_movements WHERE id = ?")
    .get(Number(id)));
}

function create(input) {
  const database = getDatabase();
  const now = new Date().toISOString();
  database.exec("BEGIN IMMEDIATE;");

  try {
    const result = database.prepare(`
      INSERT INTO inventory_items (
        name,
        sku,
        category,
        quantity,
        purchase_price,
        expected_sell_price,
        marketplace,
        status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      input.name,
      input.sku,
      input.category,
      input.quantity,
      input.purchasePrice,
      input.expectedSellPrice,
      input.marketplace,
      input.status,
      now,
      now
    );
    const itemId = Number(result.lastInsertRowid);

    if (input.quantity > 0) {
      insertMovement(database, {
        inventoryItemId: itemId,
        type: "purchase",
        quantity: input.quantity,
        unitPrice: input.purchasePrice,
        notes: input.notes || "Estoque inicial",
        createdAt: now
      });
    }

    database.exec("COMMIT;");
    return findById(itemId);
  } catch (error) {
    database.exec("ROLLBACK;");
    throw error;
  }
}

function update(id, input, previous) {
  const database = getDatabase();
  const now = new Date().toISOString();
  const quantityDelta = input.quantity - previous.quantity;
  database.exec("BEGIN IMMEDIATE;");

  try {
    database.prepare(`
      UPDATE inventory_items
      SET
        name = ?,
        sku = ?,
        category = ?,
        quantity = ?,
        purchase_price = ?,
        expected_sell_price = ?,
        marketplace = ?,
        status = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      input.name,
      input.sku,
      input.category,
      input.quantity,
      input.purchasePrice,
      input.expectedSellPrice,
      input.marketplace,
      input.status,
      now,
      Number(id)
    );

    if (quantityDelta !== 0) {
      insertMovement(database, {
        inventoryItemId: id,
        type: "adjustment",
        quantity: quantityDelta,
        unitPrice: input.purchasePrice,
        notes: input.notes || "Quantidade alterada na edicao",
        createdAt: now
      });
    }

    database.exec("COMMIT;");
    return findById(id);
  } catch (error) {
    database.exec("ROLLBACK;");
    throw error;
  }
}

function addMovement(item, input) {
  const database = getDatabase();
  const now = new Date().toISOString();
  const delta = input.type === "sale" ? -input.quantity : input.quantity;
  const nextQuantity = item.quantity + delta;
  let purchasePrice = item.purchasePrice;

  if (input.type === "purchase" && input.unitPrice !== null && input.unitPrice !== undefined) {
    purchasePrice = nextQuantity > 0
      ? ((item.quantity * item.purchasePrice) + (input.quantity * input.unitPrice)) / nextQuantity
      : input.unitPrice;
  }

  const status = nextQuantity === 0 ? "sold_out" : "active";
  database.exec("BEGIN IMMEDIATE;");

  try {
    const movementId = insertMovement(database, {
      inventoryItemId: item.id,
      type: input.type,
      quantity: input.quantity,
      unitPrice: input.unitPrice,
      notes: input.notes,
      createdAt: now
    });

    database.prepare(`
      UPDATE inventory_items
      SET quantity = ?, purchase_price = ?, status = ?, updated_at = ?
      WHERE id = ?
    `).run(nextQuantity, purchasePrice, status, now, item.id);

    database.exec("COMMIT;");
    return {
      item: findById(item.id),
      movement: findMovementById(movementId)
    };
  } catch (error) {
    database.exec("ROLLBACK;");
    throw error;
  }
}

function listMovements(itemId, limit = 100) {
  return getDatabase()
    .prepare(`
      SELECT * FROM inventory_movements
      WHERE inventory_item_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `)
    .all(Number(itemId), Number(limit))
    .map(mapMovement);
}

function remove(id) {
  return getDatabase()
    .prepare("DELETE FROM inventory_items WHERE id = ?")
    .run(Number(id)).changes > 0;
}

module.exports = {
  findById,
  list,
  create,
  update,
  addMovement,
  listMovements,
  remove
};
