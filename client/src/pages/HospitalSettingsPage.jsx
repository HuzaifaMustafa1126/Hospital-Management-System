import { useEffect, useState } from "react";
import { Building2, ImagePlus, Save } from "lucide-react";
import { HospitalBrand } from "../components/print/HospitalBrand";
import { useNotifications } from "../context/NotificationContext";
import { settingsService } from "../services/settings.service";

const fields = [
  ["name", "Hospital Name", true],
  ["shortName", "Hospital Short Name", true],
  ["address", "Hospital Address", true],
  ["phone", "Phone Number", true],
  ["alternatePhone", "Alternate Phone", false],
  ["email", "Email", true],
  ["website", "Website", false],
  ["registrationNumber", "Registration Number", false],
  ["taxNumber", "NTN / Tax Number", false],
  ["currency", "Currency", true],
  ["invoicePrefix", "Invoice Prefix", true],
  ["receiptPrefix", "Receipt Prefix", true],
];

export function HospitalSettingsPage() {
  const { notify } = useNotifications();
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    settingsService
      .hospital()
      .then((response) => setForm(response.data.data))
      .catch((requestError) =>
        setError(
          requestError.response?.data?.message ||
            "Unable to load hospital settings.",
        ),
      );
  }, []);
  const change = (event) =>
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  const selectLogo = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (
      !file.type.match(/^image\/(png|jpeg|svg\+xml|webp)$/) ||
      file.size > 45000
    ) {
      return setError(
        "Use a PNG, JPG, SVG, or WebP logo no larger than 45 KB.",
      );
    }
    const reader = new FileReader();
    reader.onload = () =>
      setForm((current) => ({ ...current, logoUrl: reader.result }));
    reader.readAsDataURL(file);
  };
  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await settingsService.updateHospital(form);
      setForm(response.data.data);
      notify({
        type: "success",
        title: "Hospital Settings Updated",
        message: "Invoice and receipt branding was saved successfully.",
      });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to update hospital settings.",
      );
    } finally {
      setSaving(false);
    }
  };
  if (error && !form)
    return <p className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>;
  if (!form)
    return (
      <p className="hms-card p-8 text-slate-500">Loading hospital settings…</p>
    );
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <section>
        <p className="text-sm font-semibold text-teal-700">
          Super Admin Settings
        </p>
        <h2 className="mt-1 text-3xl font-bold text-slate-900">
          Hospital Information
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Manage the branding and contact information printed on invoices and
          receipts.
        </p>
      </section>
      {error && (
        <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </p>
      )}
      <form onSubmit={save} className="grid gap-5 lg:grid-cols-[1fr_1.7fr]">
        <aside className="hms-card h-fit p-6">
          <div className="flex items-center gap-2">
            <Building2 className="text-teal-700" size={19} />
            <h3 className="font-bold">Print Branding</h3>
          </div>
          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
            <HospitalBrand hospital={form} />
          </div>
          <label className="hms-button-secondary mt-4 w-full cursor-pointer">
            <ImagePlus size={17} /> Upload Logo
            <input
              className="sr-only"
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={selectLogo}
            />
          </label>
          <label className="mt-4 block text-sm font-semibold">
            Logo URL or data URL
            <input
              className="hms-input"
              name="logoUrl"
              value={form.logoUrl}
              onChange={change}
              placeholder="Leave blank to use the HMS fallback mark"
            />
          </label>
          {form.logoUrl && (
            <button
              type="button"
              className="mt-3 text-sm font-semibold text-rose-700"
              onClick={() => setForm({ ...form, logoUrl: "" })}
            >
              Remove custom logo
            </button>
          )}
        </aside>
        <section className="hms-card grid gap-4 p-6 sm:grid-cols-2">
          {fields.map(([name, label, required]) => (
            <label
              className={`text-sm font-semibold ${name === "address" ? "sm:col-span-2" : ""}`}
              key={name}
            >
              {label}
              <input
                required={required}
                className="hms-input"
                name={name}
                value={form[name] || ""}
                onChange={change}
              />
            </label>
          ))}
          <label className="text-sm font-semibold sm:col-span-2">
            Invoice Footer
            <textarea
              required
              maxLength="1000"
              className="hms-input min-h-28"
              name="footerMessage"
              value={form.footerMessage || ""}
              onChange={change}
            />
          </label>
          <div className="sm:col-span-2 flex justify-end">
            <button disabled={saving} className="hms-button-primary">
              <Save size={17} /> {saving ? "Saving…" : "Save Hospital Settings"}
            </button>
          </div>
        </section>
      </form>
    </div>
  );
}
