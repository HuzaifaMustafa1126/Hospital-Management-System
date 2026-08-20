import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { userService } from '../services/user.service';

export function UsersPage() {
  const [users, setUsers] = useState([]); const [error, setError] = useState('');
  const load = async () => { try { setUsers((await userService.list()).data.data); } catch (e) { setError(e.response?.data?.message || 'Unable to load users'); } };
  useEffect(() => { void load(); }, []);
  const changeStatus = async (user) => {
    if (!window.confirm(`${user.isActive ? 'Deactivate' : 'Activate'} ${user.email}?`)) return;
    try { await userService.status(user.id, !user.isActive); await load(); } catch (e) { setError(e.response?.data?.message || 'Unable to update user status'); }
  };
  return <><div className="mb-5 flex items-center justify-between"><h2 className="text-2xl font-bold">Users</h2><Link className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white" to="/users/new">Create User</Link></div>
    {error && <p className="mb-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Created At</th><th className="p-3">Actions</th></tr></thead><tbody>{users.map((user) => <tr className="border-t" key={user.id}><td className="p-3 font-medium">{user.firstName} {user.lastName}</td><td>{user.email}</td><td>{user.phone || '—'}</td><td>{user.roles?.join(', ') || '—'}</td><td>{user.isActive ? 'Active' : 'Inactive'}</td><td>{new Date(user.createdAt).toLocaleDateString()}</td><td className="p-3"><Link className="text-sky-700" to={`/users/${user.id}/edit`}>Edit</Link><button className="ml-3 text-slate-700" onClick={() => void changeStatus(user)}>{user.isActive ? 'Deactivate' : 'Activate'}</button></td></tr>)}</tbody></table></div>
  </>;
}
