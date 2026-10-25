import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { patientService } from "../services/patient.service";
import { useAuth } from "../context/AuthContext";
import { BaseModal } from "../components/BaseModal";

export function PatientListPage() {
  const { user } = useAuth();
  const admin = user?.roles.includes("SUPER_ADMIN");
  const canDelete = admin || user?.permissions.includes("PATIENT_DELETE");
  const [data, setData] = useState({ items: [], pagination: {} });
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleteState, setDeleteState] = useState(null);
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const load = useCallback(async (term = "") => {
    try {
      setLoading(true);
      setData(
        (
          await patientService.list({
            page: 1,
            limit: 20,
            search: term || undefined,
          })
        ).data.data,
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Unable to load patients",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const openDelete = async (patient) => {
    setError("");
    setSuccess("");
    setConfirmation("");
    setDeleteState({ patient, loading: true });
    try {
      const response = await patientService.deletionImpact(patient.id);
      setDeleteState({ patient, impact: response.data.data, loading: false });
    } catch (requestError) {
      setDeleteState(null);
      setError(requestError.response?.data?.message || "Unable to inspect patient records");
    }
  };
  const permanentlyDelete = async () => {
    const patient = deleteState.patient;
    try {
      setSubmitting(true);
      const response = await patientService.permanentDelete(patient.id, { cnic: confirmation });
      setDeleteState(null);
      setSuccess(response.data.message || "Patient permanently deleted");
      await load(search);
    } catch (requestError) {
      const message = requestError.response?.data?.message || "Unable to complete this action";
      setError(message);
      setDeleteState((current) => current ? { ...current, error: message } : current);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <div className="space-y-5">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-teal-700">
            Patient management
          </p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Patients
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Manage and review registered hospital patients.
          </p>
        </div>
        <Link className="hms-button-primary" to="/reception/patients/register">
          <Plus size={17} /> Register patient
        </Link>
      </section>
      <section className="hms-card p-4">
        <form
          className="flex flex-col gap-3 lg:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            void load(search);
          }}
        >
          <label className="relative flex-1">
            <Search
              className="absolute left-3.5 top-3 text-slate-400"
              size={18}
            />
            <input
              className="hms-input mt-0 pl-10"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by patient name, CNIC, phone or patient number"
            />
          </label>
          <button className="hms-button-primary">
            <Search size={16} /> Search
          </button>
          <button type="button" className="hms-button-secondary">Filters</button>
        </form>
      </section>
      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {success}
        </p>
      )}
      <section className="hms-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="font-bold text-slate-900">Patient directory</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {data.pagination?.total ?? data.items.length} registered patient
              records
            </p>
          </div>
          <span className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
            <CalendarDays size={15} /> Updated just now
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Patient</th>
                <th className="px-4 py-3.5">Patient number</th>
                <th className="px-4 py-3.5">CNIC</th>
                <th className="px-4 py-3.5">Phone</th>
                <th className="px-4 py-3.5">Doctor</th>
                <th className="px-4 py-3.5">Registered</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    Loading patient records…
                  </td>
                </tr>
              ) : data.items.length ? (
                data.items.map((patient) => (
                  <tr
                    className="transition hover:bg-slate-50/80"
                    key={patient.id}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                          {patient.firstName?.[0]}
                          {patient.lastName?.[0]}
                        </span>
                        <span>
                          <b className="block text-slate-800">
                            {patient.firstName} {patient.lastName}
                          </b>
                          <small className="text-slate-500">
                            {patient.fatherName} · {patient.gender?.toLowerCase() || "gender not specified"}
                          </small>
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-medium text-slate-700">
                      {patient.patientNumber}
                    </td>
                    <td className="px-4 py-4 text-slate-600">{patient.cnic}</td>
                    <td className="px-4 py-4 text-slate-600">
                      {patient.phone}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {patient.doctor ? `Dr. ${patient.doctor.firstName} ${patient.doctor.lastName}` : "Assigned per visit"}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {new Date(patient.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                        REGISTERED
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        className="font-semibold text-teal-700 hover:text-teal-800"
                        to={`/patients/${patient.id}`}
                      >
                        View
                      </Link>
                      {admin && (
                        <Link
                          className="ml-4 font-semibold text-slate-600 hover:text-slate-900"
                          to={`/admin/patients/${patient.id}/edit`}
                        >
                          Edit
                        </Link>
                      )}
                      {canDelete && (
                        <button type="button" className="ml-4 inline-flex items-center gap-1 font-semibold text-rose-600 hover:text-rose-700" onClick={() => void openDelete(patient)}>
                          <Trash2 size={15} /> Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-5 py-12 text-center">
                    <FileSearch
                      className="mx-auto mb-3 text-slate-300"
                      size={30}
                    />
                    <p className="font-medium text-slate-700">
                      No patients found
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Try a different search term or register a new patient.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3.5 text-sm text-slate-500">
          <span>Showing up to {data.items.length} records</span>
          <div className="flex gap-1">
            <button
              className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40"
              disabled
            >
              <ChevronLeft size={16} />
            </button>
            <button
              className="rounded-lg border border-slate-200 p-1.5 disabled:opacity-40"
              disabled
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </section>
      {deleteState && (
        <BaseModal labelledBy="delete-patient-title" onClose={() => !submitting && setDeleteState(null)} panelClassName="max-w-xl">
          <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
            <div><p className="text-xs font-bold uppercase tracking-wider text-rose-600">Permanent deletion</p><h3 id="delete-patient-title" className="mt-1 text-xl font-bold text-slate-900">Permanently Delete Patient?</h3></div>
            <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={() => setDeleteState(null)} disabled={submitting}><X size={20} /></button>
          </div>
          <div className="overflow-y-auto px-6 py-5">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl bg-slate-50 p-4 text-sm">
              <dt className="text-slate-500">Patient Name</dt><dd className="font-semibold text-slate-900">{deleteState.patient.firstName} {deleteState.patient.lastName}</dd>
              <dt className="text-slate-500">Patient Number</dt><dd className="font-mono font-semibold text-slate-900">{deleteState.patient.patientNumber}</dd>
              <dt className="text-slate-500">CNIC Number</dt><dd className="font-mono font-semibold text-slate-900">{deleteState.impact?.patient.cnic || deleteState.patient.cnic}</dd>
            </dl>
            <p className="mt-4 text-sm text-slate-600">This action will permanently remove the patient and all eligible associated records. It cannot be undone.</p>
            {deleteState.notice && <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{deleteState.notice}</p>}
            {deleteState.error && <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{deleteState.error}</p>}
            {deleteState.loading ? <p className="py-8 text-center text-sm text-slate-500">Checking related records and retention requirements…</p> : (
              <>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <div className="rounded-xl border p-3"><b className="block text-lg">{deleteState.impact.counts.visits}</b><span className="text-slate-500">Visits</span></div>
                  <div className="rounded-xl border p-3"><b className="block text-lg">{deleteState.impact.counts.consultations}</b><span className="text-slate-500">Consultations</span></div>
                  <div className="rounded-xl border p-3"><b className="block text-lg">{deleteState.impact.counts.services + deleteState.impact.counts.shortStayOrders}</b><span className="text-slate-500">Services</span></div>
                  <div className="rounded-xl border p-3"><b className="block text-lg">{deleteState.impact.counts.bills + deleteState.impact.counts.registrationPayments + deleteState.impact.counts.payments}</b><span className="text-slate-500">Financial</span></div>
                </div>
                {deleteState.impact.permanentDeleteEligible && (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
                    <p className="text-sm font-bold text-rose-800">Permanent deletion cannot be undone.</p>
                    <p className="mt-1 text-xs text-rose-700">Enter the exact patient CNIC to enable permanent deletion.</p>
                    <input className="hms-input mt-3 bg-white" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={deleteState.impact.patient.cnic} />
                  </div>
                )}
              </>
            )}
          </div>
          {!deleteState.loading && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <button className="hms-button-secondary" onClick={() => setDeleteState(null)} disabled={submitting}>Cancel</button>
            {deleteState.impact.permanentDeleteEligible && <button className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50" onClick={() => void permanentlyDelete()} disabled={submitting || confirmation !== deleteState.impact.patient.cnic}>{submitting ? "Deleting…" : "Permanently Delete"}</button>}
          </div>}
        </BaseModal>
      )}
    </div>
  );
}
