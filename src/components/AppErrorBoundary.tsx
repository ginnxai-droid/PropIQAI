import { Component, type ErrorInfo, type ReactNode } from "react";

interface State {
  failed: boolean;
}

export class AppErrorBoundary extends Component<
  { children: ReactNode },
  State
> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unexpected application error", error, info);
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-6">
          <div className="max-w-lg rounded-xl border border-rose-500/20 bg-[#121214] p-8 text-center">
            <h1 className="font-bold">The application could not continue</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Reload the page. If the problem continues, contact your
              organization administrator.
            </p>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}
