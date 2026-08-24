import { ZodError } from "zod";
import { AppError } from "../utils/app-error.js";
import { env } from "../config/env.js";

export const notFound = (_req, res) =>
  res.status(404).json({ success: false, message: "Route not found", errors: [] });

export const errorHandler = (error, _req, res, _next) => {
  let status = 500;
  let message = "Something went wrong";
  let errors = [];
  let field;
  if (error instanceof ZodError) {
    status = 422;
    message = "Validation failed";
    errors = error.issues;
  } else if (error instanceof AppError) {
    status = error.statusCode;
    message = error.message;
    errors = error.errors;
    field = error.field;
  } else if (error?.code === "ER_DUP_ENTRY") {
    status = 409;
    const duplicateSource = `${error.sqlMessage || ""} ${error.message || ""}`.toLowerCase();
    if (duplicateSource.includes("patients") && duplicateSource.includes("phone")) {
      field = "phone";
      message = "A patient with this phone number already exists.";
    } else if (duplicateSource.includes("patients") && duplicateSource.includes("cnic")) {
      field = "cnic";
      message = "A patient with this CNIC already exists.";
    } else {
      message = "A record with the same unique value already exists.";
    }
  }
  if (status === 500 && env.NODE_ENV !== "production") console.error(error);
  res.status(status).json({
    success: false,
    message,
    errors,
    ...(field ? { field } : {}),
  });
};
