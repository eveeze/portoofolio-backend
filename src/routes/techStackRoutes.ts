// src/routes/techStackRoutes.ts
import { Router } from "express";
import {
  getTechStacks,
  createTechStack,
  deleteTechStack,
} from "../controllers/techStackController";
import upload from "../middlewares/multer";

const router = Router();

router.get("/", getTechStacks);
router.post("/", upload.single("logo"), createTechStack); // Field name 'logo'
router.delete("/:id", deleteTechStack);

export default router;
