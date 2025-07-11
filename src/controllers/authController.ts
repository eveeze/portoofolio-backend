import { Request, Response } from "express";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  VerifiedRegistrationResponse,
  VerifiedAuthenticationResponse,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const { CONVEX_URL, RP_ID, RP_NAME, RP_ORIGIN, JWT_SECRET } = process.env;
if (!CONVEX_URL || !RP_ID || !RP_NAME || !RP_ORIGIN || !JWT_SECRET) {
  throw new Error("Missing WebAuthn or JWT environment variables!");
}

const convex = new ConvexHttpClient(CONVEX_URL);

// --- REGISTRATION ---

export const getRegistrationOptions = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  let user = await convex.query(api.users.findByUsername, { username });

  if (!user) {
    const userId = await convex.mutation(api.users.createUser, { username });
    const newUser = await convex.query(api.users.getById, { userId });
    if (!newUser) {
      return res.status(500).json({ error: "Failed to create and fetch user" });
    }
    user = newUser;
  }

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userName: user.username,
    excludeCredentials: user.authenticators.map((auth) => ({
      id: isoBase64URL.fromBuffer(Buffer.from(auth.credentialID)),
      type: "public-key",
      transports: auth.transports as AuthenticatorTransportFuture[] | undefined,
    })),
  });

  await convex.mutation(api.users.setCurrentChallenge, {
    userId: user._id,
    challenge: options.challenge,
  });

  return res.json(options);
};

export const verifyRegistration = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { username } = req.body;
  const user = await convex.query(api.users.findByUsername, { username });

  if (!user || !user.currentChallenge) {
    return res
      .status(400)
      .json({ error: "User not found or no challenge set." });
  }

  let verification: VerifiedRegistrationResponse;
  try {
    verification = await verifyRegistrationResponse({
      response: req.body as RegistrationResponseJSON,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: RP_ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: true,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }

  const { verified, registrationInfo } = verification;

  if (verified && registrationInfo) {
    // Fixed: Access credential properties correctly
    const { credential } = registrationInfo;

    await convex.mutation(api.users.addAuthenticator, {
      userId: user._id,
      authenticator: {
        // Fixed: Convert credential.id (ArrayBuffer) to Buffer for storage
        credentialID: Buffer.from(credential.id),
        credentialPublicKey: Buffer.from(credential.publicKey),
        counter: credential.counter,
        credentialDeviceType: registrationInfo.credentialDeviceType,
        credentialBackedUp: registrationInfo.credentialBackedUp,
        // Fixed: Get transports from the response, not registrationInfo
        transports:
          (req.body as RegistrationResponseJSON).response?.transports || [],
      },
    });
  }

  return res.json({ verified });
};

// --- AUTHENTICATION ---

export const getAuthenticationOptions = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  const user = await convex.query(api.users.findByUsername, { username });

  if (!user || user.authenticators.length === 0) {
    return res
      .status(404)
      .json({ error: "User not found or no authenticators registered" });
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    // Fixed: Convert ArrayBuffer to base64url string for allowCredentials
    allowCredentials: user.authenticators.map((auth) => ({
      id: isoBase64URL.fromBuffer(Buffer.from(auth.credentialID)),
      type: "public-key",
      transports: auth.transports as AuthenticatorTransportFuture[] | undefined,
    })),
    userVerification: "preferred",
  });

  await convex.mutation(api.users.setCurrentChallenge, {
    userId: user._id,
    challenge: options.challenge,
  });

  return res.json(options);
};

export const verifyAuthentication = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ error: "Username is required" });
  }

  const user = await convex.query(api.users.findByUsername, { username });

  if (!user || !user.currentChallenge) {
    return res.status(400).json({ error: "User not found or no challenge." });
  }

  const requestBody = req.body as AuthenticationResponseJSON;
  const requestCredentialIDBuffer = isoBase64URL.toBuffer(requestBody.id);

  const authenticator = user.authenticators.find((auth) =>
    Buffer.from(auth.credentialID).equals(requestCredentialIDBuffer)
  );

  if (!authenticator) {
    return res
      .status(404)
      .json({ error: "Authenticator not recognized for this user" });
  }

  let verification: VerifiedAuthenticationResponse;
  try {
    // Fixed: Pass authenticator data in the correct structure
    verification = await verifyAuthenticationResponse({
      response: requestBody,
      expectedChallenge: user.currentChallenge,
      expectedOrigin: RP_ORIGIN,
      expectedRPID: RP_ID,
      // Fixed: Pass credential object with the correct data types
      credential: {
        id: isoBase64URL.fromBuffer(Buffer.from(authenticator.credentialID)),
        publicKey: Buffer.from(authenticator.credentialPublicKey),
        counter: authenticator.counter,
        transports: authenticator.transports as
          | AuthenticatorTransportFuture[]
          | undefined,
      },
      requireUserVerification: true,
    });
  } catch (error: any) {
    console.error(error);
    return res.status(400).json({ error: error.message });
  }

  const { verified, authenticationInfo } = verification;

  if (verified) {
    await convex.mutation(api.users.updateAuthenticatorCounter, {
      userId: user._id,
      credentialID: Buffer.from(authenticationInfo.credentialID),
      newCounter: authenticationInfo.newCounter,
    });

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    return res.json({ verified, token });
  }

  return res
    .status(401)
    .json({ verified: false, message: "Authentication failed" });
};
export const logout = (req: Request, res: Response): void => {
  res.status(200).json({ message: "Logged out successfully" });
};
