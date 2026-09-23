import { SignJWT, jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET?.trim();
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be configured with at least 32 characters.");
}
const encodedKey = new TextEncoder().encode(JWT_SECRET);

export interface TokenPayload {
  userId: string;
  username: string;
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ userId: payload.userId, username: payload.username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(encodedKey);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, encodedKey, {
      algorithms: ["HS256"],
    });
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}
