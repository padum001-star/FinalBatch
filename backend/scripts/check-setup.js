const path = require("node:path");
require("dotenv").config({
  path: path.join(__dirname, "../.env"),
  quiet: true,
});
const pool = require("../db");
const { inspectMarketplace } = require("../setup");
(async () => {
  try {
    const schema = await inspectMarketplace(pool);
    console.log(
      schema.ready
        ? "Database: marketplace schema is ready."
        : "Database: marketplace migration is missing. Run npm run migrate from backend.",
    );
    if (!schema.ready) {
      console.log("Missing:", schema.missing.join(", "));
      process.exitCode = 1;
    }
    console.log(
      process.env.LISTING_PHOTOS_BUCKET
        ? "Photos: S3 bucket name is configured. Run npm run storage:check to verify credentials and upload/download."
        : "Photos: S3 is not configured. Add LISTING_PHOTOS_BUCKET, AWS_REGION and AWS_PROFILE to backend/.env for local development.",
    );
    if (!process.env.LISTING_PHOTOS_BUCKET) process.exitCode = 1;
  } catch (e) {
    console.error("Setup check failed:", e.code || e.name);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
