import { Request, Response, NextFunction } from "express";
import { sendViewContentEvent, sendAddToCartEvent } from "../services/metaPixel.service";

function clientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.socket?.remoteAddress || "";
}

function userAgent(req: Request): string {
  return req.headers["user-agent"] || "";
}

export async function viewContent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, eventSourceUrl } = req.body as { email?: string; eventSourceUrl?: string };

    await sendViewContentEvent({
      email,
      eventSourceUrl: eventSourceUrl || req.headers.referer,
      clientIp: clientIp(req),
      userAgent: userAgent(req),
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}

export async function addToCart(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, value, currency, eventSourceUrl } = req.body as {
      email?: string;
      value?: number;
      currency?: string;
      eventSourceUrl?: string;
    };

    await sendAddToCartEvent({
      email,
      value,
      currency,
      eventSourceUrl: eventSourceUrl || req.headers.referer,
      clientIp: clientIp(req),
      userAgent: userAgent(req),
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
