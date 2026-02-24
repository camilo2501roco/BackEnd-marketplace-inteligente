import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },
  rol: {
    type: String,
    enum: ["comprador", "vendedor", "admin"],
    default: "comprador",
  },
  // Campos para recuperación de contraseña
  reset_code: {
    type: String,
    default: null,
  },
  reset_code_expires: {
    type: Date,
    default: null,
  },
  registration_date: {
    type: Date,
    default: Date.now,
  },
});

export const User = mongoose.model("user", userSchema);
