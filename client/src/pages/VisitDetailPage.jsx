import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, CreditCard } from "lucide-react";
import { patientService } from "../services/patient.service";
export function VisitDetailPage() {
  const { id } = useParams();
  const [visit, setVisit] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    patientService
      .getVisit(id)
      .then((r) => setVisit(r.data.data))
      .catch((e) =>
        setError(e.response?.data?.message || "Unable to load visit."),
      );
  }, [id]);
  if (error)
    return <p className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>;
  if (!visit)
    return <p className="hms-card p-6 text-slate-500">Loading visit…</p>;
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600"
        to={`/patients/${visit.patientId}`}
      >
        <ArrowLeft size={16} /> Back to patient
      </Link>
      <section className="hms-card p-6">
        <p className="text-sm font-semibold text-teal-700">Patient Visit</p>
        <h2 className="mt-1 text-2xl font-bold">Visit #{visit.visitNumber}</h2>
        <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
          <CalendarDays size={16} />
          {new Date(visit.visitDate).toLocaleDateString()} · {visit.doctorName}
        </p>
        <dl className="mt-5 grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
          <div><dt className="hms-label">Patient</dt><dd className="mt-1 font-semibold">{visit.patientName}</dd></div>
          <div><dt className="hms-label">Patient ID</dt><dd className="mt-1 font-semibold">{visit.patientNumber}</dd></div>
          <div><dt className="hms-label">CNIC</dt><dd className="mt-1 font-semibold">{visit.patientCnic}</dd></div>
        </dl>
      </section>
      <section className="hms-card p-6">
        <h3 className="font-bold">Services</h3>
        {visit.services.length ? (
          visit.services.map((service) => (
            <p
              className="mt-3 rounded-lg bg-slate-50 p-3 text-sm"
              key={service.id}
            >
              <b>{service.serviceName}</b> · PKR {service.totalAmount}
            </p>
          ))
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            No services have been added to this visit.
          </p>
        )}
        <h3 className="mt-6 font-bold">Registration Fee</h3>
        {visit.payments.length ? (
          visit.payments.map((payment) => (
            <p
              className="mt-3 rounded-lg bg-slate-50 p-3 text-sm"
              key={payment.receiptNumber}
            >
              {payment.feeType} · PKR {payment.amount} · {payment.receiptNumber}
            </p>
          ))
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            No registration fee recorded for this visit.
          </p>
        )}
        <div className="mt-6 border-t border-slate-200 pt-4">
          <div className="flex justify-between text-sm"><span>Visit fee</span><b>{visit.feeType === "FREE" ? "FREE" : `PKR ${visit.visitFee}`}</b></div>
          <div className="mt-2 flex justify-between text-sm"><span>Services total</span><b>PKR {visit.servicesTotal}</b></div>
          <div className="mt-3 flex justify-between text-lg"><b>Total</b><b>PKR {visit.total}</b></div>
        </div>
        {visit.billId && <div className="mt-6 rounded-xl border border-slate-200 p-4"><h3 className="font-bold">Billing Summary</h3><div className="mt-3 grid gap-3 text-sm sm:grid-cols-3"><p>Gross Total<br/><b>PKR {visit.total}</b></p><p>Paid<br/><b>PKR {visit.amountPaid}</b></p><p>Balance<br/><b>PKR {visit.balanceDue}</b></p></div><p className="mt-3 text-sm font-bold text-teal-700">{visit.paymentStatus?.replaceAll("_"," ")}</p><Link className="hms-button-primary mt-4" to={`/billing/${visit.billId}`}><CreditCard size={16}/> View Bill</Link></div>}
      </section>
    </div>
  );
}
