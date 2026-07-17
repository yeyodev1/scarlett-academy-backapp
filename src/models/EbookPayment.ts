import { Schema, model, Document } from "mongoose";

export type EbookExtra = "recipe_book" | "whatsapp_vip";
export type EbookPaymentStatus = "pending" | "approved" | "failed" | "canceled";
export type ConfirmationEmailStatus = "pending" | "sending" | "sent" | "failed";

export interface IEbookPayment extends Document {
  product: "quema_grasa_construye_musculo";
  buyer: {
    email: string;
    name: string;
    lastName: string;
  };
  extras: EbookExtra[];
  priceSnapshot: {
    ebook: number;
    recipeBook: number;
    whatsappVip: number;
  };
  amountCents: number;
  currency: "USD";
  environment: "test" | "prod";
  origin: string;
  status: EbookPaymentStatus;
  clientTransactionId: string;
  payphoneTransactionId: number | null;
  payphoneResponse: unknown;
  approvedAt: Date | null;
  confirmationEmailStatus: ConfirmationEmailStatus;
  confirmationEmailSentAt: Date | null;
  confirmationEmailError: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ebookPaymentSchema = new Schema<IEbookPayment>(
  {
    product: {
      type: String,
      enum: ["quema_grasa_construye_musculo"],
      default: "quema_grasa_construye_musculo",
    },
    buyer: {
      email: { type: String, required: true, lowercase: true, trim: true },
      name: { type: String, required: true, trim: true },
      lastName: { type: String, required: true, trim: true },
    },
    extras: [{ type: String, enum: ["recipe_book", "whatsapp_vip"] }],
    priceSnapshot: {
      ebook: { type: Number, required: true },
      recipeBook: { type: Number, required: true },
      whatsappVip: { type: Number, required: true },
    },
    amountCents: { type: Number, required: true },
    currency: { type: String, enum: ["USD"], default: "USD" },
    environment: { type: String, enum: ["test", "prod"], required: true },
    origin: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "failed", "canceled"],
      default: "pending",
    },
    clientTransactionId: { type: String, required: true, unique: true },
    payphoneTransactionId: { type: Number, default: null },
    payphoneResponse: { type: Schema.Types.Mixed, default: null },
    approvedAt: { type: Date, default: null },
    confirmationEmailStatus: {
      type: String,
      enum: ["pending", "sending", "sent", "failed"],
      default: "pending",
    },
    confirmationEmailSentAt: { type: Date, default: null },
    confirmationEmailError: { type: String, default: null },
  },
  { timestamps: true },
);

export const EbookPayment = model<IEbookPayment>("EbookPayment", ebookPaymentSchema);
