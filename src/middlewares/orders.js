import { body } from "express-validator";
import { validateFields } from "./validations.js";

// Crear orden
export const createOrderValidations = [
  body("shipping_address")
    .trim()
    .notEmpty()
    .withMessage("La dirección de envío es obligatoria")
    .isLength({ min: 10, max: 300 })
    .withMessage("La dirección debe tener entre 10 y 300 caracteres"),

  body("order_details")
    .isArray({ min: 1 })
    .withMessage("La orden debe tener al menos un producto"),

  body("order_details.*.product_id")
    .notEmpty()
    .withMessage("El ID del producto es obligatorio")
    .isMongoId()
    .withMessage("El ID del producto no es válido"),

  body("order_details.*.quantity")
    .notEmpty()
    .withMessage("La cantidad es obligatoria")
    .isInt({ min: 1 })
    .withMessage("La cantidad debe ser mínimo 1"),

  validateFields,
];

// Actualizar estado de orden (solo vendedor, solo estados hacia adelante)
export const updateOrderStatusValidations = [
  body("estado")
    .notEmpty()
    .withMessage("El estado es obligatorio")
    .isIn(["confirmada", "enviada", "entregada"])
    .withMessage(
      "Estado inválido. El vendedor solo puede avanzar a: confirmada, enviada, entregada",
    ),

  validateFields,
];
