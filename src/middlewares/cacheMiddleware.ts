// src/middlewares/cacheMiddleware.ts
import { Request, Response, NextFunction, RequestHandler } from "express";
import redisClient from "../config/redis";

// Tambahkan : RequestHandler sebagai tipe return
export const cache = (cacheKey: string, ttl: number = 3600): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cachedData = await redisClient.get(cacheKey);

      if (cachedData) {
        console.log(`✅ Cache HIT for key: ${cacheKey}`);
        return res.status(200).json(JSON.parse(cachedData));
      }

      console.log(`⚪️ Cache MISS for key: ${cacheKey}`);

      const originalJson = res.json.bind(res);
      res.json = (body) => {
        redisClient.setex(cacheKey, ttl, JSON.stringify(body));
        console.log(
          `📝 Data for key: ${cacheKey} has been cached for ${ttl} seconds.`,
        );
        return originalJson(body);
      };

      next();
    } catch (error) {
      console.error("Cache Middleware Error:", error);
      next();
    }
  };
};

// Tambahkan : RequestHandler juga di sini
export const clearCache = (cacheKey: string): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await redisClient.del(cacheKey);
      console.log(`🗑️ Cache cleared for key: ${cacheKey}`);
    } catch (error) {
      console.error(`Failed to clear cache for key ${cacheKey}:`, error);
    }
    // Pastikan untuk selalu memanggil next() agar request berlanjut
    next();
  };
};
