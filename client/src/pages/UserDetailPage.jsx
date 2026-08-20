import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { userService } from '../services/user.service';

const roles = ['SUPER_ADMIN', 'RECEPTION', 'LAB_ATTENDANT', 'SURGERY_STAFF', 'BLOOD_BANK_STAFF', 'BILLING_STAFF'];
const blank = { firstName: '', lastName: '', email: '', phone: '', password: '', role: 'RECEPTION' };

export function UserDetailPage() {
  const { id } = useParams(); const navigate = useNavigate(); const creating = id === 'new';
  const [form, setForm] = useState(blank); const [error, setError] = useState(''); const [loading, setLoading] = useState(!creating);
  useEffect(() => {
    if (creating) return;
    userService.get(id).then((response) => { const user = response.data.data; setForm({ firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone || '', password: '', role: user.roles?.[0] || 'RECEPTION' }); }).catch((e) => setError(e.response?.data?.message || 'Unable to load user')).finally(() => setLoading(false));
  }, [creating, id]);
  const change = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => { event.preventDefault(); setError(''); try { if (creating) await userService.create(form); else { const { password, ...changes } = form; await userService.update(id, changes); } navigate('/users'); } catch (e) { setError(e.response?.data?.message || 'Unable to save user'); } };
  if (loading) return <p>Loading user…</p>;
  return <div className="max-w-2xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-2xl font-bold">{creating ? 'Create User' : 'Edit User'}</h2><Link className="text-sky-700" to="/users">Back to users</Link></div><form onSubmit={submit} className="grid gap-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:grid-cols-2">{error && <p className="rounded bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">{error}</p>}<label className="text-sm font-medium">First name<input className="mt-1 w-full rounded border p-2" name="firstName" value={form.firstName} onChange={change} required /></label><label className="text-sm font-medium">Last name<input className="mt-1 w-full rounded border p-2" name="lastName" value={form.lastName} onChange={change} required /></label><label className="text-sm font-medium">Email<input className="mt-1 w-full rounded border p-2" name="email" type="email" value={form.email} onChange={change} required /></label><label className="text-sm font-medium">Phone<input className="mt-1 w-full rounded border p-2" name="phone" value={form.phone} onChange={change} /></label>{creating && <label className="text-sm font-medium">Password<input className="mt-1 w-full rounded border p-2" name="password" type="password" minLength="8" value={form.password} onChange={change} required /></label>}<label className="text-sm font-medium">Role<select className="mt-1 w-full rounded border p-2" name="role" value={form.role} onChange={change}>{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select></label><button className="rounded-lg bg-sky-700 px-4 py-2 font-medium text-white sm:col-span-2">{creating ? 'Create User' : 'Save Changes'}</button></form></div>;
}
