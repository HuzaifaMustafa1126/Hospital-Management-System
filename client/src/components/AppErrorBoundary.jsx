import React from "react";

export class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, details) {
    console.error("HMS interface error", error, details);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 p-5">
        <section className="w-full max-w-xl rounded-2xl border border-rose-200 bg-white p-7 shadow-xl">
          <p className="text-sm font-bold uppercase tracking-wider text-rose-700">
            Interface error
          </p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            This page could not be displayed
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {this.state.error.message || "An unexpected rendering error occurred."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              className="hms-button-primary"
              onClick={() => {
                this.setState({ error: null });
                window.location.reload();
              }}
            >
              Reload page
            </button>
            <a className="hms-button-secondary" href="/dashboard">
              Return to dashboard
            </a>
          </div>
        </section>
      </main>
    );
  }
}
