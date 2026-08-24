import { HospitalBrand } from "./HospitalBrand";
import { money } from "../../utils/money";
import { printDateTime } from "../../utils/print-format";

const Row = ({ label, value, strong = false }) =>
  value !== "" && value != null ? (
    <div className="payment-receipt-row">
      <dt>{label}</dt>
      <dd className={strong ? "payment-receipt-strong" : ""}>{value}</dd>
    </div>
  ) : null;

export function PaymentReceiptDocument({ data, format }) {
  const { hospital, patient, visit, bill, payment } = data;
  const thermal = format !== "A4";
  return (
    <article
      id="print-root"
      className={`print-document payment-receipt ${thermal ? `thermal-receipt ${format === "58MM" ? "print-58" : "print-80"}` : "print-a4 payment-receipt-a4"}`}
    >
      <header className="payment-receipt-header">
        <HospitalBrand hospital={hospital} compact={thermal} />
        <div className="payment-receipt-contact">
          <p>{hospital.address}</p>
          <p>{hospital.phone}</p>
          <p>{hospital.email}</p>
        </div>
      </header>
      <div className="thermal-divider" />
      <div className="payment-receipt-title">
        <p>PAYMENT RECEIPT</p>
        <h1>{payment.paymentNumber}</h1>
      </div>
      <dl className="payment-receipt-details">
        <Row label="Patient" value={patient.name} />
        <Row label="Patient ID" value={patient.patientNumber} />
        <Row
          label="Visit"
          value={`${visit.visitNumber} · Visit #${visit.visitSequence}`}
        />
        <Row label="Bill" value={bill.billNumber} />
        <Row
          label="Amount Received"
          value={money(payment.amount, hospital.currency)}
          strong
        />
        <Row
          label="Method"
          value={payment.paymentMethod.replaceAll("_", " ")}
        />
        <Row label="Reference" value={payment.referenceNumber} />
        <Row label="Received By" value={payment.receivedBy} />
        <Row label="Date" value={printDateTime(payment.paidAt)} />
        <Row
          label="Remaining Balance"
          value={money(payment.remainingBalance, hospital.currency)}
          strong
        />
      </dl>
      <footer className="payment-receipt-footer">
        <p>{hospital.footerMessage}</p>
        <p>{hospital.phone}</p>
      </footer>
    </article>
  );
}
