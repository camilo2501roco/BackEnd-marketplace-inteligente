import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  seller_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "category",
    required: true,
  },

  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
  },

  stock: {
    type: Number,
    required: true,
    default: 0,
  },

  img_url: {
    type: String,
  },
  review: [
    {
      buyer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
        required: true,
      },

      qualification: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
      },
      comment: {
        type: String,
        required: true,
        trim: true,
      },
      creation_date: {
        type: Date,
        default: Date.now,
      },
    },
  ],

  creation_date: {
    type: Date,
    default: Date.now,
  },
});

export const Product = mongoose.model("product", productSchema);
