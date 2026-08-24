import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays } from "lucide-react";
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
      </section>
    </div>
  );
}
