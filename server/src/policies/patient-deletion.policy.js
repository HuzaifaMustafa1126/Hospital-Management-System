export const PATIENT_RECORD_CLASSIFICATIONS = ["REAL", "TEST"];

export const PATIENT_RETENTION_CATEGORIES = [
  "visits",
  "consultations",
  "services",
  "shortStayOrders",
  "bills",
  "registrationPayments",
  "payments",
  "registrationAudit",
];

export function evaluatePatientDeletion({ classification, counts }) {
  const populatedCategories = PATIENT_RETENTION_CATEGORIES.filter(
    (category) => Number(counts[category] || 0) > 0,
  );

  if (classification !== "TEST") {
    return {
      eligible: false,
      reasons: ["realPatientRecord", ...populatedCategories],
      explanation:
        "This patient is classified as a real patient record. Legal retention periods are not configured, so permanent deletion is blocked.",
    };
  }

  return {
    eligible: true,
    reasons: [],
    explanation:
      "This record is explicitly classified as TEST and is eligible for reviewed child-first deletion.",
  };
}
