import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

let redisClient: Redis;

try {
  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL is not defined");
  }

  redisClient = new Redis(process.env.REDIS_URL);
  redisClient.on("connect", () => {
    console.log(" berhasil konek ke server redis.");
  });

  redisClient.on("error", (error: Error) => {
    console.log("Redis Client Error : ", error);
  });
} catch (error) {
  console.error("Fialed to initialize redis cleint ", error);
  process.exit(1);
}

export default redisClient;
