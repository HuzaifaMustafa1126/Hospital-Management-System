import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  FilePenLine,
  MapPin,
  Phone,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { doctorService } from "../services/doctor.service";
import { patientService } from "../services/patient.service";

const Info = ({ label, value }) => (
  <div>
    <dt className="hms-label">{label}</dt>
    <dd className="mt-1.5 text-sm font-medium text-slate-800">
      {value || "—"}
    </dd>
  </div>
);

export function PatientDetailPage({ edit = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [form, setForm] = useState(null);
  const [visits, setVisits] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => {
    patientService
      .get(id)
      .then((response) => {
        setPatient(response.data.data);
        setForm({
          ...response.data.data,
          doctorId: String(response.data.data.doctor.id),
        });
      })
      .catch((requestError) =>
        setError(
          requestError.response?.data?.message || "Unable to load patient",
        ),
      );
    if (edit)
      doctorService
        .list()
        .then((response) =>
          setDoctors(response.data.data.filter((doctor) => doctor.isActive)),
        );
    patientService
      .visits(id)
      .then((response) => setVisits(response.data.data))
      .catch(() => {});
  }, [id, edit]);
  if (error)
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-700">
        {error}
      </div>
    );
  if (!patient || !form)
    return (
      <div className="hms-card p-8 text-sm text-slate-500">
        Loading patient record…
      </div>
    );
  const save = async (event) => {
    event.preventDefault();
    try {
      await patientService.update(id, {
        first_name: form.firstName,
        last_name: form.lastName,
        father_name: form.fatherName,
        cnic: form.cnic,
        phone: form.phone,
        address: form.address,
        doctor_id: Number(form.doctorId),
      });
      navigate(`/patients/${id}`);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to update patient",
      );
    }
  };
  if (edit)
    return (
      <div className="max-w-4xl">
        <Link
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
          to={`/patients/${id}`}
        >
          <ArrowLeft size={16} /> Back to patient profile
        </Link>
        <section className="hms-card overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-5">
            <p className="text-sm font-semibold text-teal-700">
              Patient management
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              Edit registration information
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Changes to this locked record are recorded for audit purposes.
            </p>
          </div>
          <form onSubmit={save} className="grid gap-5 p-6 sm:grid-cols-2">
            {error && (
              <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 sm:col-span-2">
                {error}
              </p>
            )}
            {[
              ["firstName", "First name"],
              ["lastName", "Last name"],
              ["fatherName", "Father name"],
              ["cnic", "CNIC number"],
              ["phone", "Phone number"],
            ].map(([key, label]) => (
              <label key={key} className="text-sm font-semibold text-slate-700">
                {label}
                <input
                  className="hms-input"
                  value={form[key]}
                  onChange={(event) =>
                    setForm({ ...form, [key]: event.target.value })
                  }
                />
              </label>
            ))}
            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
              Address
              <textarea
                className="hms-input min-h-24"
                value={form.address}
                onChange={(event) =>
                  setForm({ ...form, address: event.target.value })
                }
              />
            </label>
            <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
              Under which doctor
              <select
                className="hms-input"
                value={form.doctorId}
                onChange={(event) =>
                  setForm({ ...form, doctorId: event.target.value })
                }
              >
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    Dr. {doctor.firstName} {doctor.lastName}
                    {doctor.specialization ? ` — ${doctor.specialization}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex justify-end gap-3 border-t border-slate-100 pt-5 sm:col-span-2">
              <Link className="hms-button-secondary" to={`/patients/${id}`}>
                Cancel
              </Link>
              <button className="hms-button-primary">
                <FilePenLine size={16} /> Save changes
              </button>
            </div>
          </form>
        </section>
      </div>
    );
  const doctorName = `Dr. ${patient.doctor.firstName} ${patient.doctor.lastName}`;
  const servicesByVisit = Object.values((patient.services || []).reduce((groups, service) => {
    const key = service.visitId || "legacy";
    if (!groups[key]) groups[key] = { visitNumber: service.visitNumber, visitDate: service.visitDate, departments: {} };
    const department = service.departmentName || "Other";
    if (!groups[key].departments[department]) groups[key].departments[department] = [];
    groups[key].departments[department].push(service);
    return groups;
  }, {}));
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
        to="/reception/patients"
      >
        <ArrowLeft size={16} /> Back to patients
      </Link>
      <section className="hms-card overflow-hidden">
        <div className="bg-gradient-to-r from-sky-50 to-teal-50/50 px-6 py-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-teal-700 text-xl font-bold text-white shadow-sm">
                {patient.firstName?.[0]}
                {patient.lastName?.[0]}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold text-slate-900">
                    {patient.firstName} {patient.lastName}
                  </h2>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                    {patient.registrationLocked ? "REGISTERED" : "REGISTERED"}
                  </span>
                </div>
                <p className="mt-1 text-sm font-medium text-slate-600">
                  {patient.patientNumber}
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
                  <Stethoscope size={15} /> {doctorName}
                </p>
              </div>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <CalendarDays size={15} />{" "}
              {new Date(patient.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100 sm:grid-cols-4">
          <div className="p-4">
            <p className="hms-label">Patient number</p>
            <p className="mt-1 text-sm font-bold text-slate-800">
              {patient.patientNumber}
            </p>
          </div>
          <div className="p-4">
            <p className="hms-label">Registration</p>
            <p className="mt-1 text-sm font-bold text-emerald-700">Complete</p>
          </div>
          <div className="p-4">
            <p className="hms-label">Assigned doctor</p>
            <p className="mt-1 truncate text-sm font-bold text-slate-800">
              {doctorName}
            </p>
          </div>
          <div className="p-4">
            <p className="hms-label">Record status</p>
            <p className="mt-1 flex items-center gap-1 text-sm font-bold text-slate-800">
              <ShieldCheck size={15} className="text-teal-600" /> Protected
            </p>
          </div>
        </div>
      </section>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="hms-card p-6">
            <div className="flex items-center gap-2">
              <UserRound size={18} className="text-teal-700" />
              <h3 className="font-bold text-slate-900">Personal information</h3>
            </div>
            <dl className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2">
              <Info label="First name" value={patient.firstName} />
              <Info label="Last name" value={patient.lastName} />
              <Info label="Father name" value={patient.fatherName} />
              <Info label="CNIC number" value={patient.cnic} />
            </dl>
          </section>
          <section className="hms-card p-6">
            <div className="flex items-center gap-2">
              <Phone size={18} className="text-teal-700" />
              <h3 className="font-bold text-slate-900">Contact details</h3>
            </div>
            <dl className="mt-5 grid gap-x-6 gap-y-5 sm:grid-cols-2">
              <Info label="Phone number" value={patient.phone} />
              <div className="sm:col-span-2">
                <dt className="hms-label flex items-center gap-1">
                  <MapPin size={13} /> Address
                </dt>
                <dd className="mt-1.5 text-sm font-medium text-slate-800">
                  {patient.address || "—"}
                </dd>
              </div>
            </dl>
          </section>
        </div>
        <aside className="space-y-5">
          <section className="hms-card p-5">
            <div className="flex items-center gap-2">
              <Stethoscope size={18} className="text-teal-700" />
              <h3 className="font-bold text-slate-900">Doctor</h3>
            </div>
            <p className="mt-4 text-sm font-semibold text-slate-800">
              {doctorName}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {patient.doctor.specialization || "General practice"}
            </p>
          </section>
          <section className="hms-card p-5">
            <div className="flex items-center gap-2">
              <CreditCard size={18} className="text-teal-700" />
              <h3 className="font-bold text-slate-900">Registration</h3>
            </div>
            <dl className="mt-4 space-y-4">
              <Info
                label="Registered on"
                value={new Date(patient.createdAt).toLocaleString()}
              />
              <Info
                label="Record security"
                value={
                  patient.registrationLocked
                    ? "Registration locked"
                    : "Unlocked"
                }
              />
            </dl>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Visit History</h3>
              <Link
                className="text-sm font-semibold text-teal-700"
                to={`/patients/${id}/visits/new`}
              >
                + Visit Again
              </Link>
            </div>
            {visits.length ? (
              <div className="mt-3 space-y-2">
                {visits.map((visit) => (
                  <div
                    key={visit.id}
                    className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm"
                  >
                    <span className="min-w-0">
                      <b>#{visit.visitNumber}</b>
                      <small className="ml-2 block text-slate-500 sm:inline">
                        {new Date(visit.visitDate).toLocaleDateString()} ·{" "}
                        {visit.doctorName}
                      </small>
                      <small className="mt-1 block text-slate-500">
                        Fee: {visit.feeType === "FREE" ? "FREE" : `PKR ${visit.visitFee}`} · Services: {visit.servicesCount} · Total: PKR {visit.total}
                      </small>
                    </span>
                    <button
                      className="font-semibold text-teal-700"
                      onClick={() => navigate(`/visits/${visit.id}`)}
                    >
                      View
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No visits found.</p>
            )}
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="font-bold text-slate-800">Services</h3>
            {servicesByVisit.length ? (
              <div className="mt-3 space-y-3">
                {servicesByVisit.map((visit) => <div key={visit.visitNumber || "legacy"} className="rounded-xl border border-slate-100 p-3"><p className="text-sm font-bold text-slate-800">{visit.visitNumber ? `Visit #${visit.visitNumber}` : "Legacy services"}</p>{Object.entries(visit.departments).map(([department, departmentServices]) => <div className="mt-3" key={department}><p className="hms-label">{department}</p>{departmentServices.map((service) => <div className="mt-2 flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm" key={service.id}><span><b className="block">{service.serviceName}</b><small className="text-slate-500">{service.serviceCode} · ×{service.quantity}</small></span><b>PKR {service.totalAmount}</b></div>)}</div>)}</div>)}
              </div>
            ) : (
              <p className="mt-2 text-sm leading-6 text-slate-500">
                No services have been added yet.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
