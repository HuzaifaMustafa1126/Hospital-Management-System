import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { Printer, Search, Receipt } from "lucide-react";
import { billingService } from "../services/billing.service";
import { money } from "../utils/money";
import { PrintFormatDialog } from "../components/print/PrintFormatDialog";
import { useAuth } from "../context/AuthContext";
const badge = {
  UNPAID: "bg-rose-50 text-rose-700",
  PARTIALLY_PAID: "bg-amber-50 text-amber-700",
  PAID: "bg-emerald-50 text-emerald-700",
};
export function BillingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const canPrint = user?.permissions.includes("BILL_PRINT");
  const [search, setSearch] = useState(""),
    [status, setStatus] = useState("ALL"),
    [data, setData] = useState({ items: [] }),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [printBill, setPrintBill] = useState(null),
    [printFormat, setPrintFormat] = useState("A4");
  useEffect(() => {
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await billingService.list({ search, status });
        setData(response.data.data);
        setError("");
      } catch (requestError) {
        setError(
          requestError.response?.data?.message || "Unable to load bills.",
        );
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, status]);
  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-semibold text-teal-700">Visit billing</p>
        <h2 className="mt-1 text-3xl font-bold">Billing</h2>
        <p className="mt-1 text-sm text-slate-500">
          Search visit bills and manage permitted payments.
        </p>
      </section>
      <section className="hms-card grid gap-3 p-4 sm:grid-cols-[1fr_auto]">
        <label className="relative">
          <Search className="absolute left-3 top-3 text-slate-400" size={17} />
          <input
            className="hms-input mt-0 pl-9"
            placeholder="Patient, CNIC, visit or bill number..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {["ALL", "UNPAID", "PARTIALLY_PAID", "PAID"].map((item) => (
            <button
              className={`rounded-lg px-3 py-2 text-xs font-bold ${status === item ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-600"}`}
              onClick={() => setStatus(item)}
              key={item}
            >
              {item.replaceAll("_", " ")}
            </button>
          ))}
        </div>
      </section>
      {error && (
        <p className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>
      )}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }, (_, index) => (
            <div
              className="h-16 animate-pulse rounded-xl bg-slate-200"
              key={index}
            />
          ))}
        </div>
      ) : data.items.length ? (
        <section className="hms-card overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {[
                  "Bill Number",
                  "Patient",
                  "Visit",
                  "Date",
                  "Gross Total",
                  "Paid",
                  "Balance",
                  "Status",
                  "",
                ].map((column, index) => (
                  <th
                    className="whitespace-nowrap px-5 py-3"
                    key={`${column}-${index}`}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map((bill) => (
                <tr className="border-t border-slate-100" key={bill.id}>
                  <td className="whitespace-nowrap px-5 py-4 font-bold">
                    {bill.billNumber}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <b>{bill.patientName}</b>
                    <small className="block text-slate-500">
                      {bill.patientNumber}
                    </small>
                  </td>
                  <td className="px-5 py-4">#{bill.visitNumber}</td>
                  <td className="whitespace-nowrap px-5 py-4">
                    {new Date(bill.visitDate).toLocaleDateString()}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    {money(bill.grossTotal)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    {money(bill.amountPaid)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 font-semibold">
                    {money(bill.balanceDue)}
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-bold ${badge[bill.paymentStatus]}`}
                    >
                      {bill.paymentStatus.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <Link
                      className="font-semibold text-teal-700"
                      to={`/billing/${bill.id}`}
                    >
                      View
                    </Link>
                    {canPrint && (
                      <button
                        type="button"
                        className="ml-4 inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-teal-700"
                        onClick={() => setPrintBill(bill)}
                      >
                        <Printer size={14} /> Print
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <div className="hms-card p-12 text-center text-slate-500">
          <Receipt className="mx-auto mb-3" />
          No bills match the selected filters.
        </div>
      )}
      <PrintFormatDialog
        open={Boolean(printBill)}
        value={printFormat}
        onChange={setPrintFormat}
        onCancel={() => setPrintBill(null)}
        onContinue={() => {
          const billId = printBill.id;
          setPrintBill(null);
          navigate(
            `/billing/${billId}/invoice?format=${printFormat.toLowerCase()}`,
          );
        }}
      />
    </div>
  );
}
