// convex/users.ts
import { query, mutation } from "./_generated/server.js";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel.js";
import { QueryCtx, MutationCtx } from "./_generated/server.js";
import { Id } from "./_generated/dataModel.js";

// Definisikan tipe untuk authenticator agar konsisten
const AuthenticatorSchema = v.object({
  credentialID: v.bytes(),
  credentialPublicKey: v.bytes(),
  counter: v.number(),
  credentialDeviceType: v.string(),
  credentialBackedUp: v.boolean(),
  transports: v.optional(v.array(v.string())),
});

type AuthenticatorType = typeof AuthenticatorSchema.type;

// Mencari user berdasarkan username
export const findByUsername = query({
  args: { username: v.string() },
  handler: async (
    ctx: QueryCtx,
    args: { username: string }
  ): Promise<Doc<"users"> | null> => {
    return await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();
  },
});

// Mengambil user berdasarkan ID
export const getById = query({
  args: { userId: v.id("users") },
  handler: async (ctx: QueryCtx, args: { userId: Id<"users"> }) => {
    return await ctx.db.get(args.userId);
  },
});

// Membuat user baru (hanya untuk setup awal, tanpa password)
export const createUser = mutation({
  args: { username: v.string() },
  handler: async (ctx: MutationCtx, { username }: { username: string }) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();

    if (existingUser) {
      throw new Error("Username already exists");
    }
    return await ctx.db.insert("users", { username, authenticators: [] });
  },
});

// Menyimpan challenge sementara untuk user
export const setCurrentChallenge = mutation({
  args: { userId: v.id("users"), challenge: v.string() },
  handler: async (
    ctx: MutationCtx,
    { userId, challenge }: { userId: Id<"users">; challenge: string }
  ) => {
    await ctx.db.patch(userId, { currentChallenge: challenge });
  },
});

// Menambahkan authenticator baru setelah registrasi berhasil
export const addAuthenticator = mutation({
  args: { userId: v.id("users"), authenticator: AuthenticatorSchema },
  handler: async (
    ctx: MutationCtx,
    {
      userId,
      authenticator,
    }: { userId: Id<"users">; authenticator: AuthenticatorType }
  ) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");
    const authenticators = [...user.authenticators, authenticator];
    await ctx.db.patch(userId, { authenticators });
  },
});

// Memperbarui counter authenticator setelah login berhasil
export const updateAuthenticatorCounter = mutation({
  args: {
    userId: v.id("users"),
    credentialID: v.bytes(),
    newCounter: v.number(),
  },
  handler: async (
    ctx: MutationCtx,
    {
      userId,
      credentialID,
      newCounter,
    }: { userId: Id<"users">; credentialID: ArrayBuffer; newCounter: number }
  ) => {
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const newAuthenticators = user.authenticators.map((auth) => {
      // Compare the raw bytes directly
      if (Buffer.from(auth.credentialID).equals(Buffer.from(credentialID))) {
        return { ...auth, counter: newCounter };
      }
      return auth;
    });

    await ctx.db.patch(userId, { authenticators: newAuthenticators });
  },
});
