import { useCallback, useEffect, useState } from "react";
import { Building2, Edit3, Plus, Power, Search, X } from "lucide-react";
import { departmentService } from "../services/department.service";
import { useNotifications } from "../context/NotificationContext";

const blank = { name: "", code: "", description: "" };
export function DepartmentsPage() {
  const { confirm, notify } = useNotifications();
  const [data, setData] = useState({ departments: [], pagination: {} });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      setLoading(true);
      setData(
        (
          await departmentService.list({
            search: search || undefined,
            status,
            page: 1,
            limit: 100,
          })
        ).data.data,
      );
    } catch (e) {
      setError(e.response?.data?.message || "Unable to load departments.");
    } finally {
      setLoading(false);
    }
  }, [search, status]);
  useEffect(() => {
    void load();
  }, [load]);
  const save = async (event) => {
    event.preventDefault();
    try {
      if (form.id) await departmentService.update(form.id, form);
      else await departmentService.create(form);
      notify({ type: "success", title: form.id ? "Department Updated" : "Department Created", message: `${form.name} was saved successfully.` });
      setForm(null);
      setError("");
      await load();
    } catch (e) {
      setError(e.response?.data?.message || "Unable to save department.");
    }
  };
  const changeStatus = async (department) => {
    const approved = await confirm({
      title: `${department.isActive ? "Deactivate" : "Activate"} Department?`,
      message: `${department.name} will be marked ${department.isActive ? "inactive" : "active"}.`,
      confirmLabel: department.isActive ? "Deactivate" : "Activate",
      tone: department.isActive ? "danger" : "warning",
    });
    if (!approved) return;
    try {
      await departmentService.status(department.id, !department.isActive);
      notify({ type: "success", title: "Department Updated", message: `${department.name} is now ${department.isActive ? "inactive" : "active"}.` });
      await load();
    } catch (e) {
      setError(
        e.response?.data?.message || "Unable to update department status.",
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
            Departments
          </h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Manage hospital departments and service categories.
          </p>
        </div>
        <button className="hms-button-primary" onClick={() => setForm(blank)}>
          <Plus size={17} /> Add department
        </button>
      </section>
      <section className="hms-card flex flex-col gap-3 p-4 sm:flex-row">
        <label className="relative flex-1">
          <Search
            className="absolute left-3.5 top-3 text-slate-400"
            size={18}
          />
          <input
            className="hms-input mt-0 pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="Search department name or code"
          />
        </label>
        <select
          className="hms-input mt-0 sm:w-40"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
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
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div
              className="h-48 animate-pulse rounded-2xl bg-slate-200/70"
              key={i}
            />
          ))}
        </div>
      ) : data.departments.length ? (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.departments.map((department) => (
            <article className="hms-card p-5" key={department.id}>
              <div className="flex items-start justify-between">
                <span className="rounded-xl bg-teal-50 p-3 text-teal-700">
                  <Building2 size={21} />
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${department.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}
                >
                  {department.isActive ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>
              <h3 className="mt-5 font-bold text-slate-900">
                {department.name}
              </h3>
              <p className="mt-1 text-xs font-bold tracking-wider text-teal-700">
                {department.code}
              </p>
              <p className="mt-3 h-10 text-sm leading-5 text-slate-500">
                {department.description || "No description provided."}
              </p>
              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-sm font-semibold text-slate-700">
                  {department.serviceCount}{" "}
                  {department.serviceCount === 1 ? "service" : "services"}
                </span>
                <div className="flex gap-3">
                  <button
                    className="text-sm font-semibold text-teal-700"
                    onClick={() => setForm(department)}
                  >
                    <Edit3 size={15} className="mr-1 inline" /> Edit
                  </button>
                  <button
                    className="text-sm font-semibold text-slate-600"
                    onClick={() => changeStatus(department)}
                  >
                    <Power size={15} className="mr-1 inline" />
                    {department.isActive ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <section className="hms-card p-12 text-center">
          <Building2 className="mx-auto text-slate-300" size={34} />
          <h3 className="mt-3 font-bold text-slate-800">
            No departments found.
          </h3>
          <button
            className="mt-4 hms-button-primary"
            onClick={() => setForm(blank)}
          >
            Add department
          </button>
        </section>
      )}
      {form && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <form
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            onSubmit={save}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {form.id ? "Edit department" : "Add department"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Configure a hospital service category.
                </p>
              </div>
              <button type="button" onClick={() => setForm(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="mt-5 space-y-4">
              <label className="block text-sm font-semibold text-slate-700">
                Department name
                <input
                  required
                  className="hms-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Department code
                <input
                  required
                  className="hms-input uppercase"
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value.toUpperCase() })
                  }
                />
              </label>
              <label className="block text-sm font-semibold text-slate-700">
                Description
                <textarea
                  className="hms-input min-h-24"
                  value={form.description || ""}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </label>
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
                {form.id ? "Save changes" : "Create department"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
