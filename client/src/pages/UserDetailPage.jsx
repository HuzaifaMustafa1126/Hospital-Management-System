import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { userService } from "../services/user.service";
import { roleService } from "../services/role.service";
import { departmentService } from "../services/department.service";
import { useNotifications } from "../context/NotificationContext";

const blank = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  roleIds: [], departmentIds: [], status: "ACTIVE",
};

export function UserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useNotifications();
  const creating = !id || id === "new";
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!creating);
  const [saving, setSaving] = useState(false);
  const [roles,setRoles]=useState([]); const [departments,setDepartments]=useState([]);
  useEffect(() => {
    Promise.all([roleService.list(),departmentService.list({status:'active',page:1,limit:100})]).then(([roleResponse,departmentResponse])=>{setRoles(roleResponse.data.data.filter((role)=>role.isActive));setDepartments(departmentResponse.data.data.departments);}).catch(()=>{});
    if (creating) { setLoading(false); return; }
    userService
      .get(id)
      .then((response) => {
        const user = response.data.data;
        setForm({
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone || "",
          password: "",
          confirmPassword: "",
          roleIds: user.roleRecords?.map((role)=>role.id)||[], departmentIds:user.departments?.map((department)=>department.id)||[], status:user.status,
        });
      })
      .catch((e) =>
        setError(e.response?.data?.message || "Unable to load user"),
      )
      .finally(() => setLoading(false));
  }, [creating, id]);
  const change = (event) =>
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (creating && form.password !== form.confirmPassword)
      return setError("Passwords do not match.");
    setSaving(true);
    try {
      if (creating) {
        const { confirmPassword, ...data } = form;
        await userService.create(data);
      } else {
        const { password, confirmPassword, status, roleIds, departmentIds, ...changes } = form;
        await userService.update(id, changes);
        await userService.roles(id,roleIds); await userService.departments(id,departmentIds); await userService.status(id,status);
      }
      notify({
        type: "success",
        title: creating ? "User Created" : "User Updated",
        message: `${form.firstName} ${form.lastName} was saved successfully.`,
      });
      navigate("/admin/users");
    } catch (e) {
      setError(e.response?.data?.message || "Unable to save user");
    } finally {
      setSaving(false);
    }
  };
  if (loading) return <p>Loading user…</p>;
  return (
    <div className="max-w-2xl">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          {creating ? "Create User" : "Edit User"}
        </h2>
        <Link className="text-sky-700" to="/admin/users">
          Back to users
        </Link>
      </div>
      <form
        onSubmit={submit}
        className="grid gap-4 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:grid-cols-2"
      >
        {error && (
          <p className="rounded bg-red-50 p-3 text-sm text-red-700 sm:col-span-2">
            {error}
          </p>
        )}
        <label className="text-sm font-medium">
          First name
          <input
            className="mt-1 w-full rounded border p-2"
            name="firstName"
            value={form.firstName}
            onChange={change}
            required
          />
        </label>
        <label className="text-sm font-medium">
          Last name
          <input
            className="mt-1 w-full rounded border p-2"
            name="lastName"
            value={form.lastName}
            onChange={change}
            required
          />
        </label>
        <label className="text-sm font-medium">
          Email
          <input
            className="mt-1 w-full rounded border p-2"
            name="email"
            type="email"
            value={form.email}
            onChange={change}
            required
          />
        </label>
        <label className="text-sm font-medium">
          Phone
          <input
            className="mt-1 w-full rounded border p-2"
            name="phone"
            value={form.phone}
            onChange={change}
          />
        </label>
        {creating && (
          <>
            <label className="text-sm font-medium">
              Password
              <input
                className="mt-1 w-full rounded border p-2"
                name="password"
                type="password"
                minLength="10"
                value={form.password}
                onChange={change}
                required
              />
            </label>
            <label className="text-sm font-medium">
              Confirm Password
              <input
                className="mt-1 w-full rounded border p-2"
                name="confirmPassword"
                type="password"
                minLength="10"
                value={form.confirmPassword}
                onChange={change}
                required
              />
            </label>
          </>
        )}
        <fieldset className="sm:col-span-2"><legend className="text-sm font-medium">Roles</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{roles.map((role)=><label className="rounded-lg border p-3 text-sm" key={role.id}><input className="mr-2" type="checkbox" checked={form.roleIds.includes(role.id)} onChange={()=>setForm((current)=>({...current,roleIds:current.roleIds.includes(role.id)?current.roleIds.filter((idValue)=>idValue!==role.id):[...current.roleIds,role.id]}))}/>{role.name}</label>)}</div></fieldset>
        <fieldset className="sm:col-span-2"><legend className="text-sm font-medium">Departments</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{departments.map((department)=><label className="rounded-lg border p-3 text-sm" key={department.id}><input className="mr-2" type="checkbox" checked={form.departmentIds.includes(department.id)} onChange={()=>setForm((current)=>({...current,departmentIds:current.departmentIds.includes(department.id)?current.departmentIds.filter((idValue)=>idValue!==department.id):[...current.departmentIds,department.id]}))}/>{department.name}</label>)}</div></fieldset>
        <label className="text-sm font-medium">
          Status
          <select
            className="mt-1 w-full rounded border p-2"
            name="status"
            value={form.status}
            onChange={change}
          >
            <option value="ACTIVE">ACTIVE</option><option value="INACTIVE">INACTIVE</option><option value="SUSPENDED">SUSPENDED</option>
          </select>
        </label>
        <button disabled={saving} className="rounded-lg bg-sky-700 px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 sm:col-span-2">
          {saving ? "Saving…" : creating ? "Create User" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
