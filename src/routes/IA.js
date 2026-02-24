import { Router } from "express";
import {
  generateDescription,
  analyzeReviews,
  suggestCategory,
  askQuestion,
} from "../controllers/IA.js";
import { validateJWT, checkRole } from "../middlewares/validateJWT.js";
import { validateMongoId } from "../middlewares/validations.js";
import { body } from "express-validator";
import { validateFields } from "../middlewares/validations.js";

const router = Router();

/**
 * @swagger
 * /api/ai/generate-description:
 *   post:
 *     summary: Genera descripción automática de un producto (solo vendedor)
 *     tags: [AI]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, price, category]
 *             properties:
 *               name:
 *                 type: string
 *                 example: iPhone 15 Pro
 *               price:
 *                 type: number
 *                 example: 999.99
 *               category:
 *                 type: string
 *                 example: Electrónicos
 *     responses:
 *       200:
 *         description: Descripción generada exitosamente
 */
router.post(
  "/generate-description",
  validateJWT,
  checkRole("vendedor"),
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("El nombre del producto es obligatorio"),
    body("price").notEmpty().withMessage("El precio es obligatorio"),
    body("category")
      .trim()
      .notEmpty()
      .withMessage("La categoría es obligatoria"),
    validateFields,
  ],
  generateDescription,
);

/**
 * @swagger
 * /api/ai/analyze-reviews/{id}:
 *   get:
 *     summary: Analiza y resume las reseñas de un producto (público)
 *     tags: [AI]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resumen de reseñas generado
 *       400:
 *         description: El producto no tiene reseñas
 *       404:
 *         description: Producto no encontrado
 */
router.get("/analyze-reviews/:id", validateMongoId, analyzeReviews);

/**
 * @swagger
 * /api/ai/suggest-category:
 *   post:
 *     summary: Sugiere una categoría para un producto (solo vendedor)
 *     tags: [AI]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, description]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Auriculares Bluetooth
 *               description:
 *                 type: string
 *                 example: Auriculares inalámbricos con cancelación de ruido
 *     responses:
 *       200:
 *         description: Categoría sugerida
 */
router.post(
  "/suggest-category",
  validateJWT,
  checkRole("vendedor"),
  [
    body("name")
      .trim()
      .notEmpty()
      .withMessage("El nombre del producto es obligatorio"),
    body("description")
      .trim()
      .notEmpty()
      .withMessage("La descripción es obligatoria"),
    validateFields,
  ],
  suggestCategory,
);

/**
 * @swagger
 * /api/ai/ask:
 *   post:
 *     summary: Responde preguntas sobre el marketplace (público)
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [question]
 *             properties:
 *               question:
 *                 type: string
 *                 example: ¿Cómo puedo hacer una devolución?
 *     responses:
 *       200:
 *         description: Respuesta generada
 */
router.post(
  "/ask",
  [
    body("question")
      .trim()
      .notEmpty()
      .withMessage("La pregunta es obligatoria"),
    validateFields,
  ],
  askQuestion,
);

export default router;
