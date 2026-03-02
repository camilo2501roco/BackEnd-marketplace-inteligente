import { Router } from "express";
import {
  createProduct,
  getProducts,
  getProductById,
  getProductsBySeller,
  updateProduct,
  deleteProduct,
  addReview,
} from "../controllers/products.js";
import { validateJWT, checkRole } from "../middlewares/validateJWT.js";
import {
  validateMongoId,
  validateMongoIdParam,
} from "../middlewares/validations.js";
import {
  createProductValidations,
  updateProductValidations,
  createReviewValidations,
} from "../middlewares/products.js";
import { uploadProductImage } from "../config/multer.js";

const router = Router();

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Crear un producto (solo vendedor)
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name, price, stock, category_id]
 *             properties:
 *               name:
 *                 type: string
 *                 example: iPhone 15
 *               description:
 *                 type: string
 *                 example: Smartphone Apple
 *               price:
 *                 type: number
 *                 example: 999.99
 *               stock:
 *                 type: integer
 *                 example: 10
 *               category_id:
 *                 type: string
 *                 example: 64f1a2b3c4d5e6f7a8b9c0d1
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Producto creado exitosamente
 *       403:
 *         description: Acceso denegado
 */
router.post(
  "/",
  validateJWT,
  checkRole("vendedor"),
  uploadProductImage.single("image"),
  createProductValidations,
  createProduct,
);

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Listar productos (público)
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: category_id
 *         schema:
 *           type: string
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Buscar por nombre o descripción
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
 *         description: Lista de productos
 */
router.get("/", getProducts);

/**
 * @swagger
 * /api/products/seller/{sellerId}:
 *   get:
 *     summary: Obtener productos de un vendedor (público)
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: sellerId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Productos del vendedor
 */
router.get(
  "/seller/:sellerId",
  validateMongoIdParam("sellerId"),
  getProductsBySeller,
);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Obtener un producto por ID (público)
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Producto encontrado
 *       404:
 *         description: Producto no encontrado
 */
router.get("/:id", validateMongoId, getProductById);

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Actualizar un producto (solo el vendedor dueño)
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *               category_id:
 *                 type: string
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Producto actualizado
 *       403:
 *         description: No puedes editar un producto que no es tuyo
 */
router.put(
  "/:id",
  validateJWT,
  checkRole("vendedor", "admin"),
  validateMongoId,
  uploadProductImage.single("image"),
  updateProductValidations,
  updateProduct,
);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Eliminar un producto (vendedor dueño o admin)
 *     tags: [Products]
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
 *         description: Producto eliminado
 *       403:
 *         description: No puedes eliminar un producto que no es tuyo
 */
router.delete(
  "/:id",
  validateJWT,
  checkRole("vendedor", "admin"),
  validateMongoId,
  deleteProduct,
);

/**
 * @swagger
 * /api/products/{id}/reviews:
 *   post:
 *     summary: Agregar reseña a un producto (solo comprador)
 *     tags: [Products]
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
 *             required: [qualification, comment]
 *             properties:
 *               qualification:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *               comment:
 *                 type: string
 *                 example: Excelente producto
 *     responses:
 *       201:
 *         description: Reseña agregada exitosamente
 *       400:
 *         description: Ya reseñaste este producto
 */
router.post(
  "/:id/reviews",
  validateJWT,
  checkRole("comprador"),
  validateMongoId,
  createReviewValidations,
  addReview,
);

export default router;
