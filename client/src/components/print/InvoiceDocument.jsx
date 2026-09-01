import { HospitalBrand } from "./HospitalBrand";
import { money } from "../../utils/money";
import {
  printDate,
  printDateTime,
  readableStatus,
} from "../../utils/print-format";

const Detail = ({ label, value }) =>
  value ? (
    <div className="print-detail">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  ) : null;

const statusClass = (status) =>
  status === "PAID"
    ? "print-status-paid"
    : status === "PARTIALLY_PAID"
      ? "print-status-partial"
      : "print-status-unpaid";

function A4Invoice({ data }) {
  const { hospital, patient, visit, bill, items, payments, totals } = data;
  return (
    <article id="print-root" className="print-document print-a4 invoice-sheet">
      <div className="invoice-accent" />
      <header className="invoice-header">
        <div>
          <HospitalBrand hospital={hospital} />
          <div className="invoice-contact">
            <p>{hospital.address}</p>
            <p>
              {[hospital.phone, hospital.alternatePhone]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p>
              {[hospital.email, hospital.website].filter(Boolean).join(" · ")}
            </p>
            {hospital.registrationNumber && (
              <p>Registration: {hospital.registrationNumber}</p>
            )}
          </div>
        </div>
        <div className="invoice-heading">
          <p className="invoice-type">INVOICE</p>
          <h1>{bill.billNumber}</h1>
          <dl>
            <Detail label="Visit" value={visit.visitNumber} />
            <Detail label="Issue date" value={printDate(bill.issueDate)} />
          </dl>
          <span className={`print-status ${statusClass(bill.paymentStatus)}`}>
            {readableStatus(bill.paymentStatus)}
          </span>
        </div>
      </header>

      <section className="invoice-information">
        <div>
          <h2>PATIENT INFORMATION</h2>
          <dl>
            <Detail label="Patient" value={patient.name} />
            <Detail label="Patient number" value={patient.patientNumber} />
            <Detail label="CNIC" value={patient.cnic} />
            <Detail label="Phone" value={patient.phone} />
            <Detail label="Father name" value={patient.fatherName} />
            <Detail
              label="Gender"
              value={patient.gender?.toLowerCase() || "Not specified"}
            />
            <Detail label="Address" value={patient.address} />
          </dl>
        </div>
        <div>
          <h2>VISIT INFORMATION</h2>
          <dl>
            <Detail label="Visit number" value={visit.visitNumber} />
            <Detail
              label="Visit sequence"
              value={`Visit #${visit.visitSequence}`}
            />
            <Detail label="Visit date" value={printDate(visit.visitDate)} />
            <Detail label="Doctor" value={visit.doctorName} />
            <Detail label="Created by" value={visit.createdBy} />
            <Detail
              label="Payment status"
              value={readableStatus(bill.paymentStatus)}
            />
          </dl>
        </div>
      </section>

      <section className="invoice-items-section">
        <table className="invoice-items">
          <thead>
            <tr>
              <th>Description</th>
              <th>Department</th>
              <th className="number-column">Qty</th>
              <th className="number-column">Unit Price</th>
              <th className="number-column">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.rowKey}>
                <td>
                  <b>{item.description}</b>
                  {item.code && <small>{item.code}</small>}
                </td>
                <td>{item.department}</td>
                <td className="number-column">{item.quantity}</td>
                <td className="number-column">
                  {item.feeType === "FREE"
                    ? "FREE"
                    : money(item.unitPrice, hospital.currency)}
                </td>
                <td className="number-column">
                  {money(item.totalAmount, hospital.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="invoice-summary-row">
        <div className="payment-summary">
          <h2>PAYMENT SUMMARY</h2>
          <dl>
            <Detail
              label="Amount paid"
              value={money(totals.amountPaid, hospital.currency)}
            />
            <Detail
              label="Balance due"
              value={money(totals.balanceDue, hospital.currency)}
            />
            <Detail
              label="Status"
              value={readableStatus(totals.paymentStatus)}
            />
            <Detail
              label="Latest method"
              value={payments[0]?.paymentMethod?.replaceAll("_", " ")}
            />
          </dl>
        </div>
        <div className="invoice-totals">
          <p>
            <span>Subtotal</span>
            <b>{money(totals.subtotal, hospital.currency)}</b>
          </p>
          <p>
            <span>Paid</span>
            <b>{money(totals.amountPaid, hospital.currency)}</b>
          </p>
          <p>
            <span>Balance Due</span>
            <b>{money(totals.balanceDue, hospital.currency)}</b>
          </p>
          <p className="grand-total">
            <span>Grand Total</span>
            <b>{money(totals.grossTotal, hospital.currency)}</b>
          </p>
          <span className={`print-status ${statusClass(totals.paymentStatus)}`}>
            {readableStatus(totals.paymentStatus)}
          </span>
        </div>
      </section>

      {payments.length > 0 && (
        <section className="invoice-payments">
          <h2>PAYMENTS</h2>
          <table>
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Date</th>
                <th>Method</th>
                <th>Received By</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.rowKey}>
                  <td>{payment.paymentNumber}</td>
                  <td>{printDateTime(payment.paidAt)}</td>
                  <td>{payment.paymentMethod.replaceAll("_", " ")}</td>
                  <td>{payment.receivedBy}</td>
                  <td>{money(payment.amount, hospital.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <footer className="invoice-footer">
        <p>{hospital.footerMessage}</p>
        <p>
          For billing inquiries: {hospital.phone}
          {hospital.email ? ` · ${hospital.email}` : ""}
        </p>
        {hospital.taxNumber && <p>NTN / Tax Number: {hospital.taxNumber}</p>}
      </footer>
    </article>
  );
}

function ThermalInvoice({ data, format }) {
  const { hospital, patient, visit, bill, items, totals } = data;
  return (
    <article
      id="print-root"
      className={`print-document thermal-receipt ${format === "58MM" ? "print-58" : "print-80"}`}
    >
      <header className="thermal-header">
        <HospitalBrand hospital={hospital} compact />
        <p>{hospital.address}</p>
        <p>{hospital.phone}</p>
      </header>
      <div className="thermal-divider" />
      <h1>RECEIPT</h1>
      <dl className="thermal-meta">
        <Detail label="Bill" value={bill.billNumber} />
        <Detail label="Visit" value={visit.visitNumber} />
        <Detail label="Patient" value={patient.name} />
        <Detail label="Patient ID" value={patient.patientNumber} />
        <Detail
          label="Gender"
          value={patient.gender?.toLowerCase() || "Not specified"}
        />
        <Detail label="Doctor" value={visit.doctorName} />
        <Detail label="Date" value={printDateTime(bill.issueDate)} />
      </dl>
      <div className="thermal-divider" />
      <section className="thermal-items">
        {items.map((item) => (
          <div className="thermal-item" key={item.rowKey}>
            <b>{item.description}</b>
            <p>
              <span>
                {item.quantity} ×{" "}
                {item.feeType === "FREE"
                  ? "FREE"
                  : money(item.unitPrice, hospital.currency)}
              </span>
              <strong>{money(item.totalAmount, hospital.currency)}</strong>
            </p>
          </div>
        ))}
      </section>
      <div className="thermal-divider" />
      <section className="thermal-totals">
        <p>
          <span>TOTAL</span>
          <b>{money(totals.grossTotal, hospital.currency)}</b>
        </p>
        <p>
          <span>PAID</span>
          <b>{money(totals.amountPaid, hospital.currency)}</b>
        </p>
        <p>
          <span>BALANCE</span>
          <b>{money(totals.balanceDue, hospital.currency)}</b>
        </p>
      </section>
      <p className={`thermal-status ${statusClass(totals.paymentStatus)}`}>
        {readableStatus(totals.paymentStatus)}
      </p>
      <div className="thermal-divider" />
      <footer>
        <p>{hospital.footerMessage}</p>
        <p>{hospital.phone}</p>
      </footer>
    </article>
  );
}

export function InvoiceDocument({ data, format }) {
  return format === "A4" ? (
    <A4Invoice data={data} />
  ) : (
    <ThermalInvoice data={data} format={format} />
  );
}
