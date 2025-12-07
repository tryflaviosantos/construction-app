import expressSession from "express-session";
import passport from "passport";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import memoize from "memoizee";
import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import { storage } from "./storage";

/* ---------------------------------------------------------
   SESSION STORE (Postgres)
--------------------------------------------------------- */

export function getSession() {
  const pgStore = connectPg(expressSession);

  return expressSession({
    store: new pgStore({
      conString: process.env.DATABASE_URL,
      tableName: "sessions",
      createTableIfMissing: false,
      ttl: 7 * 24 * 3600,
    }),
    secret: process.env.SESSION_SECRET || "dev-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // LOCAL DEV ONLY
      maxAge: 7 * 24 * 3600 * 1000,
    },
  });
}

/* ---------------------------------------------------------
   OPTIONAL REPLIT OAUTH CONFIG
--------------------------------------------------------- */

const hasReplitConfig =
  !!process.env.REPL_ID &&
  !!process.env.REPL_SECRET &&
  !!process.env.ISSUER_URL;

const getOidcConfig = memoize(async () => {
  if (!hasReplitConfig) return null;

  return client.discovery(
    new URL(process.env.ISSUER_URL!),
    process.env.REPL_ID!
  );
});

/* ---------------------------------------------------------
   MAIN AUTH SETUP
--------------------------------------------------------- */

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);

  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: any, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: any, done) => {
    done(null, user);
  });

  /* -------------------------------------------
     LOCAL AUTH
  -------------------------------------------- */

  app.post("/api/auth/local-register", async (req, res) => {
    const { email, password } = req.body;

    try {
      const user = await storage.createLocalUser({ email, password });

      req.login(
        { id: user.id, localAuth: true, claims: { sub: user.id } },
        (err) => {
          if (err)
            return res.status(500).json({ message: "Login error" });
          res.json({ success: true, user });
        }
      );
    } catch (e: any) {
      res.status(400).json({ message: e.message });
    }
  });

  app.post("/api/auth/local-login", async (req, res) => {
    const { email, password } = req.body;

    try {
      const user = await storage.verifyLocalUser({ email, password });

      req.login(
        { id: user.id, localAuth: true, claims: { sub: user.id } },
        (err) => {
          if (err)
            return res.status(500).json({ message: "Login error" });
          res.json({ success: true, user });
        }
      );
    } catch {
      res.status(401).json({ message: "Invalid credentials" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => res.json({ success: true }));
  });

  /* -------------------------------------------
     SKIP REPLIT OAUTH IF NOT CONFIGURED
  -------------------------------------------- */

  if (!hasReplitConfig) {
    console.log(
      "[AUTH] Replit OAuth disabled – missing env vars."
    );
    return;
  }

  /* -------------------------------------------
     REPLIT OAUTH SETUP
  -------------------------------------------- */

  const config = await getOidcConfig();
  if (!config) return;

  const verify: VerifyFunction = async (tokens, done) => {
    const user: any = {
      claims: tokens.claims(),
    };

    await storage.upsertUserFromOidc(user.claims);

    done(null, user);
  };

  const strategy = new Strategy(
    {
      name: "replitauth",
      config,
      scope: ["openid", "email", "profile"],
      callbackURL: "/api/auth/replit/callback",
    },
    verify
  );

  passport.use("replitauth", strategy);

  app.get(
    "/api/auth/replit",
    passport.authenticate("replitauth", { prompt: "login" })
  );

  app.get(
    "/api/auth/replit/callback",
    passport.authenticate("replitauth", {
      failureRedirect: "/",
      successRedirect: "/",
    })
  );
}

/* ---------------------------------------------------------
   AUTH MIDDLEWARE
--------------------------------------------------------- */

export const isAuthenticated: RequestHandler = (req, res, next) => {
  const user: any = req.user;

  if (user?.localAuth && user?.claims?.sub) return next();
  if (req.isAuthenticated() && user?.claims?.sub) return next();

  return res.status(401).json({ message: "Unauthorized" });
};
