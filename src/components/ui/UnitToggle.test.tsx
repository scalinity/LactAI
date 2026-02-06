import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { UnitToggle } from "./UnitToggle";

describe("UnitToggle", () => {
  describe("Rendering", () => {
    it("should render both unit buttons", () => {
      const onChange = vi.fn();
      render(<UnitToggle isMetric={false} onChange={onChange} />);

      expect(screen.getByRole("button", { name: /oz/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /ml/i })).toBeInTheDocument();
    });

    it("should highlight oz button when isMetric is false", () => {
      const onChange = vi.fn();
      render(<UnitToggle isMetric={false} onChange={onChange} />);

      const ozButton = screen.getByRole("button", { name: /oz/i });
      expect(ozButton).toHaveClass("bg-blue-500", "text-white");
    });

    it("should highlight ml button when isMetric is true", () => {
      const onChange = vi.fn();
      render(<UnitToggle isMetric={true} onChange={onChange} />);

      const mlButton = screen.getByRole("button", { name: /ml/i });
      expect(mlButton).toHaveClass("bg-blue-500", "text-white");
    });

    it("should apply inactive styles to non-selected button", () => {
      const onChange = vi.fn();
      render(<UnitToggle isMetric={false} onChange={onChange} />);

      const mlButton = screen.getByRole("button", { name: /ml/i });
      expect(mlButton).toHaveClass("bg-gray-200", "text-gray-700");
    });

    it("should render with custom className", () => {
      const onChange = vi.fn();
      const { container } = render(
        <UnitToggle
          isMetric={false}
          onChange={onChange}
          className="custom-class"
        />,
      );

      const toggleContainer = container.firstChild;
      expect(toggleContainer).toHaveClass("custom-class");
    });
  });

  describe("Interaction", () => {
    it("should call onChange with false when oz button is clicked", async () => {
      const onChange = vi.fn();
      render(<UnitToggle isMetric={true} onChange={onChange} />);

      const ozButton = screen.getByRole("button", { name: /oz/i });
      await userEvent.click(ozButton);

      expect(onChange).toHaveBeenCalledWith(false);
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it("should call onChange with true when ml button is clicked", async () => {
      const onChange = vi.fn();
      render(<UnitToggle isMetric={false} onChange={onChange} />);

      const mlButton = screen.getByRole("button", { name: /ml/i });
      await userEvent.click(mlButton);

      expect(onChange).toHaveBeenCalledWith(true);
      expect(onChange).toHaveBeenCalledTimes(1);
    });

    it("should handle multiple clicks", async () => {
      const onChange = vi.fn();
      render(<UnitToggle isMetric={false} onChange={onChange} />);

      const mlButton = screen.getByRole("button", { name: /ml/i });
      await userEvent.click(mlButton);
      await userEvent.click(mlButton);

      expect(onChange).toHaveBeenCalledTimes(2);
      expect(onChange).toHaveBeenCalledWith(true);
    });

    it("should allow switching between units", async () => {
      const onChange = vi.fn();
      const { rerender } = render(
        <UnitToggle isMetric={false} onChange={onChange} />,
      );

      const mlButton = screen.getByRole("button", { name: /ml/i });
      await userEvent.click(mlButton);

      expect(onChange).toHaveBeenCalledWith(true);

      // Rerender with updated prop
      rerender(<UnitToggle isMetric={true} onChange={onChange} />);

      const ozButton = screen.getByRole("button", { name: /oz/i });
      await userEvent.click(ozButton);

      expect(onChange).toHaveBeenCalledWith(false);
    });
  });

  describe("Visual States", () => {
    it("should show hover styles on inactive buttons", () => {
      const onChange = vi.fn();
      render(<UnitToggle isMetric={false} onChange={onChange} />);

      const mlButton = screen.getByRole("button", { name: /ml/i });
      expect(mlButton).toHaveClass("hover:bg-gray-300");
    });

    it("should apply transition classes to buttons", () => {
      const onChange = vi.fn();
      render(<UnitToggle isMetric={false} onChange={onChange} />);

      const ozButton = screen.getByRole("button", { name: /oz/i });
      const mlButton = screen.getByRole("button", { name: /ml/i });

      expect(ozButton).toHaveClass("transition-colors");
      expect(mlButton).toHaveClass("transition-colors");
    });

    it("should maintain consistent styling across both buttons", () => {
      const onChange = vi.fn();
      render(<UnitToggle isMetric={false} onChange={onChange} />);

      const ozButton = screen.getByRole("button", { name: /oz/i });
      const mlButton = screen.getByRole("button", { name: /ml/i });

      // Both should have common classes
      expect(ozButton).toHaveClass("px-4", "py-2", "rounded-lg", "font-medium");
      expect(mlButton).toHaveClass("px-4", "py-2", "rounded-lg", "font-medium");
    });
  });

  describe("Accessibility", () => {
    it("should be keyboard accessible", async () => {
      const onChange = vi.fn();
      render(<UnitToggle isMetric={false} onChange={onChange} />);

      const mlButton = screen.getByRole("button", { name: /ml/i });
      mlButton.focus();

      fireEvent.keyDown(mlButton, { key: "Enter" });

      expect(onChange).toHaveBeenCalledWith(true);
    });

    it("should support tab navigation", () => {
      const onChange = vi.fn();
      render(<UnitToggle isMetric={false} onChange={onChange} />);

      const ozButton = screen.getByRole("button", { name: /oz/i });
      const mlButton = screen.getByRole("button", { name: /ml/i });

      // Both buttons should be focusable
      expect(ozButton).toHaveAttribute("type", "button");
      expect(mlButton).toHaveAttribute("type", "button");
    });

    it("should have clear button labels", () => {
      const onChange = vi.fn();
      render(<UnitToggle isMetric={false} onChange={onChange} />);

      expect(screen.getByRole("button", { name: /oz/i })).toHaveTextContent(
        "oz",
      );
      expect(screen.getByRole("button", { name: /ml/i })).toHaveTextContent(
        "ml",
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle rapid clicking", async () => {
      const onChange = vi.fn();
      render(<UnitToggle isMetric={false} onChange={onChange} />);

      const mlButton = screen.getByRole("button", { name: /ml/i });

      // Rapid clicks
      await userEvent.click(mlButton);
      await userEvent.click(mlButton);
      await userEvent.click(mlButton);

      expect(onChange).toHaveBeenCalledTimes(3);
    });

    it("should not break with undefined className", () => {
      const onChange = vi.fn();
      render(<UnitToggle isMetric={false} onChange={onChange} />);

      expect(screen.getByRole("button", { name: /oz/i })).toBeInTheDocument();
    });

    it("should handle onChange being undefined gracefully", () => {
      // @ts-expect-error Testing edge case
      const { container } = render(
        <UnitToggle isMetric={false} onChange={undefined} />,
      );

      expect(container).toBeInTheDocument();
    });
  });

  describe("Layout", () => {
    it("should display buttons in a horizontal layout", () => {
      const onChange = vi.fn();
      const { container } = render(
        <UnitToggle isMetric={false} onChange={onChange} />,
      );

      const toggleContainer = container.firstChild;
      expect(toggleContainer).toHaveClass("flex", "items-center", "space-x-2");
    });

    it("should have proper spacing between buttons", () => {
      const onChange = vi.fn();
      const { container } = render(
        <UnitToggle isMetric={false} onChange={onChange} />,
      );

      const toggleContainer = container.firstChild;
      expect(toggleContainer).toHaveClass("space-x-2");
    });
  });

  describe("State Synchronization", () => {
    it("should reflect isMetric prop changes", () => {
      const onChange = vi.fn();
      const { rerender } = render(
        <UnitToggle isMetric={false} onChange={onChange} />,
      );

      let ozButton = screen.getByRole("button", { name: /oz/i });
      expect(ozButton).toHaveClass("bg-blue-500");

      rerender(<UnitToggle isMetric={true} onChange={onChange} />);

      ozButton = screen.getByRole("button", { name: /oz/i });
      const mlButton = screen.getByRole("button", { name: /ml/i });

      expect(ozButton).toHaveClass("bg-gray-200");
      expect(mlButton).toHaveClass("bg-blue-500");
    });

    it("should maintain state between rerenders", () => {
      const onChange = vi.fn();
      const { rerender } = render(
        <UnitToggle isMetric={true} onChange={onChange} />,
      );

      rerender(<UnitToggle isMetric={true} onChange={onChange} />);

      const mlButton = screen.getByRole("button", { name: /ml/i });
      expect(mlButton).toHaveClass("bg-blue-500");
    });
  });
});
