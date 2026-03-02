import { Router } from "express";
import {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
} from "../controllers/orders.js";
import { validateJWT, checkRole } from "../middlewares/validateJWT.js";
import { validateMongoId } from "../middlewares/validations.js";
import {
  createOrderValidations,
  updateOrderStatusValidations,
} from "../middlewares/orders.js";

const router = Router();

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Crear una orden (solo comprador)
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [shipping_address, order_details]
 *             properties:
 *               shipping_address:
 *                 type: string
 *                 example: Calle 123 # 45-67, Bogotá
 *               order_details:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     product_id:
 *                       type: string
 *                       example: 64f1a2b3c4d5e6f7a8b9c0d1
 *                     quantity:
 *                       type: integer
 *                       example: 2
 *     responses:
 *       201:
 *         description: Orden creada exitosamente
 *       400:
 *         description: Stock insuficiente o datos inválidos
 *       404:
 *         description: Producto no encontrado
 */
router.post(
  "/",
  validateJWT,
  checkRole("comprador"),
  createOrderValidations,
  createOrder,
);

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Listar órdenes
 *     description: >
 *       Comprador ve sus propias órdenes.
 *       Vendedor ve las órdenes que contienen sus productos.
 *       Admin ve todas.
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Lista de órdenes
 */
router.get(
  "/",
  validateJWT,
  checkRole("comprador", "vendedor", "admin"),
  getOrders,
);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Obtener una orden por ID
 *     description: >
 *       Comprador solo ve sus órdenes.
 *       Vendedor solo ve órdenes con sus productos.
 *       Admin ve cualquier orden.
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Orden encontrada
 *       403:
 *         description: Sin permiso para ver esta orden
 *       404:
 *         description: Orden no encontrada
 */
router.get(
  "/:id",
  validateJWT,
  checkRole("comprador", "vendedor", "admin"),
  validateMongoId,
  getOrderById,
);

/**
 * @swagger
 * /api/orders/{id}/status:
 *   put:
 *     summary: Avanzar el estado de una orden (solo vendedor)
 *     description: >
 *       El vendedor solo puede avanzar el estado hacia adelante.
 *       Flujo válido: pendiente → confirmada → enviada → entregada.
 *       No puede cancelar ni retroceder estados.
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [estado]
 *             properties:
 *               estado:
 *                 type: string
 *                 enum: [confirmada, enviada, entregada]
 *                 example: confirmada
 *     responses:
 *       200:
 *         description: Estado actualizado exitosamente
 *       400:
 *         description: Transición de estado inválida
 *       403:
 *         description: No tienes productos en esta orden
 *       404:
 *         description: Orden no encontrada
 */
router.put(
  "/:id/status",
  validateJWT,
  checkRole("vendedor"),
  validateMongoId,
  updateOrderStatusValidations,
  updateOrderStatus,
);

/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   put:
 *     summary: Cancelar una orden (solo comprador dueño)
 *     description: >
 *       Solo se puede cancelar si la orden está en estado "pendiente".
 *       Al cancelar, el stock de cada producto se restaura automáticamente.
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Orden cancelada y stock restaurado
 *       400:
 *         description: Solo se pueden cancelar órdenes pendientes
 *       403:
 *         description: No puedes cancelar una orden que no es tuya
 *       404:
 *         description: Orden no encontrada
 */
router.put(
  "/:id/cancel",
  validateJWT,
  checkRole("comprador"),
  validateMongoId,
  cancelOrder,
);

export default router;
