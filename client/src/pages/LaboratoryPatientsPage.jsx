import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, UserRound } from "lucide-react";
import { laboratoryService } from "../services/laboratory.service";
export function LaboratoryPatientsPage() {
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
        const response = await laboratoryService.searchPatients({
          search: term,
        });
        setItems(response.data.data.items);
        setError("");
      } catch (e) {
        setError(e.response?.data?.message || "Unable to search patients.");
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => clearTimeout(timeout);
  }, [search]);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section>
        <p className="text-sm font-semibold text-teal-700">
          Laboratory workflow
        </p>
        <h2 className="mt-1 text-2xl font-bold text-slate-900">
          Find a patient
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Search by CNIC, patient number, phone, or patient name.
        </p>
      </section>
      <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Search className="text-slate-400" size={20} />
        <input
          autoFocus
          className="w-full bg-transparent text-sm outline-none"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patient by CNIC..."
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
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-teal-50 text-teal-700">
                      <UserRound size={20} />
                    </span>
                    <div>
                      <b className="block text-slate-900">
                        {patient.firstName} {patient.lastName}
                      </b>
                      <span className="text-sm text-slate-500">
                        {patient.patientNumber} · {patient.cnic} ·{" "}
                        {patient.phone} · {patient.gender?.toLowerCase() || "gender not specified"}
                      </span>
                      <p className="mt-1 text-xs text-slate-500">
                        Dr. {patient.doctor.firstName} {patient.doctor.lastName}{" "}
                        · REGISTERED
                      </p>
                    </div>
                  </div>
                  <Link
                    className="hms-button-primary shrink-0"
                    to={`/laboratory/patients/${patient.id}`}
                  >
                    Open patient
                  </Link>
                </article>
              ))}
            </div>
          </section>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            No matching active patient was found.
          </div>
        ))}
    </div>
  );
}
