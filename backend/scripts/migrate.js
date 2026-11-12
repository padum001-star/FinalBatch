require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const pool = require("../db");
(async () => {
  try {
    for (const name of fs
      .readdirSync(path.join(__dirname, "../../database/migrations"))
      .filter((name) => name.endsWith(".sql"))
      .sort()) {
      await pool.query(
        fs.readFileSync(
          path.join(__dirname, "../../database/migrations", name),
          "utf8",
        ),
      );
      console.log("Applied migration:", name);
    }
    console.log("Database migrations applied.");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
