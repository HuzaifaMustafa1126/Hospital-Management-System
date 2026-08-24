import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { database } from "./db/database.js";
import { errorHandler, notFound } from "./middleware/error.middleware.js";
import { authRouter } from "./routes/auth.routes.js";
import { auditRouter } from "./routes/audit.routes.js";
import { doctorRouter } from "./routes/doctor.routes.js";
import { departmentRouter } from "./routes/department.routes.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { patientRouter } from "./routes/patient.routes.js";
import { registrationPaymentRouter } from "./routes/registration-payment.routes.js";
import { settingsRouter } from "./routes/settings.routes.js";
import { serviceRouter } from "./routes/service.routes.js";
import { userRouter } from "./routes/user.routes.js";
import { laboratoryRouter } from "./routes/laboratory.routes.js";
import { surgeryRouter } from "./routes/surgery.routes.js";
import { visitRouter } from "./routes/visit.routes.js";
import { bloodBankRouter } from "./routes/blood-bank.routes.js";

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: "100kb" }));

app.get("/api/v1/health", async (_req, res, next) => {
  try {
    await database.query("SELECT 1");
    res.json({
      success: true,
      message: "Hospital Management API is running",
      data: { database: "connected" },
    });
  } catch (error) {
    next(error);
  }
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/audit-logs", auditRouter);
app.use("/api/v1/doctors", doctorRouter);
app.use("/api/v1/departments", departmentRouter);
app.use("/api/v1/services", serviceRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/patients", patientRouter);
app.use("/api/v1/visits", visitRouter);
app.use("/api/v1/settings", settingsRouter);
app.use("/api/v1/registration-payments", registrationPaymentRouter);
app.use("/api/v1/laboratory", laboratoryRouter);
app.use("/api/v1/surgery", surgeryRouter);
app.use("/api/v1/blood-bank", bloodBankRouter);
app.use(notFound);
app.use(errorHandler);
