/**
 * DynamicDiv Component Tests
 *
 * Tests for the DynamicDiv component that applies CSS custom properties dynamically.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DynamicDiv } from '../../components/DynamicDiv';

describe('DynamicDiv', () => {
  it('should render children correctly', () => {
    render(
      <DynamicDiv cssVars={{}}>
        <span>Test Content</span>
      </DynamicDiv>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should apply CSS custom properties from cssVars', () => {
    const { container } = render(
      <DynamicDiv cssVars={{ '--test-color': 'red', '--test-size': '16px' }}>
        Content
      </DynamicDiv>
    );

    const div = container.firstChild as HTMLElement;
    expect(div.style.getPropertyValue('--test-color')).toBe('red');
    expect(div.style.getPropertyValue('--test-size')).toBe('16px');
  });

  it('should apply className prop', () => {
    const { container } = render(
      <DynamicDiv cssVars={{}} className="custom-class">
        Content
      </DynamicDiv>
    );

    const div = container.firstChild as HTMLElement;
    expect(div.classList.contains('custom-class')).toBe(true);
  });

  it('should handle numeric CSS variable values', () => {
    const { container } = render(
      <DynamicDiv cssVars={{ '--opacity': 0.5, '--z-index': 100 }}>
        Content
      </DynamicDiv>
    );

    const div = container.firstChild as HTMLElement;
    expect(div.style.getPropertyValue('--opacity')).toBe('0.5');
    expect(div.style.getPropertyValue('--z-index')).toBe('100');
  });

  it('should update CSS properties when cssVars change', async () => {
    const { container, rerender } = render(
      <DynamicDiv cssVars={{ '--color': 'blue' }}>
        Content
      </DynamicDiv>
    );

    const div = container.firstChild as HTMLElement;
    expect(div.style.getPropertyValue('--color')).toBe('blue');

    // Rerender with new props
    rerender(
      <DynamicDiv cssVars={{ '--color': 'green' }}>
        Content
      </DynamicDiv>
    );

    expect(div.style.getPropertyValue('--color')).toBe('green');
  });

  it('should pass through additional HTML attributes', () => {
    const { container } = render(
      <DynamicDiv
        cssVars={{}}
        data-testid="dynamic-div"
        id="my-div"
      >
        Content
      </DynamicDiv>
    );

    const div = container.firstChild as HTMLElement;
    expect(div.getAttribute('data-testid')).toBe('dynamic-div');
    expect(div.getAttribute('id')).toBe('my-div');
  });

  it('should handle empty cssVars object', () => {
    const { container } = render(
      <DynamicDiv cssVars={{}}>
        Content
      </DynamicDiv>
    );

    const div = container.firstChild as HTMLElement;
    expect(div).toBeInTheDocument();
    expect(div.textContent).toBe('Content');
  });

  it('should handle multiple children', () => {
    render(
      <DynamicDiv cssVars={{}}>
        <span>Child 1</span>
        <span>Child 2</span>
        <span>Child 3</span>
      </DynamicDiv>
    );

    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
    expect(screen.getByText('Child 3')).toBeInTheDocument();
  });
});
