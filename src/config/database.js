import mongoose from "mongoose";

export const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("🟢 Base de datos MongoDB conectada correctamente");
  } catch (error) {
    console.error("🔴 Error al conectar con MongoDB:", error.message);
  }
};
