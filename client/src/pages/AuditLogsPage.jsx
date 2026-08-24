import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ClipboardList,
  FlaskConical,
  LogIn,
  LogOut,
  Receipt,
  Search,
  ShieldCheck,
  Stethoscope,
  UserPlus,
  UserRoundPen,
  X,
} from "lucide-react";
import { api } from "../services/api";
const actionIcon = (a = "") =>
  a.includes("LOGIN")
    ? LogIn
    : a.includes("LOGOUT")
      ? LogOut
      : a.includes("PATIENT_CREATED")
        ? UserPlus
        : a.includes("PATIENT_UPDATED")
          ? UserRoundPen
          : a.includes("LAB_SERVICE")
            ? FlaskConical
            : a.includes("PAYMENT")
              ? Receipt
              : a.includes("SERVICE")
                ? Stethoscope
                : Activity;
const label = (v) =>
  v
    ?.replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (x) => x.toUpperCase());
export function AuditLogsPage() {
  const [range, setRange] = useState("30d"),
    [filters, setFilters] = useState({ search: "", action: "", entity: "" }),
    [data, setData] = useState({ logs: [], stats: {} }),
    [selected, setSelected] = useState(null),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      setData(
        (await api.get("/audit-logs", { params: { range, ...filters } })).data
          .data,
      );
      setError("");
    } catch (e) {
      setError(e.response?.data?.message || "Unable to load audit activity.");
    }
  }, [range, filters]);
  useEffect(() => {
    void load();
  }, [load]);
  const cards = [
    ["Total Events", data.stats.total, ClipboardList, "text-sky-700 bg-sky-50"],
    ["Today's Events", data.stats.today, Activity, "text-teal-700 bg-teal-50"],
    ["Login Activity", data.stats.login, LogIn, "text-violet-700 bg-violet-50"],
    [
      "Patient Activity",
      data.stats.patient,
      UserPlus,
      "text-amber-700 bg-amber-50",
    ],
    [
      "Service Activity",
      data.stats.service,
      FlaskConical,
      "text-rose-700 bg-rose-50",
    ],
  ];
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 p-6 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-teal-300">
              <ShieldCheck size={17} /> Security & Activity
            </span>
            <h2 className="mt-2 text-3xl font-bold">Audit Logs</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Monitor important system activity, authentication events, patient
              activity and service operations.
            </p>
          </div>
          <ClipboardList className="text-teal-300" size={40} />
        </div>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map(([name, value, Icon, tone]) => (
          <article className="hms-card p-4" key={name}>
            <span className={`inline-grid rounded-xl p-2 ${tone}`}>
              <Icon size={18} />
            </span>
            <p className="mt-3 text-2xl font-bold text-slate-900">
              {value ?? "—"}
            </p>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {name}
            </p>
          </article>
        ))}
      </section>
      <section className="hms-card space-y-3 p-4">
        <div className="flex flex-wrap gap-2">
          {[
            ["today", "Today"],
            ["7d", "7 Days"],
            ["30d", "30 Days"],
          ].map(([key, text]) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${range === key ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"}`}
            >
              {text}
            </button>
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-4">
          <label className="relative">
            <Search
              size={16}
              className="absolute left-3 top-3 text-slate-400"
            />
            <input
              className="hms-input mt-0 pl-9"
              placeholder="Search activity"
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
            />
          </label>
          <input
            className="hms-input mt-0"
            placeholder="Action (e.g. LOGIN)"
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
          />
          <input
            className="hms-input mt-0"
            placeholder="Entity (e.g. PATIENT)"
            value={filters.entity}
            onChange={(e) => setFilters({ ...filters, entity: e.target.value })}
          />
          <button
            className="hms-button-secondary"
            onClick={() => {
              setRange("30d");
              setFilters({ search: "", action: "", entity: "" });
            }}
          >
            Reset
          </button>
        </div>
      </section>
      {error && (
        <p className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>
      )}
      <section className="hms-card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Activity stream</h3>
          <p className="text-sm text-slate-500">
            Select an event to see a clear summary of what happened.
          </p>
        </div>
        <div className="divide-y divide-slate-100">
          {data.logs.length ? (
            data.logs.map((log) => {
              const Icon = actionIcon(log.action);
              return (
                <button
                  onClick={() => setSelected(log)}
                  key={log.id}
                  className="grid w-full gap-3 px-5 py-4 text-left transition hover:bg-teal-50 sm:grid-cols-[44px_1fr_1fr_2fr_1fr_auto]"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-teal-700">
                    <Icon size={19} />
                  </span>
                  <span>
                    <b className="block text-slate-800">{label(log.action)}</b>
                    <small className="text-slate-500">
                      {log.entity} {log.entityId ? `#${log.entityId}` : ""}
                    </small>
                  </span>
                  <span className="text-sm text-slate-600">
                    <b className="block text-slate-700">
                      {log.user
                        ? `${log.user.firstName} ${log.user.lastName}`
                        : "System"}
                    </b>
                    <small>{log.user?.role || "System"}</small>
                  </span>
                  <span className="text-sm text-slate-600">
                    {log.details}
                  </span>
                  <span className="text-sm text-slate-600"><b className="block">{new Date(log.createdAt).toLocaleDateString()}</b><small>{new Date(log.createdAt).toLocaleTimeString()}</small></span>
                  <span className="text-sm font-semibold text-teal-700">
                    Details
                  </span>
                </button>
              );
            })
          ) : (
            <div className="p-12 text-center text-slate-500">
              No data available for this range.
            </div>
          )}
        </div>
      </section>
      {selected && (
        <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md overflow-y-auto bg-white p-6 shadow-2xl">
          <button
            onClick={() => setSelected(null)}
            className="absolute right-5 top-5 rounded-lg p-2 hover:bg-slate-100"
          >
            <X size={20} />
          </button>
          <p className="text-sm font-semibold text-teal-700">Audit event</p>
          <h3 className="mt-1 pr-8 text-2xl font-bold">
            {label(selected.action)}
          </h3>
          <p className="mt-4 rounded-xl bg-teal-50 p-4 text-sm leading-6 text-teal-900">
            {selected.details}
          </p>
          <dl className="mt-6 space-y-4 text-sm">
            {[
              [
                "User",
                selected.user
                  ? `${selected.user.firstName} ${selected.user.lastName}`
                  : "System",
              ],
              ["Role", selected.user?.role || "System"],
              ["Entity", selected.entity],
              ["Entity ID", selected.entityId || "—"],
              ["Date", new Date(selected.createdAt).toLocaleDateString()],
              ["Time", new Date(selected.createdAt).toLocaleTimeString()],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-slate-500">{k}</dt>
                <dd className="mt-0.5 font-semibold text-slate-800">{v}</dd>
              </div>
            ))}
          </dl>
        </aside>
      )}
    </div>
  );
}
