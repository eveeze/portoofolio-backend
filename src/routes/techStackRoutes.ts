// src/routes/techStackRoutes.ts
import { Router } from "express";
import {
  getTechStacks,
  createTechStack,
  deleteTechStack,
} from "../controllers/techStackController";
import upload from "../middlewares/multer";
import { cache, clearCache } from "../middlewares/cacheMiddleware";
// Impor middleware protect
import { protect } from "../middlewares/authMiddleware";

const router = Router();
const TECH_STACKS_CACHE_KEY = "techstacks:all";

// Rute ini tetap publik
router.get("/", cache(TECH_STACKS_CACHE_KEY), getTechStacks);

// Amankan rute untuk membuat tech stack baru
router.post(
  "/",
  protect,
  upload.single("logo"),
  clearCache(TECH_STACKS_CACHE_KEY),
  createTechStack,
);

// Amankan rute untuk menghapus tech stack
router.delete(
  "/:id",
  protect,
  clearCache(TECH_STACKS_CACHE_KEY),
  deleteTechStack,
);

export default router;
