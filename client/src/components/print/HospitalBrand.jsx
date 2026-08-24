import { useState } from "react";

export function HospitalBrand({ hospital, compact = false }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = hospital.logoUrl && !logoFailed;
  return (
    <div className={`print-brand ${compact ? "print-brand-compact" : ""}`}>
      {showLogo ? (
        <img
          className="print-logo"
          src={hospital.logoUrl}
          alt={`${hospital.name} logo`}
          onError={() => setLogoFailed(true)}
        />
      ) : (
        <span className="print-logo-fallback" aria-hidden="true">
          {hospital.shortName?.[0] || "H"}
        </span>
      )}
      <div>
        <p className="print-hospital-name">
          {hospital.name || "Hospital Management System"}
        </p>
        {!compact && hospital.shortName && (
          <p className="print-hospital-short">{hospital.shortName}</p>
        )}
      </div>
    </div>
  );
}
