import { Router } from "express";
import { getStats } from "../controllers/dashboardController";
import { protect } from "../middlewares/authMiddleware";

const router = Router();

router.get("/stats", protect , getStats)

export default router;
