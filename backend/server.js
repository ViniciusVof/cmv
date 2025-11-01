import jsonServer from 'json-server';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const server = jsonServer.create();
const router = jsonServer.router(path.resolve('./db.json'));
const middlewares = jsonServer.defaults();

server.use(middlewares);
server.use(jsonServer.bodyParser);

const db = router.db; // lowdb instance

// Helpers
const nowIso = () => new Date().toISOString();
const pad6 = (n) => String(n).padStart(6, '0');

const getOpenCashRegister = () => db.get('cashRegisters').find({ status: 'open' }).value();

const createCashTransaction = (data) => {
  const col = db.get('cashTransactions');
  const id = (col.value()?.length || 0) + 1;
  const rec = { id, createdAt: nowIso(), ...data };
  col.push(rec).write();
  return rec;
};

const deductRecipe = (recipeId, multiplier, orderNumber) => {
  const recipe = db.get('recipes').find({ id: Number(recipeId) }).value() || db.get('recipes').find({ id: String(recipeId) }).value();
  if (!recipe) return;
  (recipe.items || []).forEach((it) => {
    const qty = (it.netQuantity || 0) * multiplier;
    if (qty <= 0) return;
    // Ingredient first
    const ing = db.get('ingredients').find((ing) => String(ing.id) === String(it.ingredientId)).value();
    if (ing) {
      const col = db.get('stockMovements');
      const id = (col.value()?.length || 0) + 1;
      col.push({
        id,
        ingredientId: String(ing.id),
        type: 'OUT',
        quantity: qty,
        date: nowIso(),
        note: `Pedido #${orderNumber} - baixa automática`,
      }).write();
      return;
    }
    // Sub-recipe
    deductRecipe(it.ingredientId, qty, orderNumber);
  });
};

const deductStockForOrder = (order) => {
  (order.items || []).forEach((oi) => {
    const product = db.get('pdvProducts').find((p) => String(p.id) === String(oi.productId)).value();
    if (product && product.recipeId) {
      deductRecipe(product.recipeId, oi.quantity, order.orderNumber);
    }
  });
};

// Custom endpoint: get open cash register
server.get('/cashRegisters/open', (req, res) => {
  const open = getOpenCashRegister();
  if (!open) return res.status(404).json({ message: 'No open cash register' });
  res.json(open);
});

// Custom endpoint: open cash register
server.post('/cashRegisters/open', (req, res) => {
  const { openingBalance = 0, notes = '' } = req.body || {};
  if (getOpenCashRegister()) return res.status(400).json({ message: 'Already open' });
  const id = (db.get('cashRegisters').value()?.length || 0) + 1;
  const rec = {
    id,
    openedAt: nowIso(),
    openingBalance: Number(openingBalance) || 0,
    notes,
    status: 'open',
  };
  db.get('cashRegisters').push(rec).write();
  res.status(201).json(rec);
});

// Custom endpoint: close cash register
server.post('/cashRegisters/:id/close', (req, res) => {
  const id = req.params.id;
  const cr = db.get('cashRegisters').find((c) => String(c.id) === String(id)).value();
  if (!cr || cr.status !== 'open') return res.status(400).json({ message: 'Cash register not open' });
  const { actualBalance = 0, notes = '' } = req.body || {};
  const tx = db
    .get('cashTransactions')
    .filter((t) => String(t.cashRegisterId) === String(id))
    .value();
  const ins = tx.filter((t) => t.type === 'in').reduce((s, t) => s + Number(t.amount || 0), 0);
  const outs = tx.filter((t) => t.type === 'out').reduce((s, t) => s + Number(t.amount || 0), 0);
  const expected = Number(cr.openingBalance || 0) + ins - outs;
  const updated = {
    ...cr,
    closedAt: nowIso(),
    status: 'closed',
    expectedBalance: expected,
    actualBalance: Number(actualBalance) || 0,
    difference: (Number(actualBalance) || 0) - expected,
    notes,
  };
  db.get('cashRegisters').find((c) => String(c.id) === String(id)).assign(updated).write();
  res.json(updated);
});

// Override POST /orders to add business logic
server.post('/orders', (req, res) => {
  const body = req.body || {};
  const ordersCol = db.get('orders');
  const all = ordersCol.value() || [];
  const nextOrderNumber = pad6(all.length + 1);

  const open = getOpenCashRegister();

  // Calculate totals
  const items = (body.items || []).map((it) => ({
    productId: it.productId,
    productName: it.productName,
    quantity: Number(it.quantity) || 0,
    unitPrice: Number(it.unitPrice) || 0,
    totalPrice: (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
    notes: it.notes || undefined,
  }));
  const subtotal = items.reduce((s, i) => s + i.totalPrice, 0);
  const deliveryFee = Number(body.deliveryFee || 0);
  const total = subtotal + deliveryFee;

  // Card/PIX fee (basic)
  let cardFee = 0;
  if (body.paymentMethodKind === 'credit' && body.paymentMethodId) {
    const pm = db.get('paymentMethods').find((p) => String(p.id) === String(body.paymentMethodId)).value();
    if (pm?.creditFee) cardFee = (total * Number(pm.creditFee)) / 100;
  } else if (body.paymentMethodKind === 'debit' && body.paymentMethodId) {
    const pm = db.get('paymentMethods').find((p) => String(p.id) === String(body.paymentMethodId)).value();
    if (pm?.debitFee) cardFee = (total * Number(pm.debitFee)) / 100;
  } else if (body.paymentMethodKind === 'pix' && body.paymentMethodId) {
    const pm = db.get('paymentMethods').find((p) => String(p.id) === String(body.paymentMethodId)).value();
    if (pm?.processingFeePercentage) cardFee = (total * Number(pm.processingFeePercentage)) / 100;
  }

  const deliveryFeeDriverAmount = deliveryFee > 0 ? deliveryFee : 0;
  const netAmount = total - cardFee - deliveryFeeDriverAmount;

  // Get customer name if customerId exists
  let customerName;
  if (body.customerId) {
    const customer = db.get('customers').find((c) => String(c.id) === String(body.customerId)).value();
    customerName = customer?.name;
  }

  const order = {
    orderNumber: nextOrderNumber,
    status: 'kitchen',
    customerId: body.customerId,
    customerName: customerName || body.customerName, // Use from body if provided, otherwise from lookup
    deliveryAreaId: body.deliveryAreaId,
    deliveryDriverId: body.deliveryDriverId,
    paymentMethodId: body.paymentMethodId,
    paymentMethodKind: body.paymentMethodKind,
    changeFor: body.changeFor,
    changeAmount: body.changeAmount,
    deliveryFee,
    items,
    subtotal,
    total,
    cashRegisterId: open?.id,
    cardFee,
    deliveryFeeDriverAmount,
    netAmount,
    notes: body.notes,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  const created = ordersCol.insert(order).write();

  // Cash transaction (in)
  if (open && netAmount > 0) {
    const label = body.paymentMethodKind
      ? { credit: 'Crédito', debit: 'Débito', pix: 'PIX', cash: 'Dinheiro', other: 'Outro' }[body.paymentMethodKind]
      : 'Pagamento';
    const feeText = cardFee > 0 ? ` (Taxa: R$ ${cardFee.toFixed(2)})` : '';
    createCashTransaction({
      cashRegisterId: open.id,
      type: 'in',
      amount: netAmount,
      description: `Pedido #${nextOrderNumber} - ${label}${feeText}`,
    });
  }

  // Stock deduction based on recipes
  try {
    deductStockForOrder({ ...created });
  } catch (e) {
    console.error('Erro baixa de estoque:', e);
  }

  res.status(201).json(created);
});

// On cancel or status update, preserve customerId and customerName, create OUT cash transaction if cancelled
server.patch('/orders/:id', (req, res, next) => {
  const id = req.params.id;
  const current = db.get('orders').find((o) => String(o.id) === String(id)).value();
  const status = req.body?.status;
  
  // Preserve customerId and customerName when updating status
  if (current && status !== undefined) {
    // Ensure customerId and customerName are preserved when status is updated
    if (req.body.customerId === undefined && current.customerId) {
      req.body.customerId = current.customerId;
    }
    if (req.body.customerName === undefined && current.customerName) {
      req.body.customerName = current.customerName;
    } else if (req.body.customerId !== undefined && req.body.customerId !== current.customerId) {
      // If customerId is being changed, update customerName
      const customer = db.get('customers').find((c) => String(c.id) === String(req.body.customerId)).value();
      if (customer) {
        req.body.customerName = customer.name;
      }
    }
  }
  
  // Create OUT cash transaction if cancelled
  if (current && status === 'cancelled' && current.cashRegisterId && current.netAmount) {
    createCashTransaction({
      cashRegisterId: current.cashRegisterId,
      type: 'out',
      amount: current.netAmount,
      description: `Cancelamento Pedido #${current.orderNumber || String(current.id).slice(0, 6)} - R$ ${Number(current.netAmount).toFixed(2)}`,
    });
  }
  
  next();
});

// Fallback to default router
server.use(router);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`JSON Server running at http://localhost:${PORT}`);
});


