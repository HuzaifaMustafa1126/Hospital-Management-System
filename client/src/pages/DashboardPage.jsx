import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  Banknote,
  Building2,
  CalendarDays,
  Stethoscope,
  Users,
  UserRoundPlus,
  UserPlus,
  WalletCards,
  Droplets,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../context/AuthContext";
import { dashboardService } from "../services/dashboard.service";
import { SurgeryPage } from "./SurgeryPage";
import { BloodBankPage } from "./BloodBankPage";

const day = (date) =>
  new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
  });
const skeleton = (
  <div className="animate-pulse rounded-xl border border-slate-200 bg-white p-5">
    <div className="h-3 w-24 rounded bg-slate-200" />
    <div className="mt-4 h-8 w-16 rounded bg-slate-200" />
  </div>
);

function OperationalDashboard() {
  const { user } = useAuth();
  const admin = user?.roles.includes("SUPER_ADMIN");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    dashboardService
      .summary()
      .then((response) => setData(response.data.data))
      .catch((requestError) =>
        setError(
          requestError.response?.data?.message ||
            "Unable to load dashboard data.",
        ),
      );
  }, []);
  if (error)
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-800">
        <b>Unable to load dashboard.</b>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    );
  if (!data)
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index}>{skeleton}</div>
        ))}
      </div>
    );
  const stats = [
    {
      label: "Total Patients",
      value: data.totalPatients,
      note: "Registered patients",
      icon: Users,
      tone: "bg-sky-50 text-sky-700",
    },
    {
      label: "Today's Patients",
      value: data.todayPatients,
      note: "New registrations today",
      icon: UserRoundPlus,
      tone: "bg-teal-50 text-teal-700",
    },
    {
      label: "Active Doctors",
      value: data.activeDoctors,
      note: "Available for assignment",
      icon: Stethoscope,
      tone: "bg-violet-50 text-violet-700",
    },
    {
      label: "Total Departments",
      value: data.totalDepartments,
      note: "Configured care areas",
      icon: Building2,
      tone: "bg-cyan-50 text-cyan-700",
    },
    {
      label: "Active Services",
      value: data.activeServices,
      note: "Available for future requests",
      icon: Activity,
      tone: "bg-amber-50 text-amber-700",
    },
    {
      label: "Surgery Services",
      value: data.surgeryToday,
      note: "Surgery services added today",
      icon: Activity,
      tone: "bg-slate-100 text-slate-700",
    },
    {
      label: "Blood Bank Activity",
      value: data.bloodBankToday,
      note: "Blood Bank services added today",
      icon: Droplets,
      tone: "bg-rose-50 text-rose-700",
    },
    ...(admin ? [{
      label: "Today's Revenue",
      value: `PKR ${data.financial?.todayRevenue || 0}`,
      note: "Paid registrations",
      icon: Banknote,
      tone: "bg-emerald-50 text-emerald-700",
    }, {
      label: "Pending Payments",
      value: data.financial?.pendingPayments || 0,
      note: "No open items",
      icon: WalletCards,
      tone: "bg-slate-100 text-slate-700",
    }] : []),
  ];
  const quick = admin
    ? [
        {
          label: "Register Patient",
          to: "/reception/patients/register",
          icon: UserPlus,
        },
        { label: "Add Doctor", to: "/admin/doctors", icon: Stethoscope },
        { label: "Create User", to: "/admin/users/create", icon: Users },
        {
          label: "Registration Fee",
          to: "/admin/settings/registration-fee",
          icon: WalletCards,
        },
      ]
    : [
        {
          label: "Register Patient",
          to: "/reception/patients/register",
          icon: UserPlus,
        },
        {
          label: "Search Patients",
          to: "/reception/patients/search",
          icon: Users,
        },
      ];
  const patientPath = admin ? "/admin/patients" : "/reception/patients";
  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium text-teal-700">
            Hospital operations
          </p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Good morning, {user?.firstName}
          </h2>
          <p className="mt-2 text-slate-500">
            Hospital overview and activity summary.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">
            <CalendarDays size={16} /> Today
          </span>
          <button className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
            7 Days
          </button>
          <button className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white">
            30 Days
          </button>
        </div>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map(({ label, value, note, icon: Icon, tone }) => (
          <article
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            key={label}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {label}
                </p>
                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                  {value}
                </p>
              </div>
              <span className={`rounded-lg p-2.5 ${tone}`}>
                <Icon size={20} />
              </span>
            </div>
            <p className="mt-3 text-xs text-slate-500">{note}</p>
          </article>
        ))}
      </section>
      <section className="grid gap-6 xl:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900">
                Patient Registration Overview
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Daily registrations from the last 7 days
              </p>
            </div>
            <span className="rounded-md bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700">
              Live data
            </span>
          </div>
          <div className="mt-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.registrationTrend}>
                <defs>
                  <linearGradient
                    id="registrationArea"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#0f766e" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={day}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="registrations"
                  stroke="#0f766e"
                  strokeWidth={2.5}
                  fill="url(#registrationArea)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-slate-900">Quick Actions</h3>
          <p className="mt-1 text-sm text-slate-500">Shortcuts for your role</p>
          <div className="mt-4 space-y-2">
            {quick.map(({ label, to, icon: Icon }) => (
              <Link
                className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm font-medium text-slate-700 transition hover:border-teal-200 hover:bg-teal-50"
                key={label}
                to={to}
              >
                <span className="rounded-md bg-slate-100 p-2 text-slate-600">
                  <Icon size={16} />
                </span>
                {label}
              </Link>
            ))}
          </div>
        </article>
      </section>
      <section className="grid gap-6 xl:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-slate-900">Department Activity</h3>
          <p className="mt-1 text-sm text-slate-500">Services recorded today</p>
          <div className="mt-5 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.departmentActivity}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="department"
                  tick={{ fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip />
                <Bar dataKey="activity" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
        {admin && <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-slate-900">Revenue Overview</h3>
          <p className="mt-1 text-sm text-slate-500">
            Registration fees collected
          </p>
          <div className="mt-5 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.financial?.revenueTrend || []}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={day}
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#059669"
                  strokeWidth={2.5}
                  fill="#d1fae5"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>}
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-bold text-slate-900">Recent Activity</h3>
          <div className="mt-4 space-y-4">
            {data.recentActivity.length ? (
              data.recentActivity.map((item, index) => (
                <div
                  className="flex gap-3"
                  key={`${item.action}-${item.entityId}-${index}`}
                >
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-teal-600" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {item.action
                        .replaceAll("_", " ")
                        .toLowerCase()
                        .replace(/^./, (letter) => letter.toUpperCase())}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-500">
                No activity has been recorded yet.
              </p>
            )}
          </div>
        </article>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between p-5">
          <div>
            <h3 className="font-bold text-slate-900">Recent Patients</h3>
            <p className="mt-1 text-sm text-slate-500">
              Most recently registered patient records
            </p>
          </div>
          <Link
            className="text-sm font-semibold text-teal-700 hover:text-teal-800"
            to={patientPath}
          >
            View all
          </Link>
        </div>
        {data.recentPatients.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-y border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Patient</th>
                  <th className="px-5 py-3">Patient Number</th>
                  <th className="px-5 py-3">CNIC</th>
                  <th className="px-5 py-3">Doctor</th>
                  <th className="px-5 py-3">Registered</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.recentPatients.map((patient) => (
                  <tr
                    className="border-b border-slate-100 last:border-0"
                    key={patient.id}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-sky-100 text-sm font-bold text-sky-700">
                          {patient.firstName[0]}
                          {patient.lastName[0]}
                        </span>
                        <span>
                          <b className="block text-slate-800">
                            {patient.firstName} {patient.lastName}
                          </b>
                          <small className="text-slate-500">
                            Patient record
                          </small>
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-medium text-slate-700">
                      {patient.patientNumber}
                    </td>
                    <td className="px-5 py-4 text-slate-600">{patient.cnic}</td>
                    <td className="px-5 py-4 text-slate-600">
                      {patient.doctorName}
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {new Date(patient.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                        REGISTERED
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Link
                        className="font-semibold text-teal-700"
                        to={`/patients/${patient.id}`}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="m-5 rounded-lg bg-slate-50 p-5 text-sm text-slate-500">
            No patients have been registered yet.
          </div>
        )}
      </section>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  if (user?.roles.includes("SURGERY_ATTENDANT")) return <SurgeryPage />;
  if (user?.roles.includes("BLOOD_BANK_STAFF")) return <BloodBankPage />;
  return <OperationalDashboard />;
}
