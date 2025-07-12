import { Router } from "express";
import { devLogin } from "../controllers/devController.js";

const router = Router();

// Endpoint khusus untuk login di environment development
router.post("/login", devLogin);

export default router;
