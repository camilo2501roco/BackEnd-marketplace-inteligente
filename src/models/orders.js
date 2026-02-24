import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  buyer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  order_details: [
    {
      product_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "product",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
      unit_price: {
        type: Number,
        required: true,
      },
      subtotal: {
        type: Number,
        required: true,
      },
    },
  ],
  total: {
    type: Number,
    required: true,
  },
  estado: {
    type: String,
    enum: ["pendiente", "confirmada", "enviada", "entregada", "cancelada"],
    default: "pendiente",
  },
  shipping_address: {
    type: String,
    required: true,
    trim: true,
  },
  order_date: {
    type: Date,
    default: Date.now,
  },
});

export const Order = mongoose.model("order", orderSchema);
