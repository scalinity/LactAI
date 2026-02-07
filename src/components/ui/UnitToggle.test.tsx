import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UnitToggle } from './UnitToggle';

describe('UnitToggle', () => {
  describe('Rendering', () => {
    it('should render both ml and oz buttons', () => {
      const onChange = vi.fn();
      render(<UnitToggle value="ml" onChange={onChange} />);
      
      expect(screen.getByRole('button', { name: 'ml' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'oz' })).toBeInTheDocument();
    });

    it('should highlight ml button when value is ml', () => {
      const onChange = vi.fn();
      render(<UnitToggle value="ml" onChange={onChange} />);
      
      const mlButton = screen.getByRole('button', { name: 'ml' });
      expect(mlButton).toHaveClass('bg-rose-primary', 'text-white');
    });

    it('should highlight oz button when value is oz', () => {
      const onChange = vi.fn();
      render(<UnitToggle value="oz" onChange={onChange} />);
      
      const ozButton = screen.getByRole('button', { name: 'oz' });
      expect(ozButton).toHaveClass('bg-rose-primary', 'text-white');
    });

    it('should apply custom className', () => {
      const onChange = vi.fn();
      render(
        <UnitToggle value="ml" onChange={onChange} className="custom-class" />
      );
      
      const wrapper = screen.getByRole('button', { name: 'ml' }).parentElement;
      expect(wrapper).toHaveClass('custom-class');
    });
  });

  describe('Interactions', () => {
    it('should call onChange with "ml" when ml button is clicked', () => {
      const onChange = vi.fn();
      render(<UnitToggle value="oz" onChange={onChange} />);
      
      const mlButton = screen.getByRole('button', { name: 'ml' });
      fireEvent.click(mlButton);
      
      expect(onChange).toHaveBeenCalledWith('ml');
    });

    it('should call onChange with "oz" when oz button is clicked', () => {
      const onChange = vi.fn();
      render(<UnitToggle value="ml" onChange={onChange} />);
      
      const ozButton = screen.getByRole('button', { name: 'oz' });
      fireEvent.click(ozButton);
      
      expect(onChange).toHaveBeenCalledWith('oz');
    });

    it('should be clickable when already selected', () => {
      const onChange = vi.fn();
      render(<UnitToggle value="ml" onChange={onChange} />);
      
      const mlButton = screen.getByRole('button', { name: 'ml' });
      fireEvent.click(mlButton);
      
      expect(onChange).toHaveBeenCalledWith('ml');
    });
  });

  describe('Accessibility', () => {
    it('should have button roles', () => {
      const onChange = vi.fn();
      render(<UnitToggle value="ml" onChange={onChange} />);
      
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });

    it('should support keyboard navigation', () => {
      const onChange = vi.fn();
      render(<UnitToggle value="ml" onChange={onChange} />);
      
      const mlButton = screen.getByRole('button', { name: 'ml' });
      mlButton.focus();
      
      expect(document.activeElement).toBe(mlButton);
    });

    it('should call onChange on Enter key press', () => {
      const onChange = vi.fn();
      render(<UnitToggle value="ml" onChange={onChange} />);
      
      const ozButton = screen.getByRole('button', { name: 'oz' });
      ozButton.focus();
      fireEvent.keyDown(ozButton, { key: 'Enter' });
      fireEvent.click(ozButton);
      
      expect(onChange).toHaveBeenCalledWith('oz');
    });
  });

  describe('Styling', () => {
    it('should apply inactive styles to unselected button', () => {
      const onChange = vi.fn();
      render(<UnitToggle value="ml" onChange={onChange} />);
      
      const ozButton = screen.getByRole('button', { name: 'oz' });
      expect(ozButton).toHaveClass('text-plum/40');
      expect(ozButton).not.toHaveClass('bg-rose-primary');
    });

    it('should apply active styles to selected button', () => {
      const onChange = vi.fn();
      render(<UnitToggle value="oz" onChange={onChange} />);
      
      const ozButton = screen.getByRole('button', { name: 'oz' });
      expect(ozButton).toHaveClass('bg-rose-primary', 'text-white', 'shadow-sm');
    });

    it('should apply hover styles on mouse over', () => {
      const onChange = vi.fn();
      render(<UnitToggle value="ml" onChange={onChange} />);
      
      const ozButton = screen.getByRole('button', { name: 'oz' });
      expect(ozButton).toHaveClass('hover:text-plum/60');
    });
  });

  describe('Edge Cases', () => {
    it('should not throw error with undefined onChange', () => {
      expect(() => render(<UnitToggle value="ml" onChange={undefined as any} />)).not.toThrow();
    });

    it('should handle rapid clicks correctly', () => {
      const onChange = vi.fn();
      render(<UnitToggle value="ml" onChange={onChange} />);
      
      const ozButton = screen.getByRole('button', { name: 'oz' });
      fireEvent.click(ozButton);
      fireEvent.click(ozButton);
      fireEvent.click(ozButton);
      
      expect(onChange).toHaveBeenCalledTimes(3);
      expect(onChange).toHaveBeenCalledWith('oz');
    });

    it('should handle toggle between units', () => {
      const onChange = vi.fn();
      const { rerender } = render(<UnitToggle value="ml" onChange={onChange} />);
      
      const ozButton = screen.getByRole('button', { name: 'oz' });
      fireEvent.click(ozButton);
      
      rerender(<UnitToggle value="oz" onChange={onChange} />);
      
      const mlButton = screen.getByRole('button', { name: 'ml' });
      expect(mlButton).not.toHaveClass('bg-rose-primary');
      expect(ozButton).toHaveClass('bg-rose-primary');
    });
  });
});
