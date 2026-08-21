<<<<<<< HEAD
import { useState } from "react";
import {
  Bell,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutDashboard,
  Menu,
  Search,
  Settings,
  Stethoscope,
  Tag,
  UserCog,
  Users,
  UserPlus,
  WalletCards,
} from "lucide-react";
=======
import { useEffect, useState } from "react";
import { Bell, Building2, ChevronLeft, ChevronRight, ClipboardList, FlaskConical, LayoutDashboard, Menu, Search, Settings, Stethoscope, Tag, UserCog, Users, UserPlus, WalletCards, X } from "lucide-react";
>>>>>>> 1b6046d (Add Departments)
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
const linkClass = ({ isActive }) => `mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-teal-600 text-white shadow-sm" : "hover:bg-slate-900 hover:text-white"}`;
export function AppLayout() {
<<<<<<< HEAD
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const admin = user?.roles.includes("SUPER_ADMIN");
  const leave = async () => {
    await logout();
    navigate("/login");
  };
  const nav = admin
    ? [
        {
          label: "MAIN",
          items: [["Dashboard", "/dashboard", LayoutDashboard]],
        },
        {
          label: "PATIENT MANAGEMENT",
          items: [
            ["Patients", "/admin/patients", Users],
            ["Register Patient", "/reception/patients/register", UserPlus],
          ],
        },
        {
          label: "CLINICAL",
          items: [
            ["Doctors", "/admin/doctors", Stethoscope],
            ["Departments", "/departments", Building2],
            ["Services", "/services", Tag],
          ],
        },
        {
          label: "FINANCE",
          items: [
            [
              "Registration Fees",
              "/admin/settings/registration-fee",
              WalletCards,
            ],
          ],
        },
        {
          label: "ADMINISTRATION",
          items: [
            ["Users", "/admin/users", UserCog],
            ["Audit Logs", "/audit-logs", ClipboardList],
            ["Settings", "/admin/settings/registration-fee", Settings],
          ],
        },
      ]
    : [
        {
          label: "MAIN",
          items: [["Dashboard", "/dashboard", LayoutDashboard]],
        },
        {
          label: "PATIENT MANAGEMENT",
          items: [
            ["Patients", "/reception/patients", Users],
            ["Register Patient", "/reception/patients/register", UserPlus],
            ["Patient Search", "/reception/patients/search", Search],
          ],
        },
      ];
  const title =
    location.pathname
      .split("/")
      .filter(Boolean)
      .slice(-1)[0]
      ?.replaceAll("-", " ") || "Dashboard";
  const sidebarClass = `${collapsed ? "md:w-[76px]" : "md:w-64"} ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"} fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-800 bg-slate-950 p-3 text-slate-300 transition-all duration-200`;
  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <aside className={sidebarClass}>
        <div className="flex h-14 items-center justify-between px-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <span className="grid h-9 min-w-9 place-items-center rounded-lg bg-teal-600 text-sm font-black text-white">
              H
            </span>
            {!collapsed && (
              <span>
                <b className="block text-sm text-white">HMS</b>
                <small className="block whitespace-nowrap text-[10px] text-slate-500">
                  Hospital Management
                </small>
              </span>
            )}
          </div>
          <button
            className="hidden rounded p-1 text-slate-400 hover:bg-slate-800 md:block"
            onClick={() => setCollapsed(!collapsed)}
            aria-label="Collapse sidebar"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        <nav className="mt-6 space-y-5">
          {nav.map((group) => (
            <section key={group.label}>
              <p
                className={`mb-2 px-3 text-[10px] font-bold tracking-widest text-slate-600 ${collapsed ? "hidden" : ""}`}
              >
                {group.label}
              </p>
              {group.items.map(([label, to, Icon]) => (
                <NavLink
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-teal-600 text-white shadow-sm" : "hover:bg-slate-900 hover:text-white"}`
                  }
                  key={`${label}-${to}`}
                  to={to}
                  title={collapsed ? label : undefined}
                >
                  <Icon size={iconSize} />
                  <span className={collapsed ? "hidden" : ""}>{label}</span>
                </NavLink>
              ))}
            </section>
          ))}
        </nav>
        <div
          className={`absolute bottom-5 left-3 right-3 rounded-lg bg-slate-900 p-3 ${collapsed ? "hidden" : ""}`}
        >
          <p className="text-xs font-semibold text-white">Need help?</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Hospital system support
          </p>
        </div>
      </aside>
      {mobileOpen && (
        <button
          className="fixed inset-0 z-30 bg-slate-950/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <main
        className={`${collapsed ? "md:ml-[76px]" : "md:ml-64"} min-h-screen transition-all duration-200`}
      >
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-7">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu size={20} />
            </button>
            <div>
              <p className="text-xs capitalize text-slate-400">
                Home / {title}
              </p>
              <p className="text-sm font-semibold capitalize text-slate-800">
                {title}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 lg:flex">
              <Search size={16} className="text-slate-400" />
              <input
                className="w-52 bg-transparent text-sm outline-none placeholder:text-slate-400"
                placeholder="Search patients, doctors..."
              />
            </label>
            <button
              className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Notifications"
            >
              <Bell size={19} />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-rose-500" />
            </button>
            <button
              className="ml-1 flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100"
              onClick={leave}
              title="Logout"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                {user?.firstName?.[0]}
                {user?.lastName?.[0]}
              </span>
              <span className="hidden text-left sm:block">
                <b className="block text-xs text-slate-800">
                  {user?.firstName} {user?.lastName}
                </b>
                <small className="block text-[10px] text-slate-500">
                  {user?.roles?.[0]}
                </small>
              </span>
            </button>
          </div>
        </header>
        <section className="p-4 md:p-7">
          <Outlet />
        </section>
      </main>
    </div>
  );
=======
  const { user, logout } = useAuth(); const navigate = useNavigate(); const location = useLocation(); const [collapsed, setCollapsed] = useState(false); const [mobileOpen, setMobileOpen] = useState(false);
  const admin = user?.roles?.includes("SUPER_ADMIN"); const lab = user?.roles?.includes("LAB_ATTENDANT");
  useEffect(() => setMobileOpen(false), [location.pathname]); useEffect(() => { const close = (e) => e.key === "Escape" && setMobileOpen(false); window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, []);
  const leave = async () => { await logout(); navigate("/login"); };
  const nav = admin ? [["MAIN", [["Dashboard", "/dashboard", LayoutDashboard]]], ["PATIENT MANAGEMENT", [["Patients", "/admin/patients", Users], ["Register Patient", "/reception/patients/register", UserPlus]]], ["CLINICAL", [["Doctors", "/admin/doctors", Stethoscope], ["Departments", "/departments", Building2], ["Services", "/services", Tag]]], ["FINANCE", [["Registration Fees", "/admin/settings/registration-fee", WalletCards]]], ["ADMINISTRATION", [["Users", "/admin/users", UserCog], ["Audit Logs", "/audit-logs", ClipboardList], ["Settings", "/admin/settings/registration-fee", Settings]]]] : lab ? [["MAIN", [["Dashboard", "/dashboard", LayoutDashboard]]], ["LABORATORY", [["Laboratory Services", "/laboratory/patients", FlaskConical]]]] : [["MAIN", [["Dashboard", "/dashboard", LayoutDashboard]]], ["PATIENT MANAGEMENT", [["Patients", "/reception/patients", Users], ["Register Patient", "/reception/patients/register", UserPlus], ["Patient Search", "/reception/patients/search", Search]]]];
  const title = location.pathname.split("/").filter(Boolean).at(-1)?.replaceAll("-", " ") || "Dashboard"; const sidebar = `${collapsed ? "md:w-[76px]" : "md:w-64"} ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"} fixed inset-y-0 left-0 z-40 w-64 overflow-y-auto border-r border-slate-800 bg-slate-950 p-3 text-slate-300 transition-all duration-200`;
  return <div className="min-h-screen overflow-x-hidden bg-[#f5f7fa]"><aside className={sidebar}><div className="flex h-14 items-center justify-between px-2"><div className="flex items-center gap-3 overflow-hidden"><span className="grid h-9 min-w-9 place-items-center rounded-lg bg-teal-600 text-sm font-black text-white">H</span>{!collapsed && <span><b className="block text-sm text-white">HMS</b><small className="block whitespace-nowrap text-[10px] text-slate-500">Hospital Management</small></span>}</div><button className="rounded p-1 text-slate-400 hover:bg-slate-800 md:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={18}/></button><button className="hidden rounded p-1 text-slate-400 hover:bg-slate-800 md:block" onClick={() => setCollapsed(!collapsed)} aria-label="Collapse sidebar">{collapsed ? <ChevronRight size={18}/> : <ChevronLeft size={18}/>}</button></div><nav className="mt-6 space-y-5">{nav.map(([group, items]) => <section key={group}><p className={`mb-2 px-3 text-[10px] font-bold tracking-widest text-slate-600 ${collapsed ? "hidden" : ""}`}>{group}</p>{items.map(([label, to, Icon], i) => <NavLink end key={`${label}-${i}`} to={to} onClick={() => setMobileOpen(false)} className={linkClass} title={collapsed ? label : undefined}><Icon size={18}/><span className={collapsed ? "hidden" : ""}>{label}</span></NavLink>)}</section>)}</nav></aside>{mobileOpen && <button className="fixed inset-0 z-30 bg-slate-950/50 md:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"/>}<main className={`${collapsed ? "md:ml-[76px]" : "md:ml-64"} min-h-screen min-w-0 transition-all duration-200`}><header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-7"><div className="flex items-center gap-3"><button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20}/></button><div><p className="text-xs capitalize text-slate-400">Home / {title}</p><p className="text-sm font-semibold capitalize text-slate-800">{title}</p></div></div><div className="flex items-center gap-2"><button className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Notifications"><Bell size={19}/></button><button className="ml-1 flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100" onClick={leave} title="Logout"><span className="grid h-8 w-8 place-items-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">{user?.firstName?.[0]}{user?.lastName?.[0]}</span><span className="hidden text-left sm:block"><b className="block text-xs text-slate-800">{user?.firstName} {user?.lastName}</b><small className="block text-[10px] text-slate-500">{user?.roles?.[0]}</small></span></button></div></header><section className="p-4 md:p-7"><Outlet/></section></main></div>;
>>>>>>> 1b6046d (Add Departments)
}
