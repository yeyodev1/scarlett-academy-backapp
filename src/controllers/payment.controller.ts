import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../types/AuthRequest";
import { CustomError } from "../errors/customError.error";
import { successResponse } from "../helpers/response.helper";
import * as paymentService from "../services/payment.service";
import * as ebookPaymentService from "../services/ebookPayment.service";

export async function prepare(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { email, name, lastName, origin } = req.body;
    if (!email || !name || !lastName) {
      throw new CustomError("Incomplete data", 400);
    }

    const result = await paymentService.prepareAnnualPayment(
      { email, name, lastName },
      origin,
    );
    successResponse(res, result, "Payment prepared successfully");
  } catch (error) {
    next(error);
  }
}

export async function prepareMonthly(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { email, name, lastName, origin } = req.body;
    if (!email || !name || !lastName) {
      throw new CustomError("Incomplete data", 400);
    }

    const result = await paymentService.prepareMonthlyPayment(
      { email, name, lastName },
      origin,
    );
    successResponse(res, result, "Payment prepared successfully");
  } catch (error) {
    next(error);
  }
}

export async function prepareBox(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { email, name, lastName, plan, origin } = req.body;
    if (!email || !name || !lastName || !plan) {
      throw new CustomError("Incomplete data", 400);
    }
    if (plan !== "annual" && plan !== "monthly") {
      throw new CustomError("Invalid plan", 400);
    }

    const result =
      plan === "annual"
        ? await paymentService.prepareAnnualPaymentBox({ email, name, lastName }, origin)
        : await paymentService.prepareMonthlyPaymentBox({ email, name, lastName }, origin);
    successResponse(res, result, "Payment box prepared successfully");
  } catch (error) {
    next(error);
  }
}

export async function confirm(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, clientTransactionId } = req.query;
    if (!id || !clientTransactionId) {
      throw new CustomError("Incomplete parameters", 400);
    }
    const result = await paymentService.confirmPayment(
      id as string,
      clientTransactionId as string,
    );
    const message =
      result.status === "approved"
        ? "Payment approved successfully"
        : "Payment not completed";
    successResponse(res, result, message);
  } catch (error) {
    next(error);
  }
}

export async function prepareEbookBox(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, name, lastName, extras, origin } = req.body;
    if (!email || !name || !lastName) throw new CustomError("Incomplete data", 400);
    const result = await ebookPaymentService.prepareEbookPaymentBox({
      email,
      name,
      lastName,
      extras,
      origin,
    });
    successResponse(res, result, "Ebook payment box prepared successfully");
  } catch (error) {
    next(error);
  }
}

export async function confirmEbook(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, clientTransactionId } = req.body;
    const result = await ebookPaymentService.confirmEbookPayment(id, clientTransactionId);
    successResponse(
      res,
      result,
      result.status === "approved" ? "Ebook payment approved successfully" : "Payment not completed",
    );
  } catch (error) {
    next(error);
  }
}

export async function returnEbook(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, clientTransactionId } = req.query;
    const result = await ebookPaymentService.confirmEbookPayment(id, clientTransactionId);
    if (!result.returnUrl) throw new CustomError("Missing payment return URL", 500);
    res.redirect(303, result.returnUrl);
  } catch (error) {
    next(error);
  }
}

export async function resendWelcomeEmail(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { clientTransactionId } = req.body;
    if (!clientTransactionId) {
      throw new CustomError("clientTransactionId required", 400);
    }
    const result = await paymentService.resendWelcomeEmail(clientTransactionId);
    successResponse(res, result, "Welcome email sent successfully");
  } catch (error) {
    next(error);
  }
}

export async function resendWelcomePublic(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { clientTransactionId } = req.body;
    if (!clientTransactionId) {
      throw new CustomError("clientTransactionId required", 400);
    }
    const result = await paymentService.resendWelcomeEmail(clientTransactionId);
    successResponse(res, result, "Welcome email sent successfully");
  } catch (error) {
    next(error);
  }
}

export async function cancelPending(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw new CustomError("Unauthorized", 401);
    const result = await paymentService.cancelPendingPayments(req.user.userId);
    successResponse(res, result, "Pending payments canceled successfully");
  } catch (error) {
    next(error);
  }
}

export async function cancelSubscription(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) throw new CustomError("Unauthorized", 401);
    const result = await paymentService.cancelSubscription(req.user.userId);
    successResponse(res, result, "Subscription canceled successfully");
  } catch (error) {
    next(error);
  }
}
