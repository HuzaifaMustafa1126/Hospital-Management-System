import { useEffect, useState } from "react";
import { settingsService } from "../services/settings.service";
import { useNotifications } from "../context/NotificationContext";
export function RegistrationFeeSettingsPage() {
  const { confirm, notify } = useNotifications();
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    settingsService
      .registrationFee()
      .then((response) => setAmount(String(response.data.data.amount)))
      .catch((requestError) =>
        setError(
          requestError.response?.data?.message ||
            "Unable to load registration fee.",
        ),
      );
  }, []);
  const save = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0)
      return setError("Enter a registration fee greater than zero.");
    const approved = await confirm({
      title: "Change Registration Fee?",
      message:
        "This change will affect new visits and registrations only. Existing payments will not change.",
      confirmLabel: "Update Fee",
      tone: "warning",
    });
    if (!approved) return;
    setSaving(true);
    try {
      const response = await settingsService.updateRegistrationFee(value);
      setAmount(String(response.data.data.amount));
      setMessage("Registration fee updated.");
      notify({
        type: "success",
        title: "Registration Fee Updated",
        message: `The registration fee is now PKR ${Number(response.data.data.amount).toLocaleString("en-PK")}.`,
      });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to update registration fee.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="max-w-xl">
      <h2 className="text-2xl font-bold">Registration Fee Settings</h2>
      <form
        onSubmit={save}
        className="mt-5 rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200"
      >
        {error && (
          <p className="mb-4 rounded bg-red-50 p-3 text-red-700">{error}</p>
        )}
        {message && (
          <p className="mb-4 rounded bg-emerald-50 p-3 text-emerald-700">
            {message}
          </p>
        )}
        <label className="text-sm font-medium">
          Registration Fee (PKR)
          <input
            className="mt-1 w-full rounded border p-2"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <p className="mt-3 text-sm text-amber-700">
          Changing the registration fee affects new patient registrations only.
          Existing payments will not be changed.
        </p>
        <button
          disabled={saving}
          className="mt-5 rounded bg-sky-700 px-4 py-2 font-medium text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
