import { useCallback, useEffect, useState } from "react";
import { Search, Stethoscope, X } from "lucide-react";
import { doctorWorkflowService } from "../services/doctor-workflow.service";
import { useNotifications } from "../context/NotificationContext";
import { BaseModal } from "../components/BaseModal";

const emptyOrder = { medicineName: "", dose: "", route: "IV", quantity: "" };
const Field = ({ label, value }) => <div><dt className="hms-label">{label}</dt><dd className="mt-1 text-sm font-semibold text-slate-800">{value ?? "—"}</dd></div>;

export function DoctorDashboardPage() {
  const { notify } = useNotifications();
  const [visits, setVisits] = useState([]);
  const [search, setSearch] = useState("");
  const [details, setDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [form, setForm] = useState(emptyOrder);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => doctorWorkflowService.queue(search).then((response) => setVisits(response.data.data)).catch((requestError) => setError(requestError.response?.data?.message || "Unable to load queue.")), [search]);
  useEffect(() => { void load(); }, [load]);

  const openDetails = async (visit) => {
    setSelectedVisit(visit); setDetails(null); setActiveModal("patient-details"); setDetailsLoading(true); setError("");
    try { setDetails((await doctorWorkflowService.details(visit.id)).data.data); }
    catch (requestError) { setError(requestError.response?.data?.message || "Unable to load patient details."); }
    finally { setDetailsLoading(false); }
  };
  const startConsultation = async () => {
    try {
      await doctorWorkflowService.claim(details.visitId);
      const refreshed = (await doctorWorkflowService.details(details.visitId)).data.data;
      setDetails(refreshed); await load();
      notify({ type: "success", title: "Consultation started", message: `Visit #${details.visitNumber} is assigned to you.` });
    } catch (requestError) { setError(requestError.response?.data?.message || "Unable to claim visit."); setDetails(null); setActiveModal(null); await load(); }
  };
  const addOrder = async (event) => {
    event.preventDefault();
    if(saving)return; setSaving(true);
    try { await doctorWorkflowService.addOrder(selectedVisit.visitId || selectedVisit.id, form); notify({ type: "success", title: "Order created", message: "Short-stay order saved as ORDERED." }); setActiveModal(null); setForm(emptyOrder); await load(); }
    catch (requestError) { setError(requestError.response?.data?.message || "Unable to add order."); }
    finally { setSaving(false); }
  };
  const orderDirty=Boolean(form.medicineName||form.dose||form.quantity||form.route!=="IV");
  const closeOrder=()=>{if(orderDirty&&!window.confirm("Discard unsaved order?"))return;setActiveModal(null);setForm(emptyOrder);};
  const counts = (statuses) => visits.filter((visit) => statuses.includes(visit.status)).length;

  return <div className="space-y-5">
    <div><p className="text-sm font-semibold text-teal-700">Clinical workspace</p><h2 className="mt-1 text-3xl font-bold">Doctor Queue</h2></div>
    {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
    <section className="grid gap-3 sm:grid-cols-4">{[["Waiting", counts(["WAITING"])], ["In consultation", counts(["IN_CONSULTATION"])], ["Short stay", counts(["SHORT_STAY"])], ["Active total", visits.length]].map(([label, value]) => <div key={label} className="hms-card p-4"><p className="hms-label">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p></div>)}</section>
    <section className="hms-card p-4"><div className="flex gap-2"><label className="relative flex-1"><Search className="absolute left-3 top-3 text-slate-400" size={17}/><input className="hms-input mt-0 pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Patient number, CNIC, phone or name"/></label><button className="hms-button-secondary" onClick={load}>Search</button></div>
      <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="border-b text-slate-500"><th className="p-3">Patient</th><th>Department</th><th>Visit</th><th>Status</th><th>Action</th></tr></thead><tbody>{visits.map((visit) => <tr className="border-b border-slate-100" key={visit.id}><td className="p-3"><b>{visit.patientName}</b><small className="block text-slate-500">{visit.patientNumber}</small></td><td>{visit.departmentName}</td><td>#{visit.visitNumber}</td><td>{visit.status.replaceAll("_", " ")}</td><td><button className={visit.status === "WAITING" ? "hms-button-primary" : "hms-button-secondary"} onClick={() => openDetails(visit)}>{visit.status === "WAITING" ? "Open" : "View / Add Service"}</button></td></tr>)}</tbody></table>{!visits.length && <p className="p-8 text-center text-slate-500">No patients in your assigned queues.</p>}</div>
    </section>
    {activeModal === "patient-details" && detailsLoading && <BaseModal labelledBy="patient-loading-title" onClose={() => setActiveModal(null)} panelClassName="max-w-4xl"><div className="animate-pulse p-10 text-slate-500" id="patient-loading-title">Loading authorized patient details…</div></BaseModal>}
    {activeModal === "patient-details" && details && !detailsLoading && <BaseModal labelledBy="patient-details-title" onClose={() => setActiveModal(null)} panelClassName="max-w-5xl">
      <header className="sticky top-0 z-10 flex items-start justify-between border-b bg-white px-6 py-5"><div><h3 id="patient-details-title" className="text-2xl font-bold">Patient Details</h3><p className="mt-1 text-sm text-slate-500">{details.firstName} {details.lastName} · {details.patientNumber}</p><div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full bg-teal-50 px-3 py-1 text-teal-700">{details.departmentName}</span><span className="rounded-full bg-slate-100 px-3 py-1">Visit #{details.visitNumber}</span><span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">{details.status.replaceAll("_", " ")}</span></div></div><button aria-label="Close patient details" className="rounded-xl p-2 hover:bg-slate-100" onClick={() => setActiveModal(null)}><X/></button></header>
      <div className="space-y-5 overflow-y-auto bg-slate-50 p-6">
        <section className="rounded-2xl bg-white p-5"><h4 className="font-bold">Personal Information</h4><dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="First Name" value={details.firstName}/><Field label="Last Name" value={details.lastName}/><Field label="Father Name" value={details.fatherName}/><Field label="Age" value={details.age == null ? "Not recorded" : `${details.age} years`}/><Field label="Gender" value={details.gender}/><Field label="CNIC Number" value={details.cnic}/></dl></section>
        <section className="rounded-2xl bg-white p-5"><h4 className="font-bold">Contact Details</h4><dl className="mt-4 grid gap-4 sm:grid-cols-2"><Field label="Phone Number" value={details.phone}/><Field label="Address" value={details.address}/></dl></section>
        <section className="rounded-2xl bg-white p-5"><h4 className="font-bold">Current Visit Information</h4><dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Visit Number" value={`#${details.visitNumber}`}/><Field label="Department" value={details.departmentName}/><Field label="Visit Date" value={new Date(details.visitDate).toLocaleDateString()}/><Field label="Visit Status" value={details.status.replaceAll("_", " ")}/><Field label="Assigned Doctor" value={details.assignedDoctorName || "Not assigned"}/></dl></section>
        <section className="rounded-2xl bg-white p-5"><h4 className="font-bold">Doctor Services</h4>{details.services.length ? <div className="mt-3 space-y-2">{details.services.map((service) => <div key={`${service.serviceName}-${service.id}`} className="rounded-xl bg-slate-50 p-4 text-sm"><div className="flex justify-between"><b>{service.serviceName}</b><span>{service.status}</span></div>{service.medicineName && <p className="mt-2 text-slate-600">{service.medicineName} · {service.dose} · {service.route} · {service.quantity}</p>}{service.notes && <p className="mt-2 text-slate-600">{service.notes}</p>}</div>)}</div> : <p className="mt-3 text-sm text-slate-500">No services have been added for this visit.</p>}</section>
      </div>
      <footer className="sticky bottom-0 flex justify-end gap-3 border-t bg-white px-6 py-4"><button className="hms-button-secondary" onClick={() => setActiveModal(null)}>Close</button>{details.status === "WAITING" && <button className="hms-button-primary" onClick={startConsultation}>Start Consultation</button>}{details.isAssignedToCurrentDoctor && ["IN_CONSULTATION", "SHORT_STAY"].includes(details.status) && <button className="hms-button-primary" onClick={() => {setSelectedVisit(details);setActiveModal("short-stay");}}><Stethoscope size={16}/> Add Service</button>}</footer>
    </BaseModal>}
    {activeModal === "short-stay" && selectedVisit && <BaseModal labelledBy="short-stay-title" onClose={closeOrder} panelClassName="max-w-lg"><form onSubmit={addOrder} className="overflow-y-auto p-6"><div className="flex justify-between"><div><h3 id="short-stay-title" className="text-xl font-bold">Add Short Stay Order</h3><p className="text-sm text-slate-500">Visit #{selectedVisit.visitNumber} · {selectedVisit.firstName || selectedVisit.patientName} {selectedVisit.lastName || ""}</p></div><button type="button" onClick={closeOrder}><X/></button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-sm font-semibold sm:col-span-2">Medicine / injection / drip<input required className="hms-input" value={form.medicineName} onChange={(event) => setForm({...form, medicineName: event.target.value})}/></label><label className="text-sm font-semibold">Dose<input required className="hms-input" placeholder="e.g. 500 mg" value={form.dose} onChange={(event) => setForm({...form, dose: event.target.value})}/></label><label className="text-sm font-semibold">Route<select className="hms-input" value={form.route} onChange={(event) => setForm({...form, route: event.target.value})}><option value="IV">IV — Intravenous</option><option value="IM">IM — Intramuscular</option></select></label><label className="text-sm font-semibold sm:col-span-2">Quantity<input required className="hms-input" placeholder="e.g. 1 vial" value={form.quantity} onChange={(event) => setForm({...form, quantity: event.target.value})}/></label></div><p className="mt-4 text-xs text-slate-500">This creates an order only. It does not record administration or assign a price.</p><div className="mt-5 flex justify-end gap-2"><button type="button" className="hms-button-secondary" onClick={closeOrder}>Cancel</button><button disabled={saving} className="hms-button-primary">{saving ? "Adding…" : "Add Order"}</button></div></form></BaseModal>}
  </div>;
}
