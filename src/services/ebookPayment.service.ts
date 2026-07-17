import axios, { AxiosError } from "axios";
import crypto from "crypto";
import { CustomError } from "../errors/customError.error";
import { EbookPayment, type EbookExtra, type IEbookPayment } from "../models/EbookPayment";
import { sendPurchaseEvent } from "./metaPixel.service";
import { sendEbookPurchaseConfirmationEmail } from "../helpers/email.helper";

const PAYPHONE_CONFIRM_URL = "https://paymentbox.payphonetodoesposible.com/api/confirm";
const PRICES = { ebook: 3300, recipeBook: 1000, whatsappVip: 1500 } as const;
const VALID_EXTRAS = new Set<EbookExtra>(["recipe_book", "whatsapp_vip"]);
type PayphoneEnvironment = "test" | "prod";

function configuredOrigins(): Set<string> {
  return new Set([
    "http://localhost:5173",
    "http://localhost:5174",
    "https://testing-storybrand-frontend.bakano.ec",
    "https://scarlettcordova-quemagrasa-cons-musc.netlify.app",
    process.env.FRONTEND_URL || "",
    ...(process.env.CORS_ORIGINS || "").split(",").map((origin) => origin.trim()),
  ].filter(Boolean));
}

function validateOrigin(rawOrigin: unknown): string {
  if (typeof rawOrigin !== "string") throw new CustomError("Invalid origin", 400);
  let origin: string;
  try {
    origin = new URL(rawOrigin).origin;
  } catch {
    throw new CustomError("Invalid origin", 400);
  }
  if (!configuredOrigins().has(origin)) throw new CustomError("Origin not allowed", 403);
  return origin;
}

function environmentForOrigin(origin: string): PayphoneEnvironment {
  const hostname = new URL(origin).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("testing-")
    ? "test"
    : "prod";
}

function credentialsFor(environment: PayphoneEnvironment) {
  const token = environment === "test" ? process.env.PAYPHONE_TEST_TOKEN : process.env.PAYPHONE_TOKEN;
  const storeId = environment === "test" ? process.env.PAYPHONE_TEST_STORE_ID : process.env.PAYPHONE_STORE_ID;
  if (!token || !storeId) throw new CustomError(`Missing Payphone ${environment} credentials`, 500);
  return { token, storeId };
}

function normalizeExtras(input: unknown): EbookExtra[] {
  if (input === undefined) return [];
  if (!Array.isArray(input)) throw new CustomError("Invalid extras", 400);
  const extras = [...new Set(input)];
  if (extras.some((extra) => typeof extra !== "string" || !VALID_EXTRAS.has(extra as EbookExtra))) {
    throw new CustomError("Invalid extras", 400);
  }
  return extras as EbookExtra[];
}

function totalFor(extras: EbookExtra[]): number {
  return PRICES.ebook
    + (extras.includes("recipe_book") ? PRICES.recipeBook : 0)
    + (extras.includes("whatsapp_vip") ? PRICES.whatsappVip : 0);
}

function serialize(payment: IEbookPayment) {
  const returnUrl = payment.payphoneTransactionId
    ? `${payment.origin}/pay-response?id=${payment.payphoneTransactionId}&clientTransactionId=${encodeURIComponent(payment.clientTransactionId)}`
    : undefined;
  return {
    status: payment.status,
    product: payment.product,
    productName: "Quema Grasa, Construye Músculo",
    extras: payment.extras,
    amount: payment.amountCents / 100,
    amountCents: payment.amountCents,
    currency: payment.currency,
    clientTransactionId: payment.clientTransactionId,
    transactionId: payment.payphoneTransactionId || undefined,
    email: payment.buyer.email,
    emailSent: payment.confirmationEmailStatus === "sent",
    returnUrl,
  };
}

async function sendConfirmationEmailIfNeeded(payment: IEbookPayment): Promise<IEbookPayment> {
  const claimed = await EbookPayment.findOneAndUpdate(
    {
      _id: payment._id,
      status: "approved",
      $or: [
        { confirmationEmailStatus: { $exists: false } },
        { confirmationEmailStatus: { $in: ["pending", "failed"] } },
      ],
    },
    {
      $set: {
        confirmationEmailStatus: "sending",
        confirmationEmailError: null,
      },
    },
    { new: true },
  );

  if (!claimed) return payment;

  try {
    await sendEbookPurchaseConfirmationEmail({
      to: claimed.buyer.email,
      name: claimed.buyer.name,
      amount: claimed.amountCents / 100,
      extras: claimed.extras,
      clientTransactionId: claimed.clientTransactionId,
    });
    claimed.confirmationEmailStatus = "sent";
    claimed.confirmationEmailSentAt = new Date();
  } catch (error) {
    claimed.confirmationEmailStatus = "failed";
    claimed.confirmationEmailError = error instanceof Error ? error.message : "Unknown email error";
  }
  await claimed.save();
  return claimed;
}

export async function prepareEbookPaymentBox(input: {
  email: string;
  name: string;
  lastName: string;
  extras?: unknown;
  origin?: unknown;
}) {
  const origin = validateOrigin(input.origin);
  const environment = environmentForOrigin(origin);
  const credentials = credentialsFor(environment);
  const extras = normalizeExtras(input.extras);
  const amountCents = totalFor(extras);
  const clientTransactionId = `ebook-${environment}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

  await EbookPayment.create({
    buyer: {
      email: input.email.toLowerCase().trim(),
      name: input.name.trim(),
      lastName: input.lastName.trim(),
    },
    extras,
    priceSnapshot: PRICES,
    amountCents,
    environment,
    origin,
    clientTransactionId,
  });

  return {
    token: credentials.token,
    storeId: credentials.storeId,
    amount: amountCents,
    amountWithoutTax: amountCents,
    currency: "USD" as const,
    clientTransactionId,
    reference: "Ebook Quema Grasa Construye Musculo",
    product: "quema_grasa_construye_musculo" as const,
    extras,
  };
}

export async function confirmEbookPayment(id: unknown, clientTransactionId: unknown) {
  const transactionId = Number(id);
  if (!Number.isInteger(transactionId) || transactionId <= 0 || typeof clientTransactionId !== "string") {
    throw new CustomError("Invalid confirmation parameters", 400);
  }

  const payment = await EbookPayment.findOne({ clientTransactionId });
  if (!payment) throw new CustomError("Transaction not found", 404);
  if (payment.status === "approved") {
    return serialize(await sendConfirmationEmailIfNeeded(payment));
  }

  const { token } = credentialsFor(payment.environment);
  try {
    const response = await axios.post(
      PAYPHONE_CONFIRM_URL,
      { id: transactionId, clientTxId: clientTransactionId },
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } },
    );
    const data = response.data as {
      statusCode?: number;
      transactionId?: number;
      clientTransactionId?: string;
      amount?: number;
      currency?: string;
    };

    if (data.clientTransactionId !== payment.clientTransactionId) {
      throw new CustomError("Payphone transaction mismatch", 409);
    }
    if (data.amount !== payment.amountCents || data.currency !== payment.currency) {
      throw new CustomError("Payphone amount mismatch", 409);
    }

    const status = data.statusCode === 3 ? "approved" : data.statusCode === 2 ? "canceled" : "failed";
    const updated = await EbookPayment.findOneAndUpdate(
      { _id: payment._id, status: { $ne: "approved" } },
      {
        $set: {
          status,
          payphoneTransactionId: data.transactionId ?? transactionId,
          payphoneResponse: data,
          approvedAt: status === "approved" ? new Date() : null,
        },
      },
      { new: true },
    );

    const finalPayment = updated || await EbookPayment.findById(payment._id);
    if (!finalPayment) throw new CustomError("Transaction not found", 404);

    if (updated?.status === "approved") {
      void sendPurchaseEvent({
        email: updated.buyer.email,
        value: updated.amountCents / 100,
        currency: updated.currency,
        eventSourceUrl: updated.origin,
        eventId: `purchase_${updated.clientTransactionId}`,
        contentName: "Quema Grasa, Construye Musculo",
      });
    }

    const paymentWithEmail = finalPayment.status === "approved"
      ? await sendConfirmationEmailIfNeeded(finalPayment)
      : finalPayment;
    return serialize(paymentWithEmail);
  } catch (error) {
    if (error instanceof CustomError) throw error;
    const axiosError = error as AxiosError<{ message?: string }>;
    throw new CustomError(
      axiosError.response?.data?.message || "Error confirming Payphone payment",
      axiosError.response?.status || 500,
    );
  }
}
