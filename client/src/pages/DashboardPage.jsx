import { useAuth } from '../context/AuthContext';

export function DashboardPage() {
  const { user } = useAuth();
  const admin = user?.roles.includes('SUPER_ADMIN');
  return <><h2 className="text-2xl font-bold">{admin ? 'Administration dashboard' : 'Reception dashboard'}</h2>
    <p className="mt-1 text-slate-600">Welcome back, {user?.firstName}.</p>
    {admin ? <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {['Users', 'Roles', 'System status', 'Audit logs'].map((item) => <div key={item} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200"><p className="font-semibold">{item}</p><p className="mt-2 text-sm text-slate-500">Phase 1 foundation</p></div>)}
    </div> : <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50 p-6"><h3 className="font-semibold">Patient Registration</h3><p className="mt-2 text-sm text-slate-600">Register new patients, then search and view their locked registrations.</p></div>}
  </>;
}
