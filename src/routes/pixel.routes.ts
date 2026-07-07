import { Router } from "express";
import * as pixelController from "../controllers/pixel.controller";

const router = Router();

// POST /api/pixel/view-content  — ViewContent (primera página)
router.post("/view-content", pixelController.viewContent);

// POST /api/pixel/add-to-cart   — AddToCart (cuando abren el popup de pago)
router.post("/add-to-cart", pixelController.addToCart);

export default router;
