import { useEffect, useState } from "react";
import { Banknote, WalletCards } from "lucide-react";
import { api } from "../services/api";

const money = (value) => `PKR ${Number(value || 0).toLocaleString("en-PK")}`;
export function RevenuePage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api.get("/dashboard/financial").then((response) => setData(response.data.data)).catch((requestError) => setError(requestError.response?.data?.message || "Unable to load revenue.")); }, []);
  if (error) return <p className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>;
  if (!data) return <p className="hms-card p-6 text-slate-500">Loading revenue…</p>;
  return <div className="space-y-6"><section><p className="text-sm font-semibold text-teal-700">Super Admin</p><h2 className="mt-1 text-3xl font-bold">Revenue</h2><p className="mt-1 text-sm text-slate-500">Hospital-wide financial information.</p></section><section className="grid gap-4 sm:grid-cols-3">{[["Today's Revenue", money(data.todayRevenue), Banknote],["Pending Payments", data.pendingPayments, WalletCards],["Registration Revenue", money(data.registrationRevenue), Banknote]].map(([label,value,Icon]) => <article className="hms-card p-5" key={label}><Icon className="text-teal-700" size={20}/><p className="mt-4 text-2xl font-bold">{value}</p><p className="text-sm text-slate-500">{label}</p></article>)}</section></div>;
}
