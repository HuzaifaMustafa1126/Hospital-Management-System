import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Droplets, Search, Users, Activity } from "lucide-react";
import { bloodBankService } from "../services/blood-bank.service";

export function BloodBankPage() {
  const [data, setData] = useState(null), [error, setError] = useState("");
  useEffect(() => { bloodBankService.overview().then((response) => setData(response.data.data)).catch((requestError) => setError(requestError.response?.data?.message || "Unable to load Blood Bank dashboard.")); }, []);
  if (error) return <p className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>;
  if (!data) return <div className="grid gap-4 sm:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <div className="h-28 animate-pulse rounded-2xl bg-slate-200" key={index}/>)}</div>;
  const cards = [["Today's Blood Bank Services", data.todayServices, Droplets], ["Patients Served Today", data.patientsToday, Users], ["Active Blood Bank Services", data.activeServices, Activity]];
  return <div className="space-y-6"><section className="rounded-2xl bg-gradient-to-br from-rose-950 via-slate-950 to-red-900 p-6 text-white"><Droplets className="text-rose-300"/><h2 className="mt-3 text-3xl font-bold">Blood Bank</h2><p className="mt-2 text-sm text-slate-300">Manage visit-based Blood Bank services for registered patients.</p><Link className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-rose-900" to="/blood-bank/patients"><Search size={16}/> Search Patient</Link></section><section className="grid gap-4 sm:grid-cols-3">{cards.map(([label,value,Icon]) => <article className="hms-card p-5" key={label}><Icon className="text-rose-700" size={21}/><p className="mt-4 text-3xl font-bold">{value}</p><p className="text-sm text-slate-500">{label}</p></article>)}</section><section className="hms-card p-5"><h3 className="font-bold">Recent Blood Bank Activity</h3>{data.activity.length ? <div className="mt-4 divide-y divide-slate-100">{data.activity.map((item) => <Link className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between" to={`/blood-bank/patients/${item.patientId}`} key={item.id}><span><b>{item.serviceName}</b> for {item.patientName} ({item.patientNumber})</span><small className="text-slate-500">{new Date(item.createdAt).toLocaleString()} · {item.status}</small></Link>)}</div> : <p className="mt-3 rounded-lg bg-slate-50 p-5 text-sm text-slate-500">No Blood Bank activity today.</p>}</section></div>;
}
