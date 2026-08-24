import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Search, Trash2 } from "lucide-react";
import { doctorService } from "../services/doctor.service";
import { patientService } from "../services/patient.service";
import { serviceService } from "../services/service.service";
import { settingsService } from "../services/settings.service";
import { useNotifications } from "../context/NotificationContext";

const money = (amount) => `PKR ${Number(amount || 0).toLocaleString()}`;

export function NewVisitPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useNotifications();
  const [patient, setPatient] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [services, setServices] = useState([]);
  const [configuredFee, setConfiguredFee] = useState(null);
  const [form, setForm] = useState({ doctorId: "", feeType: "FREE", visitFee: "", paymentMethod: "CASH" });
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      patientService.get(id),
      doctorService.list(),
      serviceService.list({ status: "active", limit: 100 }),
      settingsService.registrationFee(),
    ])
      .then(([patientResponse, doctorResponse, serviceResponse, feeResponse]) => {
        const loadedPatient = patientResponse.data.data;
        setPatient(loadedPatient);
        setForm((current) => ({ ...current, doctorId: String(loadedPatient.doctor.id) }));
        setDoctors(doctorResponse.data.data.filter((doctor) => doctor.isActive));
        setServices(serviceResponse.data.data.services);
        setConfiguredFee(Number(feeResponse.data.data.amount));
      })
      .catch((requestError) => setError(requestError.response?.data?.message || "Unable to load the new visit form."));
  }, [id]);

  const selected = useMemo(() => services.filter((service) => selectedIds.includes(service.id)), [services, selectedIds]);
  const visibleServices = services.filter((service) => `${service.name} ${service.code} ${service.department.name}`.toLowerCase().includes(search.toLowerCase()));
  const feeAmount = form.feeType === "FREE" ? 0 : form.feeType === "ACTUAL" ? Number(configuredFee || 0) : Number(form.visitFee || 0);
  const servicesTotal = selected.reduce((sum, service) => sum + service.price, 0);
  const toggleService = (serviceId) => setSelectedIds((ids) => ids.includes(serviceId) ? ids.filter((idValue) => idValue !== serviceId) : [...ids, serviceId]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.doctorId) return setError("Select a doctor.");
    if (form.feeType === "DISCOUNTED" && (!Number.isFinite(feeAmount) || feeAmount < 0 || feeAmount > configuredFee))
      return setError(`Visit fee must be between PKR 0 and PKR ${configuredFee}.`);
    setSaving(true);
    try {
      const response = await patientService.createVisit(id, {
        doctorId: Number(form.doctorId), paymentMethod: form.paymentMethod,
        feeType: form.feeType, visitFee: feeAmount, serviceIds: selectedIds,
      });
      notify({ type: "success", title: "Visit Created", message: `Visit #${response.data.data.visitNumber} was created successfully.` });
      navigate(`/visits/${response.data.data.id}`, { state: { created: true } });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to create visit.");
    } finally { setSaving(false); }
  };

  if (!patient && !error) return <p className="hms-card p-6 text-slate-500">Loading new visit…</p>;
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600" to={`/patients/${id}`}><ArrowLeft size={16} /> Back to patient</Link>
      <form onSubmit={submit} className="space-y-5">
        <section className="hms-card p-6">
          <p className="text-sm font-semibold text-teal-700">Returning patient</p>
          <h2 className="mt-1 text-3xl font-bold text-slate-900">New Visit</h2>
          {error && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          {patient && <dl className="mt-5 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-4">
            {[['Patient ID', patient.patientNumber], ['Patient Name', `${patient.firstName} ${patient.lastName}`], ['CNIC', patient.cnic], ['Phone', patient.phone]].map(([label, value]) => <div key={label}><dt className="hms-label">{label}</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{value}</dd></div>)}
          </dl>}
        </section>
        <section className="hms-card grid gap-5 p-6 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">Doctor<select required className="hms-input" value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })}><option value="">Select doctor</option>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>Dr. {doctor.firstName} {doctor.lastName}{doctor.specialization ? ` — ${doctor.specialization}` : ''}</option>)}</select></label>
          <label className="text-sm font-semibold text-slate-700">Payment method<select className="hms-input" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}><option value="CASH">Cash</option><option value="CARD">Card</option><option value="BANK_TRANSFER">Bank transfer</option><option value="OTHER">Other</option></select></label>
          <fieldset className="sm:col-span-2"><legend className="text-sm font-semibold text-slate-700">Fee Type</legend><div className="mt-2 flex flex-wrap gap-3">{['FREE', 'ACTUAL', 'DISCOUNTED'].map((type) => <label key={type} className={`cursor-pointer rounded-xl border px-5 py-3 text-sm font-bold ${form.feeType === type ? 'border-teal-600 bg-teal-50 text-teal-800' : 'border-slate-200'}`}><input className="sr-only" type="radio" name="feeType" value={type} checked={form.feeType === type} onChange={(e) => setForm({ ...form, feeType: e.target.value, visitFee: '' })} />{type === 'ACTUAL' ? `ACTUAL — ${money(configuredFee)}` : type}</label>)}</div></fieldset>
          {form.feeType === 'DISCOUNTED' && <label className="text-sm font-semibold text-slate-700 sm:col-span-2">Registration / Visit Fee<input required min="0" max={configuredFee ?? undefined} step="0.01" type="number" className="hms-input" value={form.visitFee} onChange={(e) => setForm({ ...form, visitFee: e.target.value })} /><span className="mt-1 block text-xs font-normal text-slate-500">Maximum configured fee: {money(configuredFee)}</span></label>}
        </section>
        <section className="hms-card p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-bold text-slate-900">Add Services</h3><p className="text-sm text-slate-500">Select one or more active services.</p></div><label className="relative"><Search className="absolute left-3 top-3 text-slate-400" size={16} /><input className="hms-input mt-0 pl-9" placeholder="Search service…" value={search} onChange={(e) => setSearch(e.target.value)} /></label></div>
          <div className="mt-4 grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2">{visibleServices.map((service) => <label key={service.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-3"><input type="checkbox" checked={selectedIds.includes(service.id)} onChange={() => toggleService(service.id)} /><span className="min-w-0 flex-1"><b className="block truncate text-sm">{service.name}</b><small className="text-slate-500">{service.department.name}</small></span><b className="text-sm">{money(service.price)}</b></label>)}</div>
          {selected.length > 0 && <div className="mt-6"><h4 className="text-sm font-bold">Selected Services</h4><div className="mt-2 divide-y divide-slate-100 rounded-xl bg-slate-50 px-4">{selected.map((service) => <div key={service.id} className="flex items-center gap-3 py-3 text-sm"><span className="flex-1 font-medium">{service.name}</span><span>{money(service.price)}</span><button type="button" aria-label={`Remove ${service.name}`} onClick={() => toggleService(service.id)} className="text-rose-600"><Trash2 size={16} /></button></div>)}</div></div>}
        </section>
        <section className="hms-card p-6"><h3 className="font-bold">Visit Summary</h3><div className="mt-4 space-y-2 text-sm"><div className="flex justify-between"><span>Visit Fee</span><b>{form.feeType === 'FREE' ? 'FREE' : money(feeAmount)}</b></div>{selected.map((service) => <div key={service.id} className="flex justify-between text-slate-600"><span>{service.name}</span><span>{money(service.price)}</span></div>)}<div className="flex justify-between border-t border-slate-200 pt-3 text-base"><b>Total</b><b>{money(feeAmount + servicesTotal)}</b></div></div><div className="mt-6 flex justify-end gap-3"><Link className="hms-button-secondary" to={`/patients/${id}`}>Cancel</Link><button disabled={saving || configuredFee === null} className="hms-button-primary">{saving ? 'Creating…' : 'Create Visit'}</button></div></section>
      </form>
    </div>
  );
}
