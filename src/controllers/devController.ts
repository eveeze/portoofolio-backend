// src/controllers/devController.ts
import { Request, Response } from "express";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const { CONVEX_URL, JWT_SECRET, NODE_ENV } = process.env;

if (!CONVEX_URL || !JWT_SECRET) {
  throw new Error("Missing Convex or JWT environment variables!");
}

const convex = new ConvexHttpClient(CONVEX_URL);

/**
 * Handles developer login.
 * This endpoint should ONLY be available in development mode.
 * @param req - Express Request object. Expects { username: string } in the body.
 * @param res - Express Response object.
 */
export const devLogin = async (req: Request, res: Response): Promise<void> => {
  // Pastikan endpoint ini tidak terekspos di production
  if (NODE_ENV === "production") {
    // HAPUS 'return'
    res.status(404).json({ message: "Not Found" });
    return;
  }

  const { username } = req.body;
  if (!username) {
    // HAPUS 'return'
    res.status(400).json({ message: "Username is required" });
    return;
  }

  try {
    const user = await convex.query(api.users.findByUsername, { username });

    if (!user) {
      // HAPUS 'return'
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Generate token yang sama seperti di alur login normal
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET as string,
      { expiresIn: "8h" } // Token berlaku 8 jam untuk development
    );

    // HAPUS 'return'
    res.status(200).json({
      message: "Development login successful",
      token,
      user: {
        id: user._id,
        username: user.username,
      },
    });
  } catch (error: any) {
    console.error("Error during dev login:", error);
    // HAPUS 'return'
    res
      .status(500)
      .json({ message: "Internal Server Error", error: error.message });
  }
};
