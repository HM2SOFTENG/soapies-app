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
    // Parse session cookie and verify JWT
    const cookies = opts.req.headers.cookie;
    if (cookies) {
      const { parse } = await import("cookie");
      const parsed = parse(cookies);
      const sessionCookie = parsed["app_session_id"];
      if (sessionCookie) {
        console.log("[Auth Debug] cookie value length:", sessionCookie.length, "parts:", sessionCookie.split('.').length, "prefix:", sessionCookie.substring(0, 20));
      }
      const session = await sdk.verifySession(sessionCookie);
      if (session) {
        user = await getUserByOpenId(session.openId);
      }
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
