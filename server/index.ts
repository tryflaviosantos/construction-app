import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { createServer } from "http";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";

const app = express();
const httpServer = createServer(app);

// ✅ middlewares essenciais
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ✅ sessão obrigatória para auth
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
    },
  }),
);

// ✅ Logger
export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// ✅ Register routes + WebSocket
(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = Number(process.env.PORT || 3000);

  // ✅ macOS + Node 22 COMPATÍVEL
  httpServer.listen(port, "127.0.0.1", () => {
    log(`✅ Server running at http://localhost:${port}`);
  });
})();
