import { useEffect, useState } from "react";
import { Activity, Scissors, Search, Stethoscope, Tag } from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
const money = (value) => `PKR ${new Intl.NumberFormat().format(value || 0)}`;
export function SurgeryPage() {
  const [data, setData] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    api
      .get("/surgery")
      .then((r) => setData(r.data.data))
      .catch((e) =>
        setError(
          e.response?.data?.message || "Unable to load surgery information.",
        ),
      );
  }, []);
  if (error)
    return <p className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>;
  if (!data)
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            className="h-32 animate-pulse rounded-2xl bg-slate-200"
            key={i}
          />
        ))}
      </div>
    );
  const cards = [
    ["Surgery Services", data.serviceCount, Tag],
    ["Active Services", data.activeCount, Scissors],
    ["Today's Activity", data.todayCount, Activity],
    ["Available Services", data.services.length, Stethoscope],
  ];
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-gradient-to-br from-slate-950 to-teal-900 p-6 text-white">
        <Scissors className="text-teal-300" />
        <h2 className="mt-3 text-3xl font-bold">Surgery</h2>
        <p className="mt-2 text-sm text-slate-300">
          Manage and monitor surgery-related patient services.
        </p>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon]) => (
          <article className="hms-card p-5" key={label}>
            <Icon className="text-teal-700" size={21} />
            <p className="mt-5 text-3xl font-bold">{value}</p>
            <p className="text-sm text-slate-500">{label}</p>
          </article>
        ))}
      </section>
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Available Surgery Services</h3>
            <p className="text-sm text-slate-500">
              Services configured for the Surgery department.
            </p>
          </div>
          <Link
            className="hms-button-secondary"
            to="/reception/patients/search"
          >
            <Search size={16} /> Search Patient
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.services.length ? (
            data.services.map((service) => (
              <article className="hms-card p-5" key={service.id}>
                <div className="flex items-start justify-between">
                  <span className="rounded-xl bg-teal-50 p-3 text-teal-700">
                    <Scissors size={21} />
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-bold ${service.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                  >
                    {service.isActive ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>
                <h4 className="mt-4 font-bold">{service.name}</h4>
                <p className="text-sm text-slate-500">
                  {service.code} · Surgery
                </p>
                <p className="mt-4 text-lg font-bold">{money(service.price)}</p>
              </article>
            ))
          ) : (
            <p className="hms-card col-span-full p-8 text-center text-slate-500">
              No surgery services are configured yet.
            </p>
          )}
        </div>
      </section>
      <section className="hms-card p-5">
        <h3 className="font-bold">Recent Surgery Activity</h3>
        {data.activity.length ? (
          <div className="mt-4 space-y-3">
            {data.activity.map((item) => (
              <p className="text-sm text-slate-600" key={item.id}>
                <b>{item.serviceName}</b> added{" "}
                {new Date(item.createdAt).toLocaleString()}
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            No surgery activity today.
          </p>
        )}
      </section>
    </div>
  );
}
