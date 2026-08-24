import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  CheckCircle2,
  CircleAlert,
  CircleX,
  Info,
  LockKeyhole,
  ShieldAlert,
  TriangleAlert,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { setApiErrorHandler } from "../services/api";

const NotificationContext = createContext(null);

const toastStyles = {
  success: {
    icon: CheckCircle2,
    iconClass: "bg-emerald-50 text-emerald-700",
    progress: "bg-emerald-500",
  },
  error: {
    icon: CircleX,
    iconClass: "bg-rose-50 text-rose-700",
    progress: "bg-rose-500",
  },
  warning: {
    icon: TriangleAlert,
    iconClass: "bg-amber-50 text-amber-700",
    progress: "bg-amber-500",
  },
  info: {
    icon: Info,
    iconClass: "bg-sky-50 text-sky-700",
    progress: "bg-sky-500",
  },
};

function ModalShell({
  children,
  titleId,
  onClose,
  dismissible = true,
  closing = false,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const dialog = dialogRef.current;
    const focusable = () =>
      [
        ...dialog.querySelectorAll(
          "button, input, select, textarea, [tabindex]:not([tabindex='-1'])",
        ),
      ].filter((element) => !element.disabled);
    focusable()[0]?.focus();
    const keydown = (event) => {
      if (event.key === "Escape" && dismissible) onClose();
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      previousFocus?.focus?.();
    };
  }, [dismissible, onClose]);

  return (
    <div
      className={`hms-modal-overlay fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-[2px] ${closing ? "hms-modal-overlay-closing" : ""}`}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`hms-modal-card relative w-full max-w-md rounded-3xl border border-white/60 bg-white p-6 shadow-2xl sm:p-7 ${closing ? "hms-modal-card-closing" : ""}`}
      >
        {dismissible && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
          >
            <X size={18} />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}

function Toast({ toast, dismiss }) {
  const style = toastStyles[toast.type] || toastStyles.info;
  const Icon = style.icon;

  useEffect(() => {
    const timer = window.setTimeout(() => dismiss(toast.id), toast.duration);
    return () => window.clearTimeout(timer);
  }, [dismiss, toast.duration, toast.id]);

  return (
    <article
      role={
        toast.type === "error" || toast.type === "warning" ? "alert" : "status"
      }
      className={`hms-toast relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xl ${toast.closing ? "hms-toast-closing" : ""}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${style.iconClass}`}
        >
          <Icon aria-hidden="true" size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900">{toast.title}</p>
          {toast.message && (
            <p className="mt-1 break-words text-sm leading-5 text-slate-600">
              {toast.message}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => dismiss(toast.id)}
          aria-label="Dismiss notification"
          className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
        >
          <X size={16} />
        </button>
      </div>
      <span
        aria-hidden="true"
        className={`hms-toast-progress absolute bottom-0 left-0 h-0.5 w-full origin-left ${style.progress}`}
        style={{ animationDuration: `${toast.duration}ms` }}
      />
    </article>
  );
}

const readableRole = (role) =>
  role
    ? role
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "Staff";

export function NotificationProvider({ children }) {
  const navigate = useNavigate();
  const { user, expireSession } = useAuth();
  const [toasts, setToasts] = useState([]);
  const [accessDenied, setAccessDenied] = useState(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [dialog, setDialog] = useState(null);
  const dialogResolver = useRef(null);
  const closeTimer = useRef(null);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  const dismiss = useCallback((id) => {
    setToasts((current) =>
      current.map((toast) =>
        toast.id === id ? { ...toast, closing: true } : toast,
      ),
    );
    window.setTimeout(
      () => setToasts((current) => current.filter((toast) => toast.id !== id)),
      220,
    );
  }, []);

  const notify = useCallback(
    ({ type = "info", title, message, duration = 3800 }) => {
      const toast = {
        id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
        type,
        title,
        message,
        duration,
        closing: false,
      };
      setToasts((current) => [...current.slice(-3), toast]);
      return toast.id;
    },
    [],
  );

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        dialogResolver.current = resolve;
        setDialog({
          kind: "confirm",
          tone: "danger",
          confirmLabel: "Confirm",
          ...options,
        });
      }),
    [],
  );

  const prompt = useCallback(
    (options) =>
      new Promise((resolve) => {
        dialogResolver.current = resolve;
        setDialog({
          kind: "prompt",
          value: "",
          confirmLabel: "Continue",
          ...options,
        });
      }),
    [],
  );

  const settleDialog = useCallback((value) => {
    setDialog((current) => (current ? { ...current, closing: true } : current));
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => {
      dialogResolver.current?.(value);
      dialogResolver.current = null;
      setDialog(null);
    }, 180);
  }, []);

  const closeAccessDenied = useCallback(() => {
    setAccessDenied((current) =>
      current ? { ...current, closing: true } : current,
    );
    window.setTimeout(() => setAccessDenied(null), 180);
  }, []);

  useEffect(
    () =>
      setApiErrorHandler((event) => {
        if (event.type === "forbidden") {
          setAccessDenied({
            message:
              event.message ||
              "You don't have permission to perform this action.",
          });
        } else if (event.type === "session-expired") {
          expireSession();
          setSessionExpired(true);
        } else {
          notify(event);
        }
      }),
    [expireSession, notify],
  );

  const signIn = () => {
    setSessionExpired("closing");
    window.setTimeout(() => {
      setSessionExpired(false);
      navigate("/login", { replace: true });
    }, 180);
  };

  return (
    <NotificationContext.Provider value={{ notify, confirm, prompt }}>
      {children}
      <section
        aria-label="Notifications"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 top-4 z-[80] flex flex-col gap-3 sm:left-auto sm:right-5 sm:w-[min(24rem,calc(100vw-2.5rem))]"
      >
        {toasts.map((toast) => (
          <div className="pointer-events-auto" key={toast.id}>
            <Toast toast={toast} dismiss={dismiss} />
          </div>
        ))}
      </section>

      {accessDenied && (
        <ModalShell
          titleId="access-denied-title"
          closing={accessDenied.closing}
          onClose={closeAccessDenied}
        >
          <div className="text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-50 text-rose-700">
              <ShieldAlert aria-hidden="true" size={28} />
            </span>
            <h2
              id="access-denied-title"
              className="mt-5 text-2xl font-bold text-slate-900"
            >
              Access Denied
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {accessDenied.message}
            </p>
            <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Your account role:{" "}
              <b className="text-slate-800">{readableRole(user?.roles?.[0])}</b>
            </p>
            <button
              type="button"
              className="hms-button-primary mt-6 w-full"
              onClick={closeAccessDenied}
            >
              Close
            </button>
          </div>
        </ModalShell>
      )}

      {sessionExpired && (
        <ModalShell
          titleId="session-expired-title"
          closing={sessionExpired === "closing"}
          dismissible={false}
          onClose={() => {}}
        >
          <div className="text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-50 text-amber-700">
              <LockKeyhole aria-hidden="true" size={27} />
            </span>
            <h2
              id="session-expired-title"
              className="mt-5 text-2xl font-bold text-slate-900"
            >
              Session Expired
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Your session has expired. Please sign in again.
            </p>
            <button
              type="button"
              className="hms-button-primary mt-6 w-full"
              onClick={signIn}
            >
              Sign In
            </button>
          </div>
        </ModalShell>
      )}

      {dialog?.kind === "confirm" && (
        <ModalShell
          titleId="confirmation-title"
          closing={dialog.closing}
          onClose={() => settleDialog(false)}
        >
          <span
            className={`grid h-12 w-12 place-items-center rounded-2xl ${dialog.tone === "danger" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}
          >
            <CircleAlert aria-hidden="true" size={24} />
          </span>
          <h2
            id="confirmation-title"
            className="mt-5 text-xl font-bold text-slate-900"
          >
            {dialog.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {dialog.message}
          </p>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="hms-button-secondary"
              onClick={() => settleDialog(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className={
                dialog.tone === "danger"
                  ? "inline-flex items-center justify-center rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-800 focus:ring-4 focus:ring-rose-700/15"
                  : "hms-button-primary"
              }
              onClick={() => settleDialog(true)}
            >
              {dialog.confirmLabel}
            </button>
          </div>
        </ModalShell>
      )}

      {dialog?.kind === "prompt" && (
        <ModalShell
          titleId="prompt-title"
          closing={dialog.closing}
          onClose={() => settleDialog(null)}
        >
          <h2 id="prompt-title" className="text-xl font-bold text-slate-900">
            {dialog.title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {dialog.message}
          </p>
          <label className="mt-5 block text-sm font-semibold text-slate-700">
            {dialog.label}
            <input
              autoFocus
              className="hms-input"
              type={dialog.inputType || "text"}
              minLength={dialog.minLength}
              value={dialog.value}
              onChange={(event) =>
                setDialog((current) => ({
                  ...current,
                  value: event.target.value,
                }))
              }
            />
          </label>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="hms-button-secondary"
              onClick={() => settleDialog(null)}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={
                dialog.minLength && dialog.value.length < dialog.minLength
              }
              className="hms-button-primary"
              onClick={() => settleDialog(dialog.value)}
            >
              {dialog.confirmLabel}
            </button>
          </div>
        </ModalShell>
      )}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context)
    throw new Error(
      "useNotifications must be used within NotificationProvider",
    );
  return context;
};
