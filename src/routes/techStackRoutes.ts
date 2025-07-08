// src/routes/techStackRoutes.ts
import { Router } from "express";
import {
  getTechStacks,
  createTechStack,
  deleteTechStack,
} from "../controllers/techStackController";
import upload from "../middlewares/multer";
// Impor middleware protect
import { protect } from "../middlewares/authMiddleware";

const router = Router();

// Rute ini tetap publik
router.get("/", getTechStacks);

// Amankan rute untuk membuat tech stack baru
router.post("/", protect, upload.single("logo"), createTechStack); // Tambahkan protect

// Amankan rute untuk menghapus tech stack
router.delete("/:id", protect, deleteTechStack); // Tambahkan protect

export default router;
