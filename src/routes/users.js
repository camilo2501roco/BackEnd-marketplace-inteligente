import { Router } from "express";
import {
  register,
  login,
  profile,
  changePassword,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.js";
import {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "../controllers/users.js";
import { validateJWT, checkRole } from "../middlewares/validateJWT.js";
import {
  registerValidations,
  loginValidations,
  validateMongoId,
  updateUserValidations,
  changePasswordValidations,
  forgotPasswordValidations,
  resetPasswordValidations,
} from "../middlewares/validations.js";

// ── Auth ──────────────────────────────────────
export const authRouter = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Registrar un nuevo usuario
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Juan Pérez
 *               email:
 *                 type: string
 *                 example: juan@email.com
 *               password:
 *                 type: string
 *                 example: Password1
 *               rol:
 *                 type: string
 *                 enum: [comprador, vendedor]
 *                 example: comprador
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 */
authRouter.post("/register", registerValidations, register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: juan@email.com
 *               password:
 *                 type: string
 *                 example: Password1
 *     responses:
 *       200:
 *         description: Login exitoso, retorna token
 */
authRouter.post("/login", loginValidations, login);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     summary: Ver perfil del usuario autenticado
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del usuario
 */
authRouter.get("/profile", validateJWT, profile);

/**
 * @swagger
 * /api/auth/change-password:
 *   put:
 *     summary: Cambiar contraseña del usuario autenticado
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [current_password, new_password, confirm_password]
 *             properties:
 *               current_password:
 *                 type: string
 *                 example: Password1
 *               new_password:
 *                 type: string
 *                 example: NewPassword1
 *               confirm_password:
 *                 type: string
 *                 example: NewPassword1
 *     responses:
 *       200:
 *         description: Contraseña actualizada exitosamente
 */
authRouter.put(
  "/change-password",
  validateJWT,
  changePasswordValidations,
  changePassword,
);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Solicitar código de recuperación de contraseña
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 example: juan@email.com
 *     responses:
 *       200:
 *         description: Código enviado al email (si existe)
 */
authRouter.post("/forgot-password", forgotPasswordValidations, forgotPassword);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Resetear contraseña con código de verificación
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, code, new_password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: juan@email.com
 *               code:
 *                 type: string
 *                 example: "123456"
 *               new_password:
 *                 type: string
 *                 example: NewPassword1
 *     responses:
 *       200:
 *         description: Contraseña actualizada exitosamente
 *       400:
 *         description: Código inválido o expirado
 */
authRouter.post("/reset-password", resetPasswordValidations, resetPassword);

// ── Users (solo admin) ────────────────────────
export const userRouter = Router();

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Listar todos los usuarios (solo admin)
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: rol
 *         schema:
 *           type: string
 *           enum: [comprador, vendedor, admin]
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
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
 *         description: Lista de usuarios
 */
userRouter.get("/", validateJWT, checkRole("admin"), getUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Obtener un usuario por ID (solo admin)
 *     tags: [Users]
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
 *         description: Usuario encontrado
 */
userRouter.get(
  "/:id",
  validateJWT,
  checkRole("admin"),
  validateMongoId,
  getUserById,
);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     summary: Actualizar un usuario (solo admin)
 *     tags: [Users]
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
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               rol:
 *                 type: string
 *                 enum: [comprador, vendedor, admin]
 *     responses:
 *       200:
 *         description: Usuario actualizado
 */
userRouter.put(
  "/:id",
  validateJWT,
  checkRole("admin"),
  validateMongoId,
  updateUserValidations,
  updateUser,
);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Eliminar un usuario (solo admin)
 *     tags: [Users]
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
 *         description: Usuario eliminado
 */
userRouter.delete(
  "/:id",
  validateJWT,
  checkRole("admin"),
  validateMongoId,
  deleteUser,
);
