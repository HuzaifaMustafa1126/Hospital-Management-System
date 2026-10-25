import { useCallback, useEffect, useState } from "react";
import {
  Droplets,
  Edit3,
  FlaskConical,
  Hospital,
  Pill,
  Plus,
  Power,
  ScanLine,
  Scissors,
  Search,
  Tag,
  X,
} from "lucide-react";
import { departmentService } from "../services/department.service";
import { serviceService } from "../services/service.service";
import { useNotifications } from "../context/NotificationContext";

const blank = {
  name: "",
  code: "",
  departmentIds: [],
  description: "",
  price: "",
  isActive: true,
};
const money = (value) =>
  `PKR ${new Intl.NumberFormat().format(Number(value) || 0)}`;
const DepartmentIcon = ({ name, size = 19 }) => {
  const Icon = /lab/i.test(name)
    ? FlaskConical
    : /radiology/i.test(name)
      ? ScanLine
      : /surgery/i.test(name)
        ? Scissors
        : /blood/i.test(name)
          ? Droplets
          : /pharmacy/i.test(name)
            ? Pill
            : Hospital;
  return <Icon size={size} />;
};
export function ServicesPage() {
  const { confirm, notify } = useNotifications();
  const [data, setData] = useState({ services: [], pagination: {} });
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    departmentId: "",
    status: "all",
  });
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30d");
  const [analytics, setAnalytics] = useState({ total: 0, departments: [] });
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [services, departmentData] = await Promise.all([
        serviceService.list({
          ...filters,
          departmentId: filters.departmentId || undefined,
          search: filters.search || undefined,
          page: 1,
          limit: 100,
        }),
        departmentService.list({ status: "active", page: 1, limit: 100 }),
      ]);
      setData(services.data.data);
      setDepartments(departmentData.data.data.departments);
    } catch (e) {
      setError(e.response?.data?.message || "Unable to load services.");
    } finally {
      setLoading(false);
    }
  }, [filters]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    serviceService
      .analytics(range)
      .then((r) => setAnalytics(r.data.data))
      .catch((e) =>
        setError(
          e.response?.data?.message || "Unable to load service activity.",
        ),
      );
  }, [range]);
  const save = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        ...form,
        departmentIds: form.departmentIds.map(Number),
        price: Number(form.price),
      };
      if (form.id) await serviceService.update(form.id, payload);
      else await serviceService.create(payload);
      notify({ type: "success", title: form.id ? "Service Updated" : "Service Created", message: `${form.name} was saved successfully.` });
      setForm(null);
      setError("");
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Unable to save service.");
    }
  };
  const remove = async (service) => {
    try {
      const impact = (await serviceService.deletionImpact(service.id)).data.data;
      const approved = await confirm({ title: "Delete Service?", message: impact.canDelete ? `${service.name} has no historical usage and can be permanently deleted.` : `${service.name} has ${impact.dependencies.patientServices + impact.dependencies.shortStayOrders} historical record(s). It cannot be deleted; deactivate it instead.`, confirmLabel: impact.canDelete ? "Delete Permanently" : "Close", tone: "danger" });
      if (!approved || !impact.canDelete) return;
      await serviceService.remove(service.id); notify({ type: "success", title: "Service Deleted", message: `${service.name} was permanently deleted.` }); await load();
    } catch (e) { setError(e.response?.data?.message || "Unable to delete service."); }
  };
  const changeStatus = async (service) => {
    const action = service.isActive ? "Deactivate" : "Activate";
    const approved = await confirm({
      title: `${action} Service?`,
      message: service.isActive
        ? "This service will no longer be available for new patient service requests."
        : "This service will become available for new patient service requests.",
      confirmLabel: action,
      tone: service.isActive ? "danger" : "warning",
    });
    if (!approved) return;
    try {
      await serviceService.status(service.id, !service.isActive);
      notify({ type: "success", title: "Service Updated", message: `${service.name} is now ${service.isActive ? "inactive" : "active"}.` });
      await load();
    } catch (e) {
      setError(
        e.response?.data?.message ||
          `Unable to ${action.toLowerCase()} service.`,
      );
    }
  };
  return (
    <div className="space-y-5">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-teal-700">
            Clinical configuration
          </p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
            Services
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Manage hospital services and pricing.
          </p>
        </div>
        <button className="hms-button-primary" onClick={() => setForm(blank)}>
          <Plus size={17} /> Add service
        </button>
      </section>
      <section className="rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-50 to-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold text-teal-700">Service Activity</p><h3 className="text-2xl font-bold text-slate-900">{analytics.total} patient services added</h3><p className="text-sm text-slate-500">Actual usage from patient service records.</p></div><div className="flex gap-2">{[['today', 'Today'], ['7d', '7 Days'], ['30d', '30 Days']].map(([key, text]) => <button key={key} onClick={() => setRange(key)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${range === key ? 'bg-teal-600 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}>{text}</button>)}</div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{analytics.departments.slice(0, 4).map((item) => <div className="rounded-xl bg-white p-3 shadow-sm" key={item.department}><span className="flex items-center gap-2 text-teal-700"><DepartmentIcon name={item.department}/><b className="text-sm text-slate-700">{item.department}</b></span><p className="mt-2 text-xl font-bold">{item.total}</p></div>)}</div>
      </section>
      <section className="hms-card grid gap-3 p-4 lg:grid-cols-[1fr_190px_150px_auto]">
        <label className="relative">
          <Search
            className="absolute left-3.5 top-3 text-slate-400"
            size={18}
          />
          <input
            className="hms-input mt-0 pl-10"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="Search service name, code or description"
          />
        </label>
        <select
          className="hms-input mt-0"
          value={filters.departmentId}
          onChange={(e) =>
            setFilters({ ...filters, departmentId: e.target.value })
          }
        >
          <option value="">All departments</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
        <select
          className="hms-input mt-0"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <button className="hms-button-secondary" onClick={load}>
          Search
        </button>
      </section>
      {error && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </p>
      )}
      <section className="hms-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="font-bold text-slate-900">Service catalogue</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {data.pagination.total ?? 0} configured services
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[850px] w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Service</th>
                <th className="px-4 py-3.5">Code</th>
                <th className="px-4 py-3.5">Available Departments</th>
                <th className="px-4 py-3.5">Price</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Created</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    Loading services…
                  </td>
                </tr>
              ) : data.services.length ? (
                data.services.map((service) => (
                  <tr
                    className="transition hover:bg-slate-50/80"
                    key={service.id}
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3"><span className="rounded-lg bg-teal-50 p-2 text-teal-700"><DepartmentIcon name={service.departments[0]?.name || service.name}/></span><span><b className="block text-slate-800">{service.name}</b><small className="line-clamp-1 text-slate-500">{service.description || "No description"}</small></span></div>
                    </td>
                    <td className="px-4 py-4 font-semibold text-teal-700">
                      {service.code}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-xs font-semibold text-sky-700">{service.departments.map((department)=>department.name).join(", ") || "Not assigned"}</span>
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-800">
                      {money(service.price)}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${service.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                      >
                        {service.isActive ? "ACTIVE" : "INACTIVE"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-500">
                      {new Date(service.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        className="font-semibold text-teal-700"
                        onClick={() =>
                          setForm({
                            ...service,
                            departmentIds: service.departments.map((department)=>String(department.id)),
                            price: String(service.price),
                          })
                        }
                      >
                        <Edit3 size={15} className="mr-1 inline" />
                        Edit
                      </button>
                      <button
                        className="ml-4 font-semibold text-slate-600"
                        onClick={() => changeStatus(service)}
                      >
                        <Power size={15} className="mr-1 inline" />
                        {service.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button className="ml-4 font-semibold text-rose-600" onClick={() => void remove(service)}>Delete</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center">
                    <Tag className="mx-auto text-slate-300" size={32} />
                    <p className="mt-3 font-bold text-slate-800">
                      No services found.
                    </p>
                    <button
                      className="mt-4 hms-button-primary"
                      onClick={() => setForm(blank)}
                    >
                      Add service
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      {form && (
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/40 p-4">
          <form
            className="my-6 w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            onSubmit={save}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {form.id ? "Edit service" : "Add service"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Create a reusable hospital service configuration.
                </p>
              </div>
              <button type="button" onClick={() => setForm(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-slate-700">
                Service name
                <input
                  required
                  disabled={Boolean(form.id)}
                  className="hms-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">
                Service code
                <input
                  required
                  className="hms-input uppercase"
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value.toUpperCase() })
                  }
                />
              </label>
              <fieldset className="rounded-xl border border-slate-200 p-3 text-sm sm:col-span-2"><legend className="px-1 font-semibold text-slate-700">Available Departments</legend><label className="flex items-center gap-2 border-b pb-2"><input type="checkbox" checked={departments.length>0&&form.departmentIds.length===departments.length} onChange={(e)=>setForm({...form,departmentIds:e.target.checked?departments.map((department)=>String(department.id)):[]})}/> All Active Departments</label><div className="mt-3 grid gap-2 sm:grid-cols-2">{departments.map((department)=><label className="flex items-center gap-2" key={department.id}><input type="checkbox" checked={form.departmentIds.includes(String(department.id))} onChange={(e)=>setForm({...form,departmentIds:e.target.checked?[...form.departmentIds,String(department.id)]:form.departmentIds.filter((id)=>id!==String(department.id))})}/>{department.name}</label>)}</div></fieldset>
              <label className="text-sm font-semibold text-slate-700">
                Price (PKR)
                <input
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  className="hms-input"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </label>
              <label className="text-sm font-semibold text-slate-700 sm:col-span-2">
                Description
                <textarea
                  className="hms-input min-h-24"
                  value={form.description || ""}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </label>
              <label className="text-sm font-semibold text-slate-700">Status<select className="hms-input" value={form.isActive ? "active" : "inactive"} onChange={(e)=>setForm({...form,isActive:e.target.value==="active"})}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="hms-button-secondary"
                onClick={() => setForm(null)}
              >
                Cancel
              </button>
              <button className="hms-button-primary">
                {form.id ? "Save changes" : "Create service"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
