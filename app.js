import "dotenv/config"; // ⚠️ DEBE ser el primer import para que las env vars estén disponibles
import express from "express";
import morgan from "morgan";
import cors from "cors";
import { connectDB } from "./src/config/database.js";
import { authRouter, userRouter } from "./src/routes/users.js";
import categoryRouter from "./src/routes/categories.js";
import productRouter from "./src/routes/products.js";
import orderRouter from "./src/routes/orders.js";
import aiRouter from "./src/routes/IA.js";
import { specs, swaggerUi } from "./src/config/swagger.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Imágenes subidas por Multer
app.use("/uploads", express.static("uploads"));

// Conexión a MongoDB
connectDB();

// Swagger - Documentación
app.use("/api-docs", ...swaggerUi.serve, swaggerUi.setup(specs));

// Rutas
app.get("/", (req, res) => {
  res.json({
    mensaje: "Marketplace API",
    version: "1.0.0",
    documentacion: "/api-docs",
  });
});

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/products", productRouter);
app.use("/api/orders", orderRouter);
app.use("/api/ai", aiRouter);

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ error: true, mensaje: "Endpoint no encontrado" });
});

// Manejador de errores global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: true, mensaje: "Error interno del servidor" });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Documentación en http://localhost:${PORT}/api-docs`);
});
