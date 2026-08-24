import { useEffect, useState } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { PaymentReceiptDocument } from "../components/print/PaymentReceiptDocument";
import { billingService } from "../services/billing.service";

const formats = new Set(["A4", "80MM", "58MM"]);

export function PaymentReceiptPage() {
  const { id, paymentNumber } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedFormat = searchParams.get("format")?.toUpperCase();
  const [format, setFormat] = useState(
    formats.has(requestedFormat) ? requestedFormat : "80MM",
  );
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    billingService
      .paymentReceipt(id, paymentNumber)
      .then((response) => {
        setData(response.data.data);
        document.title = `${response.data.data.payment.paymentNumber} Receipt`;
      })
      .catch((requestError) =>
        setError(
          requestError.response?.data?.message ||
            "Unable to load payment receipt.",
        ),
      );
    return () => {
      document.title = "Hospital Management System";
    };
  }, [id, paymentNumber]);

  const changeFormat = (nextFormat) => {
    setFormat(nextFormat);
    setSearchParams({ format: nextFormat.toLowerCase() }, { replace: true });
  };
  const print = async () => {
    setPrinting(true);
    try {
      await billingService.recordPrint(id, {
        documentType: "PAYMENT_RECEIPT",
        format,
        paymentNumber,
      });
      window.print();
    } finally {
      setPrinting(false);
    }
  };

  if (error)
    return <p className="rounded-xl bg-rose-50 p-4 text-rose-700">{error}</p>;
  if (!data)
    return (
      <p className="hms-card p-8 text-slate-500">Preparing payment receipt…</p>
    );
  return (
    <div className="print-preview-page -m-4 min-h-screen bg-slate-200/70 p-4 md:-m-7 md:p-7">
      <div className="no-print mx-auto mb-5 flex max-w-4xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          className="hms-button-secondary"
          onClick={() => navigate(`/billing/${id}`)}
        >
          <ArrowLeft size={17} /> Back to Bill
        </button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="text-sm font-semibold text-slate-700">
            Print format
            <select
              className="hms-input ml-2 mt-0 w-auto"
              value={format}
              onChange={(event) => changeFormat(event.target.value)}
            >
              <option value="A4">A4 Receipt</option>
              <option value="80MM">80mm Thermal</option>
              <option value="58MM">58mm Thermal</option>
            </select>
          </label>
          <button
            type="button"
            disabled={printing}
            className="hms-button-primary"
            onClick={print}
          >
            <Printer size={17} /> {printing ? "Preparing…" : "Print Receipt"}
          </button>
        </div>
      </div>
      <div className="print-preview-scroll mx-auto overflow-x-auto pb-8">
        <PaymentReceiptDocument data={data} format={format} />
      </div>
    </div>
  );
}
