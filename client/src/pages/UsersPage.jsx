import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { userService } from "../services/user.service";
import { useNotifications } from "../context/NotificationContext";

export function UsersPage() {
  const { confirm, prompt, notify } = useNotifications();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const load = async () => {
    try {
      setUsers((await userService.list()).data.data);
    } catch (e) {
      setError(e.response?.data?.message || "Unable to load users");
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const changeStatus = async (user) => {
    const approved = await confirm({
      title: `${user.isActive ? "Deactivate" : "Activate"} User?`,
      message: user.isActive
        ? "This user will no longer be able to sign in."
        : "This user will regain access to the hospital system.",
      confirmLabel: user.isActive ? "Deactivate" : "Activate",
      tone: user.isActive ? "danger" : "warning",
    });
    if (!approved) return;
    try {
      await userService.status(user.id, !user.isActive);
      notify({ type: "success", title: "User Updated", message: `${user.email} is now ${user.isActive ? "inactive" : "active"}.` });
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Unable to update user status");
    }
  };
  const resetPassword = async (user) => {
    const password = await prompt({
      title: "Reset Password",
      message: `Set a new password for ${user.email}.`,
      label: "New password",
      inputType: "password",
      minLength: 8,
      confirmLabel: "Reset Password",
    });
    if (!password) return;
    if (password.length < 8)
      return setError("Password must be at least 8 characters.");
    try {
      await userService.resetPassword(user.id, password);
      setError("");
      notify({ type: "success", title: "Password Reset", message: `The password for ${user.email} was reset successfully.` });
    } catch (e) {
      setError(e.response?.data?.message || "Unable to reset password");
    }
  };
  const badge = {
    SUPER_ADMIN: "bg-violet-100 text-violet-800",
    RECEPTION: "bg-sky-100 text-sky-800",
    LAB_ATTENDANT: "bg-emerald-100 text-emerald-800",
    SURGERY_STAFF: "bg-amber-100 text-amber-800",
    BLOOD_BANK_STAFF: "bg-rose-100 text-rose-800",
    BILLING_STAFF: "bg-slate-200 text-slate-800",
  };
  return (
    <>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="mt-1 text-slate-600">
            Manage hospital staff accounts and access.
          </p>
        </div>
        <Link
          className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white"
          to="/admin/users/create"
        >
          + Create User
        </Link>
      </div>
      {error && (
        <p className="mb-4 rounded bg-red-50 p-3 text-red-700">{error}</p>
      )}
      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-3">User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr className="border-t" key={user.id}>
                <td className="p-3 font-medium">
                  {user.firstName} {user.lastName}
                </td>
                <td>{user.email}</td>
                <td>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${badge[user.roles?.[0]] || "bg-slate-100 text-slate-700"}`}
                  >
                    {user.roles?.[0] || "—"}
                  </span>
                </td>
                <td>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium ${user.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"}`}
                  >
                    {user.isActive ? "ACTIVE" : "INACTIVE"}
                  </span>
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                <td className="p-3">
                  <Link
                    className="text-sky-700"
                    to={`/admin/users/${user.id}/edit`}
                  >
                    Edit
                  </Link>
                  <button
                    className="ml-3 text-slate-700"
                    onClick={() => void changeStatus(user)}
                  >
                    {user.isActive ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    className="ml-3 text-slate-700"
                    onClick={() => void resetPassword(user)}
                  >
                    Reset password
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
