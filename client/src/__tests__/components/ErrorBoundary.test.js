import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../testUtils';
import ErrorBoundary from '../../components/ErrorBoundary';

// Component that throws an error for testing
const ThrowError = ({ shouldError }) => {
  if (shouldError) {
    throw new Error('Test error');
  }
  return <div>Normal content</div>;
};

// Mock console.error to avoid cluttering test output
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

describe('ErrorBoundary Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children when no error occurs', () => {
    renderWithProviders(
      <ErrorBoundary>
        <ThrowError shouldError={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('should render error UI when child component throws', () => {
    renderWithProviders(
      <ErrorBoundary>
        <ThrowError shouldError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('We encountered an unexpected error. Please try refreshing the page.')).toBeInTheDocument();
  });

  it('should show error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    renderWithProviders(
      <ErrorBoundary>
        <ThrowError shouldError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Error: Test error')).toBeInTheDocument();

    process.env.NODE_ENV = originalEnv;
  });

  it('should provide retry functionality', () => {
    const { rerender } = renderWithProviders(
      <ErrorBoundary>
        <ThrowError shouldError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Simulate retry by re-rendering with no error
    rerender(
      <ErrorBoundary>
        <ThrowError shouldError={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('should handle different error types', () => {
    const NetworkError = () => {
      throw new Error('Network request failed');
    };

    renderWithProviders(
      <ErrorBoundary>
        <NetworkError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should log error details', () => {
    renderWithProviders(
      <ErrorBoundary>
        <ThrowError shouldError={true} />
      </ErrorBoundary>
    );

    expect(console.error).toHaveBeenCalled();
  });

  it('should render custom fallback when provided', () => {
    const CustomFallback = ({ error, resetError }) => (
      <div>
        <h2>Custom Error UI</h2>
        <p>Error: {error.message}</p>
        <button onClick={resetError}>Try Again</button>
      </div>
    );

    renderWithProviders(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError shouldError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
    expect(screen.getByText('Error: Test error')).toBeInTheDocument();
    expect(screen.getByText('Try Again')).toBeInTheDocument();
  });

  it('should reset error state when resetError is called', () => {
    const CustomFallback = ({ error, resetError }) => (
      <div>
        <h2>Error occurred</h2>
        <button onClick={resetError}>Reset</button>
      </div>
    );

    const { rerender } = renderWithProviders(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError shouldError={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Error occurred')).toBeInTheDocument();

    // Click reset and then provide non-erroring component
    const resetButton = screen.getByText('Reset');
    resetButton.click();

    rerender(
      <ErrorBoundary fallback={CustomFallback}>
        <ThrowError shouldError={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('should handle multiple error boundaries', () => {
    const InnerError = () => {
      throw new Error('Inner error');
    };

    renderWithProviders(
      <ErrorBoundary>
        <div>Outer content</div>
        <ErrorBoundary>
          <InnerError />
        </ErrorBoundary>
      </ErrorBoundary>
    );

    // Only the inner error boundary should catch the error
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.queryByText('Outer content')).not.toBeInTheDocument();
  });
});