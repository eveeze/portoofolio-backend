import { Router } from "express";
import {
  getTechStacks,
  createTechStack,
  deleteTechStack,
} from "../controllers/techStackController.js";
import upload from "../middlewares/multer.js";
import { cache, clearCache } from "../middlewares/cacheMiddleware.js";
import { protect } from "../middlewares/authMiddleware.js";

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
  createTechStack
);

// Amankan rute untuk menghapus tech stack
router.delete(
  "/:id",
  protect,
  clearCache(TECH_STACKS_CACHE_KEY),
  deleteTechStack
);

export default router;
