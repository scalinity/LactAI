import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import en from "@/i18n/en";
import es from "@/i18n/es";
import { useAppStore } from "@/stores/useAppStore";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const locale = useAppStore.getState().locale;
      const tr = locale === "es" ? es : en;

      return (
        <div className="min-h-screen flex items-center justify-center bg-cream px-4">
          <div className="max-w-md w-full bg-surface rounded-xl shadow-lg p-6 text-center">
            <AlertTriangle className="w-16 h-16 text-rose-primary mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-plum mb-2">
              {tr.errors.somethingWentWrong}
            </h1>
            <p className="text-plum-light mb-6">{tr.errors.unexpectedError}</p>
            {this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm text-plum/50 hover:text-plum/70">
                  {tr.errors.technicalDetails}
                </summary>
                <pre className="mt-2 text-xs bg-cream p-3 rounded overflow-auto text-plum">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
            <button
              onClick={this.handleReset}
              className="w-full bg-rose-primary hover:bg-rose-dark text-white font-medium py-2 px-4 rounded-xl transition-colors"
            >
              {tr.errors.reloadApp}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
