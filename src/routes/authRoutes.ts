import { Router, Request, Response } from "express";
import {
  getRegistrationOptions,
  verifyRegistration,
  getAuthenticationOptions,
  verifyAuthentication,
  logout,
} from "../controllers/authController";
import { protect } from "../middlewares/authMiddleware";

const router = Router();

// Alur Registrasi Passkey
router.post("/register/options", async (req: Request, res: Response) => {
  try {
    await getRegistrationOptions(req, res);
  } catch (error) {
    console.error("Error in registration options:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/register/verify", async (req: Request, res: Response) => {
  try {
    await verifyRegistration(req, res);
  } catch (error) {
    console.error("Error in registration verification:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Alur Login Passkey
router.post("/login/options", async (req: Request, res: Response) => {
  try {
    await getAuthenticationOptions(req, res);
  } catch (error) {
    console.error("Error in authentication options:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login/verify", async (req: Request, res: Response) => {
  try {
    await verifyAuthentication(req, res);
  } catch (error) {
    console.error("Error in authentication verification:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Logout (memerlukan token yang valid untuk logout)
router.post("/logout", protect, (req: Request, res: Response) => {
  logout(req, res);
});

export default router;
