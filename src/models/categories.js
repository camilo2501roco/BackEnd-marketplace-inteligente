import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  imagen_icono: {
    type: String,
  },
  creation_date: {
    type: Date,
    default: Date.now,
  },
});

export const Category = mongoose.model("category", categorySchema);
