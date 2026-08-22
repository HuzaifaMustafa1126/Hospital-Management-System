import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { doctorService } from "../services/doctor.service";
import { patientService } from "../services/patient.service";
import { settingsService } from "../services/settings.service";

const empty = {
  firstName: "",
  lastName: "",
  fatherName: "",
  cnic: "",
  phone: "",
  address: "",
  doctorId: "",
  paymentMethod: "CASH",
  feeType: "FREE",
  registrationFee: "",
};

const cnic = (value) => {
  const d = value.replace(/\D/g, "").slice(0, 13);
  return [d.slice(0, 5), d.slice(5, 12), d.slice(12)]
    .filter(Boolean)
    .join("-");
};

export function PatientRegistrationPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState(empty);
  const [doctors, setDoctors] = useState([]);
  const [fee, setFee] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    doctorService
      .list()
      .then((r) => setDoctors(r.data.data.filter((d) => d.isActive)));

    settingsService.registrationFee().then((r) => setFee(r.data.data));
  }, []);

  const change = (e) =>
    setForm((f) => ({
      ...f,
      [e.target.name]:
        e.target.name === "cnic" ? cnic(e.target.value) : e.target.value,
    }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    const actualFee = Number(fee?.amount ?? 0);
    const discountedAmount = Number(form.registrationFee);

    if (
      !Object.entries(form)
        .filter(([k]) =>
          [
            "firstName",
            "lastName",
            "fatherName",
            "cnic",
            "phone",
            "address",
            "doctorId",
          ].includes(k),
        )
        .every(([, v]) => String(v).trim())
    ) {
      return setError("Complete all required patient fields.");
    }

    // Validate discounted amount
    if (
      form.feeType === "DISCOUNTED" &&
      (!Number.isFinite(discountedAmount) ||
        discountedAmount < 0 ||
        discountedAmount >= actualFee)
    ) {
      return setError(
        `Discounted registration fee must be less than PKR ${actualFee}.`,
      );
    }

    setSaving(true);

    try {
      let registrationFee = 0;

      if (form.feeType === "FREE") {
        registrationFee = 0;
      } else if (form.feeType === "ACTUAL") {
        registrationFee = actualFee;
      } else if (form.feeType === "DISCOUNTED") {
        registrationFee = discountedAmount;
      }

      const r = await patientService.create({
        first_name: form.firstName,
        last_name: form.lastName,
        father_name: form.fatherName,
        cnic: form.cnic,
        phone: form.phone,
        address: form.address,
        doctor_id: Number(form.doctorId),
        payment_method: form.paymentMethod,
        fee_type: form.feeType,
        registration_fee: registrationFee,
      });

      setResult(r.data.data);
    } catch (e) {
      setError(
        e.response?.data?.message || "Unable to register patient.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    const { patient, payment } = result;

    return (
      <div className="max-w-2xl hms-card p-6">
        <h2 className="text-2xl font-bold text-emerald-700">
          Patient Registered Successfully
        </h2>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            ["Patient Name", `${patient.firstName} ${patient.lastName}`],
            ["CNIC", patient.cnic],
            [
              "Doctor",
              `Dr. ${patient.doctor.firstName} ${patient.doctor.lastName}`,
            ],
            ["Registration Fee Type", payment.feeType],
            ["Registration Fee", `PKR ${payment.amount}`],
            ["Status", "REGISTERED"],
          ].map(([l, v]) => (
            <div key={l}>
              <dt className="text-sm text-slate-500">{l}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6 flex gap-3">
          <Link
            className="hms-button-primary"
            to={`/patients/${patient.id}`}
          >
            View patient
          </Link>

          <button
            className="hms-button-secondary"
            onClick={() => {
              setResult(null);
              setForm(empty);
            }}
          >
            Register another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <p className="text-sm font-semibold text-teal-700">
        Patient Management
      </p>

      <h2 className="mt-1 text-3xl font-bold">
        Register New Patient
      </h2>

      <form
        onSubmit={submit}
        className="mt-6 grid gap-5 rounded-xl bg-white p-6 shadow-sm sm:grid-cols-2"
      >
        {error && (
          <p className="rounded bg-rose-50 p-3 text-rose-700 sm:col-span-2">
            {error}
          </p>
        )}

        <h3 className="font-semibold sm:col-span-2">
          Patient information
        </h3>

        {[
          ["firstName", "First name"],
          ["lastName", "Last name"],
          ["fatherName", "Father name"],
          ["cnic", "CNIC"],
          ["phone", "Phone"],
        ].map(([name, label]) => (
          <label className="text-sm font-medium" key={name}>
            {label}

            <input
              required
              className="hms-input"
              name={name}
              value={form[name]}
              onChange={change}
            />
          </label>
        ))}

        <label className="text-sm font-medium sm:col-span-2">
          Address

          <textarea
            required
            className="hms-input"
            name="address"
            value={form.address}
            onChange={change}
          />
        </label>

        <label className="text-sm font-medium">
          Doctor

          <select
            required
            className="hms-input"
            name="doctorId"
            value={form.doctorId}
            onChange={change}
          >
            <option value="">Select doctor</option>

            {doctors.map((d) => (
              <option key={d.id} value={d.id}>
                Dr. {d.firstName} {d.lastName}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm font-medium">
          Payment method

          <select
            className="hms-input"
            name="paymentMethod"
            value={form.paymentMethod}
            onChange={change}
          >
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="OTHER">Other</option>
          </select>
        </label>

        {/* Registration Fee */}
        <fieldset className="border-t pt-5 sm:col-span-2">
          <legend className="font-semibold">
            Registration Fee
          </legend>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {/* FREE */}
            <label
              className={`cursor-pointer rounded-xl border p-4 transition ${
                form.feeType === "FREE"
                  ? "border-teal-600 bg-teal-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                className="sr-only"
                type="radio"
                name="feeType"
                value="FREE"
                checked={form.feeType === "FREE"}
                onChange={change}
              />

              <b>FREE</b>

              <span className="mt-1 block text-sm text-slate-500">
                No registration fee
              </span>

              <span className="mt-2 block text-lg font-semibold text-slate-800">
                PKR 0
              </span>
            </label>

            {/* ACTUAL FEE */}
            <label
              className={`cursor-pointer rounded-xl border p-4 transition ${
                form.feeType === "ACTUAL"
                  ? "border-teal-600 bg-teal-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                className="sr-only"
                type="radio"
                name="feeType"
                value="ACTUAL"
                checked={form.feeType === "ACTUAL"}
                onChange={change}
              />

              <b>ACTUAL FEE</b>

              <span className="mt-1 block text-sm text-slate-500">
                Standard registration fee
              </span>

              <span className="mt-2 block text-lg font-semibold text-slate-800">
                PKR {fee?.amount ?? "…"}
              </span>

              <span className="mt-1 block text-xs text-slate-400">
                Amount from Settings
              </span>
            </label>

            {/* DISCOUNT */}
            <label
              className={`cursor-pointer rounded-xl border p-4 transition ${
                form.feeType === "DISCOUNTED"
                  ? "border-teal-600 bg-teal-50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                className="sr-only"
                type="radio"
                name="feeType"
                value="DISCOUNTED"
                checked={form.feeType === "DISCOUNTED"}
                onChange={change}
              />

              <b>DISCOUNT</b>

              <span className="mt-1 block text-sm text-slate-500">
                Give a discounted registration fee
              </span>

              {form.feeType === "DISCOUNTED" && (
                <input
                  required
                  min="0"
                  max={Math.max(0, Number(fee?.amount ?? 0) - 0.01)}
                  step="0.01"
                  type="number"
                  name="registrationFee"
                  value={form.registrationFee}
                  onChange={change}
                  className="hms-input mt-3 bg-white"
                  placeholder="Enter discounted amount"
                />
              )}

              {form.feeType === "DISCOUNTED" && (
                <span className="mt-1 block text-xs text-slate-400">
                  Maximum: PKR {fee?.amount ?? "…"}
                </span>
              )}
            </label>
          </div>
        </fieldset>

        <div className="flex justify-end gap-3 sm:col-span-2">
          <button
            type="button"
            className="hms-button-secondary"
            onClick={() => navigate("/reception/patients")}
          >
            Cancel
          </button>

          <button
            disabled={saving || !fee}
            className="hms-button-primary"
          >
            {saving ? "Registering…" : "Confirm Registration"}
          </button>
        </div>
      </form>
    </div>
  );
}