import axios from "axios";
import crypto from "crypto";

const META_API_VERSION = "v19.0";
const META_GRAPH_URL = "https://graph.facebook.com";

function getPixelId(): string {
  return process.env.META_PIXEL_ID || "";
}

function getAccessToken(): string {
  return process.env.META_PIXEL_TOKEN || "";
}

function hashSha256(value: string): string {
  return crypto.createHash("sha256").update(value.toLowerCase().trim()).digest("hex");
}

function eventTime(): number {
  return Math.floor(Date.now() / 1000);
}

async function sendEvents(events: object[]): Promise<void> {
  const pixelId = getPixelId();
  const accessToken = getAccessToken();

  if (!pixelId || !accessToken) {
    console.warn("[MetaPixel] META_PIXEL_ID or META_PIXEL_TOKEN not configured — skipping.");
    return;
  }

  const url = `${META_GRAPH_URL}/${META_API_VERSION}/${pixelId}/events`;

  try {
    await axios.post(
      url,
      { data: events },
      { params: { access_token: accessToken } },
    );
    console.log(`[MetaPixel] Sent ${events.length} event(s) OK`);
  } catch (err: any) {
    console.error("[MetaPixel] Error sending event:", err?.response?.data || err?.message);
  }
}

// ─── Purchase ────────────────────────────────────────────────────────────────

export async function sendPurchaseEvent(data: {
  email: string;
  value: number;
  currency?: string;
  eventSourceUrl?: string;
  clientIp?: string;
  userAgent?: string;
}): Promise<void> {
  const event = {
    event_name: "Purchase",
    event_time: eventTime(),
    action_source: "website",
    event_source_url: data.eventSourceUrl || process.env.FRONTEND_URL || "",
    user_data: {
      em: [hashSha256(data.email)],
      ...(data.clientIp ? { client_ip_address: data.clientIp } : {}),
      ...(data.userAgent ? { client_user_agent: data.userAgent } : {}),
    },
    custom_data: {
      currency: data.currency || "USD",
      value: data.value,
      content_name: "Academia Luisa Pita Bejarano",
      content_type: "product",
    },
  };

  await sendEvents([event]);
}

// ─── ViewContent ─────────────────────────────────────────────────────────────

export async function sendViewContentEvent(data: {
  eventSourceUrl?: string;
  clientIp?: string;
  userAgent?: string;
  email?: string;
}): Promise<void> {
  const event: Record<string, unknown> = {
    event_name: "ViewContent",
    event_time: eventTime(),
    action_source: "website",
    event_source_url: data.eventSourceUrl || process.env.FRONTEND_URL || "",
    user_data: {
      ...(data.email ? { em: [hashSha256(data.email)] } : {}),
      ...(data.clientIp ? { client_ip_address: data.clientIp } : {}),
      ...(data.userAgent ? { client_user_agent: data.userAgent } : {}),
    },
    custom_data: {
      content_name: "Academia Luisa Pita Bejarano",
      content_type: "product",
    },
  };

  await sendEvents([event]);
}

// ─── AddToCart ───────────────────────────────────────────────────────────────

export async function sendAddToCartEvent(data: {
  value?: number;
  currency?: string;
  eventSourceUrl?: string;
  clientIp?: string;
  userAgent?: string;
  email?: string;
}): Promise<void> {
  const event: Record<string, unknown> = {
    event_name: "AddToCart",
    event_time: eventTime(),
    action_source: "website",
    event_source_url: data.eventSourceUrl || process.env.FRONTEND_URL || "",
    user_data: {
      ...(data.email ? { em: [hashSha256(data.email)] } : {}),
      ...(data.clientIp ? { client_ip_address: data.clientIp } : {}),
      ...(data.userAgent ? { client_user_agent: data.userAgent } : {}),
    },
    custom_data: {
      content_name: "Academia Luisa Pita Bejarano",
      content_type: "product",
      ...(data.value !== undefined ? { value: data.value, currency: data.currency || "USD" } : {}),
    },
  };

  await sendEvents([event]);
}
