require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const pool = require("./db");
const passport = require("./config/passport");
const app = express();
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(
  cors({
    origin: (process.env.CORS_ORIGINS || "http://localhost:8081")
      .split(",")
      .map((s) => s.trim()),
  }),
);
app.use(express.json({ limit: "16kb" }));
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.use(
  session({
    store: new PgSession({ pool }),
    secret: process.env.SESSION_SECRET || "development-only-set-SESSION_SECRET",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 10 * 60 * 1000,
    },
  }),
);
app.use(passport.initialize());
app.get("/health", (req, res) =>
  res.json({
    status: "ok",
    service: "finalbatch-api",
    apiVersion: "marketplace-v2",
  }),
);
app.use("/auth", require("./routes/auth"));
app.get("/ready", async (req, res) => {
  const setup = await require("./setup").inspectMarketplace(pool);
  if (!setup.ready)
    return res.status(503).json({
      status: "setup_required",
      code: "MARKETPLACE_SETUP_REQUIRED",
      error: "Marketplace setup is incomplete. Please try again later.",
    });
  res.json({
    status: "ok",
    database: "connected",
    marketplace: "ready",
    photos: process.env.LISTING_PHOTOS_BUCKET ? "configured" : "setup_required",
  });
});
app.use(require("./routes/marketplace"));
app.use("/conversations", require("./routes/conversations"));
app.use("/favourites", require("./routes/favourites"));
app.use((req, res) => res.status(404).json({ error: "Route not found." }));
app.use((err, req, res, next) => {
  console.error("Request failed:", err.code || err.name);
  if (["42P01", "42703", "42P10"].includes(err.code))
    return res.status(503).json({
      code: "MARKETPLACE_SETUP_REQUIRED",
      error: "Marketplace setup is incomplete. Please try again later.",
    });
  const status =
    Number.isInteger(err.status) && err.status >= 400 && err.status < 600
      ? err.status
      : 500;
  res.status(status).json({
    error:
      status < 500 || err.public
        ? err.message
        : "Something went wrong. Please try again.",
  });
});
if (require.main === module || process.env.AWS_LAMBDA_FUNCTION_NAME) {
  if (
    !process.env.DATABASE_URL &&
    (!process.env.PGHOST ||
      !process.env.PGUSER ||
      !process.env.PGDATABASE ||
      !process.env.PGPASSWORD)
  ) {
    throw new Error(
      "Set PGPASSWORD and the PostgreSQL connection fields in backend/.env, or provide DATABASE_URL.",
    );
  }
  for (const name of ["JWT_SECRET", "SESSION_SECRET"]) {
    if (!process.env[name] || process.env[name].length < 32)
      throw new Error(`Set ${name}; secrets must have at least 32 characters.`);
  }
}
if (require.main === module) {
  app.listen(process.env.PORT || 3001, () =>
    console.log("FinalBatch API listening on port", process.env.PORT || 3001),
  );
}
module.exports = app;
