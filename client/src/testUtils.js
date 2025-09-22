import React from 'react';
import { render } from '@testing-library/react';

// Mock API base URL for tests
export const TEST_API_BASE = 'http://localhost:3001';

// Custom render function with common providers
export const renderWithProviders = (ui, options = {}) => {
  const AllTheProviders = ({ children }) => {
    return children;
  };

  return render(ui, { wrapper: AllTheProviders, ...options });
};

// Mock fetch for API tests
export const mockFetch = (responseData, status = 200) => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(responseData),
    })
  );
};

// Mock Server-Sent Events
export const mockEventSource = () => {
  const mockEventSource = {
    onmessage: null,
    onerror: null,
    close: jest.fn(),
  };

  global.EventSource = jest.fn(() => mockEventSource);
  return mockEventSource;
};

// Common test data
export const testUser = {
  id: 1,
  name: 'Test User',
  level: 1,
  xp: 0,
  streak: 0,
};

export const testDeck = {
  id: 1,
  name: 'Test Deck',
  description: 'A test deck',
  cardCount: 10,
  status: 'ready',
};

export const testQuestion = {
  id: 1,
  type: 'multiple_choice',
  difficulty: 'beginner',
  question: 'What is "hello" in Polish?',
  answer: 'cześć',
  options: ['cześć', 'dziękuję', 'proszę', 'tak'],
  cardId: 1,
};

// Re-export everything from @testing-library/react
export * from '@testing-library/react';