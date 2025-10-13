import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  title: string;
  category: string;
  brand: string;
  product_type: string;
  sku: string;
  price?: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema = new Schema({
  title: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true
  },
  brand: {
    type: String,
    required: true
  },
  product_type: {
    type: String,
    required: true
  },
  sku: {
    type: String,
    required: true,
    unique: true
  },
  price: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Índice compuesto para búsquedas de texto con pesos
ProductSchema.index({
  title: 'text',
  category: 'text',
  brand: 'text',
  sku: 'text',
  product_type: 'text'
}, {
  weights: {
    title: 10,
    category: 5,
    brand: 3,
    sku: 2,
    product_type: 1
  }
});

// Índices individuales para búsquedas específicas y filtros
ProductSchema.index({ title: 1 });
ProductSchema.index({ category: 1 });
ProductSchema.index({ brand: 1 });
ProductSchema.index({ sku: 1 });
ProductSchema.index({ product_type: 1 });

export const Product = mongoose.model<IProduct>('Product', ProductSchema);