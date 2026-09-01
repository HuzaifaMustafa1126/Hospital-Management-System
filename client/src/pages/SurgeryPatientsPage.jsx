import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, UserRound } from "lucide-react";
import { surgeryService } from "../services/surgery.service";

export function SurgeryPatientsPage() {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const term = search.trim();
    if (!term) {
      setItems([]);
      return undefined;
    }
    const timeout = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await surgeryService.searchPatients({ search: term });
        setItems(response.data.data.items);
        setError("");
      } catch (requestError) {
        setError(
          requestError.response?.data?.message || "Unable to search patients.",
        );
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timeout);
  }, [search]);
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section>
        <p className="text-sm font-semibold text-teal-700">Surgery workflow</p>
        <h2 className="mt-1 text-3xl font-bold text-slate-900">
          Surgery Patients
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Find a registered patient and manage surgery services.
        </p>
      </section>
      <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Search className="text-slate-400" size={20} />
        <input
          autoFocus
          className="w-full bg-transparent text-sm outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by CNIC, patient number, phone or name..."
        />
      </label>
      {error && (
        <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </p>
      )}
      {loading && <p className="text-sm text-slate-500">Searching patients…</p>}
      {search &&
        !loading &&
        !error &&
        (items.length ? (
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="divide-y divide-slate-100">
              {items.map((patient) => (
                <article
                  key={patient.id}
                  className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto] sm:items-center"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700">
                      <UserRound size={20} />
                    </span>
                    <div className="min-w-0">
                      <b className="block truncate text-slate-900">
                        {patient.firstName} {patient.lastName}
                      </b>
                      <span className="text-sm text-slate-500">
                        {patient.patientNumber} · {patient.gender?.toLowerCase() || "gender not specified"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <small className="hms-label">CNIC</small>
                    <p className="text-sm text-slate-700">{patient.cnic}</p>
                  </div>
                  <div>
                    <small className="hms-label">Phone</small>
                    <p className="text-sm text-slate-700">{patient.phone}</p>
                  </div>
                  <div>
                    <small className="hms-label">Doctor</small>
                    <p className="text-sm text-slate-700">
                      Dr. {patient.doctor.firstName} {patient.doctor.lastName}
                    </p>
                    <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      REGISTERED
                    </span>
                  </div>
                  <Link
                    className="hms-button-primary justify-center"
                    to={`/surgery/patients/${patient.id}`}
                  >
                    Open Patient
                  </Link>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
            No matching active patient was found.
          </div>
        ))}
    </div>
  );
}
