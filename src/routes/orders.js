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
 *     summary: Listar órdenes (comprador ve las suyas, admin ve todas)
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de órdenes
 */
router.get("/", validateJWT, checkRole("comprador", "admin"), getOrders);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Obtener una orden por ID
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
 *         description: No tienes permiso para ver esta orden
 *       404:
 *         description: Orden no encontrada
 */
router.get(
  "/:id",
  validateJWT,
  checkRole("comprador", "admin"),
  validateMongoId,
  getOrderById,
);

/**
 * @swagger
 * /api/orders/{id}/status:
 *   put:
 *     summary: Actualizar estado de una orden (solo admin)
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
 *                 enum: [pendiente, confirmada, enviada, entregada, cancelada]
 *                 example: confirmada
 *     responses:
 *       200:
 *         description: Estado actualizado
 *       404:
 *         description: Orden no encontrada
 */
router.put(
  "/:id/status",
  validateJWT,
  checkRole("admin"),
  validateMongoId,
  updateOrderStatusValidations,
  updateOrderStatus,
);

/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   put:
 *     summary: Cancelar una orden (solo el comprador dueño, si está pendiente)
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
 *         description: Orden cancelada exitosamente
 *       400:
 *         description: No se puede cancelar en este estado
 *       403:
 *         description: No puedes cancelar una orden que no es tuya
 */
router.put(
  "/:id/cancel",
  validateJWT,
  checkRole("comprador"),
  validateMongoId,
  cancelOrder,
);

export default router;
