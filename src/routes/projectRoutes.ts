import { Router } from "express";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
} from "../controllers/projectController.js";
import upload from "../middlewares/multer.js";
import { protect } from "../middlewares/authMiddleware.js";
import { cache, clearCache } from "../middlewares/cacheMiddleware.js";
const router = Router();
const PROJECTS_CACHE_KEY = "projects:all";
router.get("/", cache(PROJECTS_CACHE_KEY), getProjects);

router.post(
  "/",
  protect,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "projectImages", maxCount: 10 },
  ]),
  clearCache(PROJECTS_CACHE_KEY),

  createProject
);
router.put(
  "/:id",
  protect, // Amankan rute ini
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "projectImages", maxCount: 10 },
  ]),

  clearCache(PROJECTS_CACHE_KEY),
  updateProject
);
router.delete("/:id", protect, clearCache(PROJECTS_CACHE_KEY), deleteProject);

export default router;
