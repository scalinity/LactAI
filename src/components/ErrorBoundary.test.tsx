import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error("Test error message");
  }
  return <div>Normal content</div>;
};

describe("ErrorBoundary", () => {
  beforeEach(() => {
    // Suppress console.error for these tests
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("Normal Operation", () => {
    it("should render children when no error occurs", () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>,
      );

      expect(screen.getByText("Test content")).toBeInTheDocument();
    });

    it("should not show error UI when everything is fine", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>,
      );

      expect(screen.getByText("Normal content")).toBeInTheDocument();
      expect(
        screen.queryByText(/something went wrong/i),
      ).not.toBeInTheDocument();
    });
  });

  describe("Error Catching", () => {
    it("should catch errors from child components", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it("should display fallback UI on error", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      expect(
        screen.getByText(/we encountered an unexpected error/i),
      ).toBeInTheDocument();
    });

    it("should show error icon in fallback UI", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      // Check for AlertTriangle icon
      const svg = screen.getByText(/something went wrong/i).parentElement;
      expect(svg?.querySelector("svg")).toBeInTheDocument();
    });
  });

  describe("Error Details", () => {
    it("should show error message in details", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      const details = screen.getByText(/technical details/i);
      fireEvent.click(details);

      expect(screen.getByText(/Test error message/i)).toBeInTheDocument();
    });

    it("should hide error details by default", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      // Error message should not be visible until details are expanded
      const errorText = screen.queryByText("Error: Test error message");
      expect(errorText).not.toBeVisible();
    });

    it("should toggle error details on click", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      const details = screen.getByText(/technical details/i);

      // Click to expand
      fireEvent.click(details);
      expect(screen.getByText(/Test error message/i)).toBeVisible();
    });
  });

  describe("Reset Functionality", () => {
    it("should have a reload button", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      expect(
        screen.getByRole("button", { name: /reload application/i }),
      ).toBeInTheDocument();
    });

    it("should reload page on reset button click", () => {
      const reloadMock = vi.fn();
      Object.defineProperty(window, "location", {
        value: { reload: reloadMock },
        writable: true,
      });

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      const reloadButton = screen.getByRole("button", {
        name: /reload application/i,
      });
      fireEvent.click(reloadButton);

      expect(reloadMock).toHaveBeenCalled();
    });
  });

  describe("Error Logging", () => {
    it("should log error to console", () => {
      const consoleSpy = vi.spyOn(console, "error");

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      expect(consoleSpy).toHaveBeenCalled();
    });

    it("should log error with componentDidCatch", () => {
      const consoleSpy = vi.spyOn(console, "error");

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      // Should log with 'ErrorBoundary caught an error'
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("ErrorBoundary caught an error"),
        expect.any(Error),
        expect.anything(),
      );
    });
  });

  describe("User Messages", () => {
    it("should reassure user about data safety", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      expect(screen.getByText(/your data is safe/i)).toBeInTheDocument();
    });

    it("should display friendly error title", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      expect(
        screen.getByText(/oops! something went wrong/i),
      ).toBeInTheDocument();
    });
  });

  describe("Multiple Errors", () => {
    it("should handle multiple child errors", () => {
      const MultiError = () => {
        throw new Error("First error");
      };

      render(
        <ErrorBoundary>
          <div>
            <MultiError />
          </div>
        </ErrorBoundary>,
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it("should catch nested component errors", () => {
      const NestedError = () => {
        return (
          <div>
            <div>
              <ThrowError shouldThrow={true} />
            </div>
          </div>
        );
      };

      render(
        <ErrorBoundary>
          <NestedError />
        </ErrorBoundary>,
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  describe("Styling", () => {
    it("should render with proper error UI styling", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      const container = screen
        .getByText(/something went wrong/i)
        .closest("div");
      expect(container).toHaveClass("bg-surface", "rounded-xl", "shadow-lg");
    });

    it("should center error display", () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>,
      );

      const outerContainer = screen
        .getByText(/something went wrong/i)
        .closest("div")?.parentElement;
      expect(outerContainer).toHaveClass(
        "min-h-screen",
        "flex",
        "items-center",
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle errors without message", () => {
      const ThrowNoMessage = () => {
        throw new Error();
      };

      render(
        <ErrorBoundary>
          <ThrowNoMessage />
        </ErrorBoundary>,
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });

    it("should handle string errors", () => {
      const ThrowString = () => {
        throw "String error"; // eslint-disable-line no-throw-literal
      };

      render(
        <ErrorBoundary>
          <ThrowString />
        </ErrorBoundary>,
      );

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });
});
