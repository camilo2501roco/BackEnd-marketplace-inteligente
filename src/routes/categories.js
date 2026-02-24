import { Router } from "express";
import {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  getCategoryProducts,
  generateCategoryDescription,
  suggestSimilarCategories,
  analyzeCategoryProducts,
} from "../controllers/categories.js";
import { validateJWT, checkRole } from "../middlewares/validateJWT.js";
import { validateMongoId } from "../middlewares/validations.js";
import {
  createCategoryValidations,
  updateCategoryValidations,
  suggestSimilarValidations,
} from "../middlewares/categories.js";
import { uploadCategoryImage } from "../config/multer.js";

const router = Router();

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Crear una categoría (solo admin)
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Electrónicos
 *               description:
 *                 type: string
 *                 example: Productos electrónicos y tecnología
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Categoría creada exitosamente
 *       400:
 *         description: Datos inválidos o nombre duplicado
 *       403:
 *         description: Acceso denegado
 */
router.post(
  "/",
  validateJWT,
  checkRole("admin"),
  uploadCategoryImage.single("image"),
  createCategoryValidations,
  createCategory
);

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Listar categorías (público)
 *     tags: [Categories]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Buscar por nombre
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, creation_date]
 *           default: creation_date
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
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
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha inicio (ej. 2024-01-01)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha fin (ej. 2024-12-31)
 *     responses:
 *       200:
 *         description: Lista de categorías con paginación
 */
router.get("/", getCategories);

/**
 * @swagger
 * /api/categories/suggest-similar:
 *   post:
 *     summary: Sugerir categorías similares con IA (solo admin)
 *     tags: [Categories]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Deportes
 *     responses:
 *       200:
 *         description: Lista de categorías sugeridas
 */
router.post(
  "/suggest-similar",
  validateJWT,
  checkRole("admin"),
  suggestSimilarValidations,
  suggestSimilarCategories
);

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Obtener una categoría por ID (público)
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Categoría encontrada
 *       404:
 *         description: Categoría no encontrada
 */
router.get("/:id", validateMongoId, getCategoryById);

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Actualizar una categoría (solo admin)
 *     tags: [Categories]
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
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Categoría actualizada
 *       404:
 *         description: Categoría no encontrada
 */
router.put(
  "/:id",
  validateJWT,
  checkRole("admin"),
  validateMongoId,
  uploadCategoryImage.single("image"),
  updateCategoryValidations,
  updateCategory
);

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Eliminar una categoría (solo admin)
 *     tags: [Categories]
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
 *         description: Categoría eliminada
 *       400:
 *         description: No se puede eliminar, tiene productos asociados
 *       404:
 *         description: Categoría no encontrada
 */
router.delete("/:id", validateJWT, checkRole("admin"), validateMongoId, deleteCategory);

/**
 * @swagger
 * /api/categories/{id}/products:
 *   get:
 *     summary: Obtener productos de una categoría con estadísticas (público)
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Productos y estadísticas de la categoría
 *       404:
 *         description: Categoría no encontrada
 */
router.get("/:id/products", validateMongoId, getCategoryProducts);

/**
 * @swagger
 * /api/categories/{id}/generate-description:
 *   post:
 *     summary: Generar descripción automática con IA (solo admin)
 *     tags: [Categories]
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
 *         description: Descripción generada exitosamente
 *       404:
 *         description: Categoría no encontrada
 */
router.post(
  "/:id/generate-description",
  validateJWT,
  checkRole("admin"),
  validateMongoId,
  generateCategoryDescription
);

/**
 * @swagger
 * /api/categories/{id}/analyze-products:
 *   post:
 *     summary: Analizar productos de una categoría con IA (solo admin)
 *     tags: [Categories]
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
 *         description: Análisis de productos generado con IA
 *       400:
 *         description: La categoría no tiene productos
 *       404:
 *         description: Categoría no encontrada
 */
router.post(
  "/:id/analyze-products",
  validateJWT,
  checkRole("admin"),
  validateMongoId,
  analyzeCategoryProducts
);

export default router;
