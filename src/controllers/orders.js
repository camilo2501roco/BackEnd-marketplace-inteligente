import mongoose from "mongoose";
import { Order } from "../models/orders.js";
import { Product } from "../models/products.js";

// ─────────────────────────────────────────────
// Máquina de estados: define las transiciones válidas
// El vendedor solo puede avanzar el estado, nunca retroceder ni cancelar
// ─────────────────────────────────────────────
const TRANSICIONES_VALIDAS = {
  pendiente: ["confirmada"],
  confirmada: ["enviada"],
  enviada: ["entregada"],
  entregada: [],
  cancelada: [],
};

// Comprueba si el servidor MongoDB soporta transacciones (replica set o mongos)
const serverSupportsTransactions = async () => {
  try {
    const admin = mongoose.connection.db.admin();
    //Prefer 'hello' (newer servers), caer a 'isMaster' si no está disponible
    const info = await admin
      .command({ hello: 1 })
      .catch(() => admin.command({ isMaster: 1 }));

    // Replica set -> tiene 'setName', Mongos -> msg === 'isdbgrid'
    return !!(info && (info.setName || info.msg === "isdbgrid"));
  } catch (err) {
    return false;
  }
};

// POST /api/orders - Privado (solo comprador)
// Usa sesión MongoDB para garantizar que la orden se crea O se actualiza el stock, nunca parcialmente
export const createOrder = async (req, res, next) => {
  const canTransact = await serverSupportsTransactions();
  const session = canTransact ? await mongoose.startSession() : null;
  if (session) session.startTransaction();

  try {
    const { shipping_address, order_details } = req.body;

    // Paso 1: validar todos los productos y stock ANTES de modificar nada
    // Se hace dentro de la sesión para lock optimista
    const productsCache = [];
    let total = 0;
    const details = [];

    for (const item of order_details) {
      // Usar sesión en las lecturas también para lock consistente
      const q = Product.findById(item.product_id);
      const product = session ? await q.session(session) : await q;

      if (!product) {
        if (session) await session.abortTransaction();
        return res.status(404).json({
          error: true,
          mensaje: `Producto ${item.product_id} no encontrado`,
        });
      }

      if (product.stock < item.quantity) {
        if (session) await session.abortTransaction();
        return res.status(400).json({
          error: true,
          mensaje: `Stock insuficiente para "${product.name}". Disponible: ${product.stock}`,
        });
      }

      const subtotal = product.price * item.quantity;
      total += subtotal;

      details.push({
        product_id: product._id,
        quantity: item.quantity,
        unit_price: product.price,
        subtotal,
      });

      productsCache.push({ product, quantity: item.quantity });
    }

    // Paso 2: todo OK, ahora sí descontamos el stock (dentro de la transacción)
    for (const { product, quantity } of productsCache) {
      product.stock -= quantity;
      if (session) await product.save({ session });
      else await product.save();
    }

    // Paso 3: crear la orden dentro de la transacción
    const createOpts = session ? { session } : undefined;
    const order = await Order.create(
      [
        {
          buyer_id: req.usuario._id,
          order_details: details,
          total,
          shipping_address,
        },
      ],
      createOpts,
    );

    if (session) await session.commitTransaction();

    res
      .status(201)
      .json({ mensaje: "Orden creada exitosamente", orden: order[0] });
  } catch (error) {
    if (session) await session.abortTransaction();
    next(error);
  } finally {
    if (session) session.endSession();
  }
};

// GET /api/orders - Privado
// Comprador: sus órdenes | Vendedor: órdenes con sus productos | Admin: todas
export const getOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const parsedLimit = Math.min(Number(limit) || 10, 50);
    const parsedPage = Number(page) || 1;
    const skip = (parsedPage - 1) * parsedLimit;

    let filter = {};

    if (req.usuario.rol === "comprador") {
      filter = { buyer_id: req.usuario._id };
    } else if (req.usuario.rol === "vendedor") {
      const misProductos = await Product.find({
        seller_id: req.usuario._id,
      }).select("_id");
      const ids = misProductos.map((p) => p._id);
      filter = { "order_details.product_id": { $in: ids } };
    }
    // admin: filter queda {} -> ve todas

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate("buyer_id", "name email")
        .populate("order_details.product_id", "name price img_url")
        .sort({ order_date: -1 })
        .skip(skip)
        .limit(parsedLimit),
      Order.countDocuments(filter),
    ]);

    res.status(200).json({
      total,
      page: parsedPage,
      total_pages: Math.ceil(total / parsedLimit),
      ordenes: orders,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/orders/:id - Privado
export const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("buyer_id", "name email")
      .populate("order_details.product_id", "name price img_url");

    if (!order) {
      return res
        .status(404)
        .json({ error: true, mensaje: "Orden no encontrada" });
    }

    if (req.usuario.rol === "comprador") {
      if (order.buyer_id._id.toString() !== req.usuario._id.toString()) {
        return res.status(403).json({
          error: true,
          mensaje: "No tienes permiso para ver esta orden",
        });
      }
    } else if (req.usuario.rol === "vendedor") {
      const productIds = order.order_details.map((d) =>
        d.product_id._id.toString(),
      );
      const misProductos = await Product.find({
        seller_id: req.usuario._id,
        _id: { $in: productIds },
      });
      if (misProductos.length === 0) {
        return res
          .status(403)
          .json({ error: true, mensaje: "No tienes productos en esta orden" });
      }
    }
    // admin: pasa directo

    res.status(200).json({ orden: order });
  } catch (error) {
    next(error);
  }
};

// PUT /api/orders/:id/status - Privado (solo vendedor)
// Avanza el estado: pendiente->confirmada->enviada->entregada
// No puede cancelar ni retroceder
export const updateOrderStatus = async (req, res, next) => {
  const canTransact = await serverSupportsTransactions();
  const session = canTransact ? await mongoose.startSession() : null;
  if (session) session.startTransaction();

  try {
    const { estado } = req.body;
    const qOrder = Order.findById(req.params.id);
    const order = session ? await qOrder.session(session) : await qOrder;

    if (!order) {
      if (session) await session.abortTransaction();
      return res
        .status(404)
        .json({ error: true, mensaje: "Orden no encontrada" });
    }

    // Verificar que el vendedor tenga al menos un producto en la orden
    const productIds = order.order_details.map((d) => d.product_id);
    const qSeller = Product.findOne({
      _id: { $in: productIds },
      seller_id: req.usuario._id,
    });
    const sellerProduct = session
      ? await qSeller.session(session)
      : await qSeller;

    if (!sellerProduct) {
      if (session) await session.abortTransaction();
      return res
        .status(403)
        .json({ error: true, mensaje: "No tienes productos en esta orden" });
    }

    // Validar transición con la máquina de estados
    const transicionesPermitidas = TRANSICIONES_VALIDAS[order.estado];
    if (!transicionesPermitidas.includes(estado)) {
      if (session) await session.abortTransaction();
      const siguiente = transicionesPermitidas[0] || "ninguno (estado final)";
      return res.status(400).json({
        error: true,
        mensaje: `No puedes cambiar de "${order.estado}" a "${estado}". Siguiente estado válido: ${siguiente}`,
      });
    }

    order.estado = estado;
    if (session) await order.save({ session });
    else await order.save();

    if (session) await session.commitTransaction();

    res.status(200).json({
      mensaje: `Orden actualizada a "${estado}" exitosamente`,
      orden: order,
    });
  } catch (error) {
    if (session) await session.abortTransaction();
    next(error);
  } finally {
    if (session) session.endSession();
  }
};

// PUT /api/orders/:id/cancel - Privado (comprador dueño)
// Se puede cancelar en cualquier estado menos entregada
// Usa sesión para garantizar atomicidad al cancelar y devolver stock
export const cancelOrder = async (req, res, next) => {
  const canTransact = await serverSupportsTransactions();
  const session = canTransact ? await mongoose.startSession() : null;
  if (session) session.startTransaction();

  try {
    const qOrder = Order.findById(req.params.id);
    const order = session ? await qOrder.session(session) : await qOrder;

    if (!order) {
      if (session) await session.abortTransaction();
      return res
        .status(404)
        .json({ error: true, mensaje: "Orden no encontrada" });
    }

    if (order.buyer_id.toString() !== req.usuario._id.toString()) {
      if (session) await session.abortTransaction();
      return res.status(403).json({
        error: true,
        mensaje: "No puedes cancelar una orden que no es tuya",
      });
    }

    if (order.estado !== "pendiente") {
      if (session) await session.abortTransaction();
      return res.status(400).json({
        error: true,
        mensaje: `No puedes cancelar una orden en estado "${order.estado}". Solo se pueden cancelar órdenes pendientes`,
      });
    }

    // Devolvemos el stock de cada producto (dentro de la transacción)
    for (const item of order.order_details) {
      const updateOpts = session ? { session } : undefined;
      await Product.findByIdAndUpdate(
        item.product_id,
        { $inc: { stock: item.quantity } },
        updateOpts,
      );
    }

    order.estado = "cancelada";
    if (session) await order.save({ session });
    else await order.save();

    if (session) await session.commitTransaction();

    res.status(200).json({
      mensaje: "Orden cancelada y stock restaurado exitosamente",
    });
  } catch (error) {
    if (session) await session.abortTransaction();
    next(error);
  } finally {
    if (session) session.endSession();
  }
};
