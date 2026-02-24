import { Order } from "../models/orders.js";
import { Product } from "../models/products.js";

// POST /api/orders - Privado (solo comprador)
export const createOrder = async (req, res, next) => {
  try {
    const { shipping_address, order_details } = req.body;

    // Paso 1: validar todos los productos y stock ANTES de modificar nada
    const productsCache = [];
    let total = 0;
    const details = [];

    for (const item of order_details) {
      const product = await Product.findById(item.product_id);

      if (!product) {
        return res.status(404).json({
          error: true,
          mensaje: `Producto ${item.product_id} no encontrado`,
        });
      }

      if (product.stock < item.quantity) {
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

    // Paso 2: todo OK, ahora sí descontamos el stock
    for (const { product, quantity } of productsCache) {
      product.stock -= quantity;
      await product.save();
    }

    const order = await Order.create({
      buyer_id: req.usuario._id,
      order_details: details,
      total,
      shipping_address,
    });

    res.status(201).json({
      mensaje: "Orden creada exitosamente",
      orden: order,
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/orders - Privado (comprador ve las suyas, admin ve todas)
export const getOrders = async (req, res, next) => {
  try {
    const filter =
      req.usuario.rol === "admin" ? {} : { buyer_id: req.usuario._id };

    const { page = 1, limit = 10 } = req.query;
    const parsedLimit = Math.min(Number(limit) || 10, 50);
    const parsedPage = Number(page) || 1;
    const skip = (parsedPage - 1) * parsedLimit;

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

// GET /api/orders/:id - Privado (comprador dueño o admin)
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

    if (
      req.usuario.rol !== "admin" &&
      order.buyer_id._id.toString() !== req.usuario._id.toString()
    ) {
      return res.status(403).json({
        error: true,
        mensaje: "No tienes permiso para ver esta orden",
      });
    }

    res.status(200).json({ error: false, orden: order });
  } catch (error) {
    next(error);
  }
};

// PUT /api/orders/:id/status - Privado (solo admin)
export const updateOrderStatus = async (req, res, next) => {
  try {
    const { estado } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res
        .status(404)
        .json({ error: true, mensaje: "Orden no encontrada" });
    }

    // Si el admin cancela, devolvemos el stock
    if (estado === "cancelada" && order.estado !== "cancelada") {
      for (const item of order.order_details) {
        await Product.findByIdAndUpdate(item.product_id, {
          $inc: { stock: item.quantity },
        });
      }
    }

    order.estado = estado;
    await order.save();

    res.status(200).json({
      mensaje: "Estado actualizado",
      orden: order,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/orders/:id/cancel - Privado (comprador dueño)
// Se puede cancelar en cualquier estado menos entregada
export const cancelOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res
        .status(404)
        .json({ error: true, mensaje: "Orden no encontrada" });
    }

    if (order.buyer_id.toString() !== req.usuario._id.toString()) {
      return res.status(403).json({
        error: true,
        mensaje: "No puedes cancelar una orden que no es tuya",
      });
    }

    if (order.estado === "entregada") {
      return res.status(400).json({
        error: true,
        mensaje: "No se puede cancelar una orden ya entregada",
      });
    }

    if (order.estado === "cancelada") {
      return res.status(400).json({
        error: true,
        mensaje: "La orden ya está cancelada",
      });
    }

    // Devolvemos el stock de cada producto
    for (const item of order.order_details) {
      await Product.findByIdAndUpdate(item.product_id, {
        $inc: { stock: item.quantity },
      });
    }

    order.estado = "cancelada";
    await order.save();

    res
      .status(200)
      .json({ error: false, mensaje: "Orden cancelada y stock restaurado exitosamente" });
  } catch (error) {
    next(error);
  }
};
