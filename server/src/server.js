import { app } from "./app.js";
import { env } from "./config/env.js";
import { database } from "./db/database.js";
import { initializeDatabase } from "./db/initialize.js";

async function start() {
  try {
    await initializeDatabase({ log: true });

    // Test MySQL connection before starting the API
    await database.query("SELECT 1");

    console.log("MySQL connected successfully.");

    const server = app.listen(env.PORT, () => {
      console.log(`API listening on http://localhost:${env.PORT}`);
    });

    // Graceful shutdown
    const close = async (signal) => {
      console.log(`${signal} received. Shutting down server...`);

      server.close(async () => {
        try {
          await database.end();
          console.log("MySQL connection pool closed.");
          process.exit(0);
        } catch (error) {
          console.error("Error closing MySQL connection:", error);
          process.exit(1);
        }
      });
    };

    process.on("SIGINT", () => close("SIGINT"));
    process.on("SIGTERM", () => close("SIGTERM"));
  } catch (error) {
    console.error("Unable to start server.");

    if (error?.code === "ECONNREFUSED") {
      console.error(
        `MySQL is not reachable at ${env.DB_HOST}:${env.DB_PORT}.`
      );
      console.error(
        "Make sure MySQL Server is installed and running."
      );
    } else if (error?.code === "ER_ACCESS_DENIED_ERROR") {
      console.error("MySQL username or password is incorrect.");
    } else if (error?.code === "ER_BAD_DB_ERROR") {
      console.error(
        "Hospital database does not exist and initialization could not create it."
      );
    } else {
      console.error(error);
    }

    process.exit(1);
  }
}

start();
