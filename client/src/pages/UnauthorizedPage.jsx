import { ArrowLeft, LayoutDashboard, ShieldX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const readableRole = (role) =>
  role ? role.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Staff";

export function UnauthorizedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  return (
    <main className="grid min-h-screen place-items-center bg-[#f3f8f9] p-4">
      <section className="hms-modal-card w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl sm:p-10">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-rose-50 text-rose-700">
          <ShieldX aria-hidden="true" size={32} />
        </span>
        <p className="mt-6 text-sm font-bold tracking-[0.18em] text-rose-700">403</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Access Denied</h1>
        <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-600">You don't have permission to access this page.</p>
        {user && <p className="mt-5 text-sm text-slate-500">Signed in as <b className="text-slate-700">{readableRole(user.roles?.[0])}</b></p>}
        <div className="mt-7 flex flex-col-reverse justify-center gap-3 sm:flex-row">
          <button type="button" className="hms-button-secondary" onClick={() => navigate(-1)}><ArrowLeft size={17} /> Go Back</button>
          <button type="button" className="hms-button-primary" onClick={() => navigate("/dashboard", { replace: true })}><LayoutDashboard size={17} /> Dashboard</button>
        </div>
      </section>
    </main>
  );
}
