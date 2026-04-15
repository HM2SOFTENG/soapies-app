import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getUserByOpenId } from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // 1. Try x-session-token header first (sent by native mobile app)
    //    This avoids iOS native cookie jar doubling the Cookie header
    const customToken = opts.req.headers["x-session-token"] as string | undefined;

    // 2. Fall back to Cookie header (web app / curl)
    let sessionToken: string | undefined = customToken;
    if (!sessionToken) {
      const cookies = opts.req.headers.cookie;
      if (cookies) {
        const { parse } = await import("cookie");
        const parsed = parse(cookies);
        sessionToken = parsed["app_session_id"];
      }
    }

    if (sessionToken) {
      const session = await sdk.verifySession(sessionToken);
      if (session) {
        user = await getUserByOpenId(session.openId);
      }
    }
  } catch (error) {
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
