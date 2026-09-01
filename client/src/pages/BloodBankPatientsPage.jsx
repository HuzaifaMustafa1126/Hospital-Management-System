import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, UserRound } from "lucide-react";
import { bloodBankService } from "../services/blood-bank.service";

export function BloodBankPatientsPage() {
  const [search, setSearch] = useState(""),
    [items, setItems] = useState([]),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const term = search.trim();
    if (!term) {
      setItems([]);
      return undefined;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await bloodBankService.searchPatients({
          search: term,
        });
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
    return () => clearTimeout(timer);
  }, [search]);
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section>
        <p className="text-sm font-semibold text-rose-700">
          Blood Bank workflow
        </p>
        <h2 className="mt-1 text-3xl font-bold">Blood Bank Patients</h2>
        <p className="mt-1 text-sm text-slate-500">
          Find a registered patient and open an existing visit.
        </p>
      </section>
      <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <Search className="text-slate-400" size={20} />
        <input
          autoFocus
          className="w-full bg-transparent text-sm outline-none"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by CNIC, patient number, phone or name..."
        />
      </label>
      {error && (
        <p className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>
      )}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              className="h-20 animate-pulse rounded-xl bg-slate-200"
              key={index}
            />
          ))}
        </div>
      )}
      {search &&
        !loading &&
        !error &&
        (items.length ? (
          <section className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {items.map((patient) => (
              <article
                className="grid gap-4 p-5 sm:grid-cols-[minmax(0,1.2fr)_1fr_1fr_auto] sm:items-center"
                key={patient.id}
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-rose-50 text-rose-700">
                    <UserRound size={20} />
                  </span>
                  <div>
                    <b>
                      {patient.firstName} {patient.lastName}
                    </b>
                    <p className="text-sm text-slate-500">
                      {patient.patientNumber} · {patient.gender?.toLowerCase() || "gender not specified"}
                    </p>
                  </div>
                </div>
                <div className="text-sm">
                  <span className="hms-label">CNIC / Phone</span>
                  <p>{patient.cnic}</p>
                  <p className="text-slate-500">{patient.phone}</p>
                </div>
                <div className="text-sm">
                  <span className="hms-label">Latest Visit</span>
                  {patient.latestVisit ? (
                    <>
                      <p>Visit #{patient.latestVisit.visitNumber}</p>
                      <p className="text-slate-500">
                        {new Date(
                          patient.latestVisit.visitDate,
                        ).toLocaleDateString()}{" "}
                        · {patient.latestVisit.status}
                      </p>
                    </>
                  ) : (
                    <p className="text-amber-700">No visit found</p>
                  )}
                  <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    REGISTERED
                  </span>
                </div>
                <Link
                  className="hms-button-primary justify-center"
                  to={`/blood-bank/patients/${patient.id}`}
                >
                  Open Patient
                </Link>
              </article>
            ))}
          </section>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
            No patient found.
          </div>
        ))}
    </div>
  );
}
