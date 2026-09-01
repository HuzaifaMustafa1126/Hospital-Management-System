import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { doctorService } from "../services/doctor.service";
import { patientService } from "../services/patient.service";
import { settingsService } from "../services/settings.service";
import { useNotifications } from "../context/NotificationContext";

const empty = {
  firstName: "",
  lastName: "",
  fatherName: "",
  gender: "",
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
  return [d.slice(0, 5), d.slice(5, 12), d.slice(12)].filter(Boolean).join("-");
};

export function PatientRegistrationPage() {
  const navigate = useNavigate();
  const { notify } = useNotifications();

  const [form, setForm] = useState(empty);
  const [doctors, setDoctors] = useState([]);
  const [fee, setFee] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [duplicates, setDuplicates] = useState({ cnic: null, phone: null });

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

  useEffect(() => {
    const value = form.cnic.replace(/\D/g, "");
    if (value.length !== 13)
      return setDuplicates((d) => ({ ...d, cnic: null }));
    const timer = setTimeout(
      () =>
        patientService
          .checkCnic(form.cnic)
          .then((r) => setDuplicates((d) => ({ ...d, cnic: r.data.data })))
          .catch(() => setDuplicates((d) => ({ ...d, cnic: null }))),
      500,
    );
    return () => clearTimeout(timer);
  }, [form.cnic]);
  useEffect(() => {
    const value = form.phone.replace(/\D/g, "");
    if (!/^03\d{9}$/.test(value) && !/^92\d{10}$/.test(value))
      return setDuplicates((d) => ({ ...d, phone: null }));
    const timer = setTimeout(
      () =>
        patientService
          .checkPhone(form.phone)
          .then((r) => setDuplicates((d) => ({ ...d, phone: r.data.data })))
          .catch(() => setDuplicates((d) => ({ ...d, phone: null }))),
      500,
    );
    return () => clearTimeout(timer);
  }, [form.phone]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (duplicates.cnic?.exists || duplicates.phone?.exists)
      return setError("An entered CNIC or phone number is already registered.");

    const actualFee = Number(fee?.amount ?? 0);
    const discountedAmount = Number(form.registrationFee);

    if (
      !Object.entries(form)
        .filter(([k]) =>
          [
            "firstName",
            "lastName",
            "fatherName",
            "gender",
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
        gender: form.gender,
        cnic: form.cnic,
        phone: form.phone,
        address: form.address,
        doctor_id: Number(form.doctorId),
        payment_method: form.paymentMethod,
        fee_type: form.feeType,
        registration_fee: registrationFee,
      });

      setResult(r.data.data);
      notify({
        type: "success",
        title: "Patient Registered",
        message: `Patient ${r.data.data.patient.patientNumber} was registered successfully.`,
      });
    } catch (e) {
      setError(e.response?.data?.message || "Unable to register patient.");
    } finally {
      setSaving(false);
    }
  };
  const createVisit = (patient) => navigate(`/patients/${patient.id}/visits/new`);

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
            ["Gender", patient.gender?.toLowerCase() || "Not specified"],
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
          <Link className="hms-button-primary" to={`/patients/${patient.id}`}>
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
      <p className="text-sm font-semibold text-teal-700">Patient Management</p>

      <h2 className="mt-1 text-3xl font-bold">Register New Patient</h2>

      <form
        onSubmit={submit}
        className="mt-6 grid gap-5 rounded-xl bg-white p-6 shadow-sm sm:grid-cols-2"
      >
        {error && (
          <p className="rounded bg-rose-50 p-3 text-rose-700 sm:col-span-2">
            {error}
          </p>
        )}

        <h3 className="font-semibold sm:col-span-2">Patient information</h3>

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
            {duplicates[name]?.exists && (
              <span className="mt-2 block rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                <span className="flex items-center gap-1 font-bold">
                  <AlertTriangle size={15} />{" "}
                  {name === "cnic"
                    ? "Patient Already Registered"
                    : "Phone Number Already Registered"}
                </span>
                <span className="mt-1 block">
                  This {name === "cnic" ? "CNIC" : "phone number"} is already
                  associated with a patient.
                </span>
                <span className="mt-1 block font-semibold">
                  Patient No: {duplicates[name].patient.patientNumber}
                </span>
                <span className="mt-1 block">
                  {duplicates[name].patient.firstName} {duplicates[name].patient.lastName} · {duplicates[name].patient.totalVisits} visit(s)
                  {duplicates[name].patient.lastVisit ? ` · Last visit: ${new Date(duplicates[name].patient.lastVisit).toLocaleDateString()}` : ""}
                </span>
                <Link
                  className="mt-2 inline-block font-bold underline"
                  to={`/patients/${duplicates[name].patient.id}`}
                >
                  View Patient
                </Link>
                <button
                  type="button"
                  className="ml-3 font-bold underline"
                  onClick={() => createVisit(duplicates[name].patient)}
                >
                  Create New Visit
                </button>
              </span>
            )}
            {duplicates[name] && !duplicates[name].exists && (
              <span className="mt-1 flex items-center gap-1 text-xs text-emerald-700">
                <CheckCircle2 size={14} /> Available
              </span>
            )}
          </label>
        ))}

        <label className="text-sm font-medium">
          Gender
          <select
            required
            className="hms-input"
            name="gender"
            value={form.gender}
            onChange={change}
          >
            <option value="">Select gender</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </label>

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
          <legend className="font-semibold">Registration Fee</legend>

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

          <button disabled={saving || !fee} className="hms-button-primary">
            {saving ? "Registering…" : "Confirm Registration"}
          </button>
        </div>
      </form>
    </div>
  );
}
