import { FileText, Printer, ReceiptText, X } from "lucide-react";

const options = [
  ["A4", "A4 Invoice", "Best for records and PDF", FileText],
  ["80MM", "80mm Thermal", "Standard receipt printer", Printer],
  ["58MM", "58mm Thermal", "Compact receipt printer", ReceiptText],
];

export function PrintFormatDialog({
  open,
  value,
  onChange,
  onCancel,
  onContinue,
  title = "Print Bill",
}) {
  if (!open) return null;
  return (
    <div
      className="hms-modal-overlay fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"
      role="presentation"
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="print-format-title"
        className="hms-modal-card relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close print dialog"
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-100"
        >
          <X size={18} />
        </button>
        <p className="text-sm font-semibold text-teal-700">Select Format</p>
        <h2
          id="print-format-title"
          className="mt-1 text-2xl font-bold text-slate-900"
        >
          {title}
        </h2>
        <div className="mt-5 space-y-3">
          {options.map(([format, label, description, Icon]) => (
            <label
              key={format}
              className={`flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition ${value === format ? "border-teal-600 bg-teal-50" : "border-slate-200 hover:bg-slate-50"}`}
            >
              <input
                type="radio"
                name="printFormat"
                className="sr-only"
                checked={value === format}
                onChange={() => onChange(format)}
              />
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white text-teal-700 shadow-sm">
                <Icon size={20} />
              </span>
              <span className="flex-1">
                <b className="block text-sm text-slate-900">{label}</b>
                <small className="text-slate-500">{description}</small>
              </span>
              <span
                className={`h-4 w-4 rounded-full border-4 ${value === format ? "border-teal-600" : "border-slate-300"}`}
              />
            </label>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="hms-button-secondary"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="hms-button-primary"
            onClick={onContinue}
          >
            <Printer size={17} /> Preview
          </button>
        </div>
      </section>
    </div>
  );
}
