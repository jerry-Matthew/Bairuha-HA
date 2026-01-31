/**
 * Test Setup for Todos Panel Tests
 * 
 * This file sets up the testing environment for todos panel tests including:
 * - Mock configurations
 * - Global test utilities
 * - Common test mocks
 */

import "@testing-library/jest-dom";

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => "/todos",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock WebSocket context
jest.mock("@/contexts/websocket-context", () => ({
  useWebSocketContext: () => ({
    isConnected: true,
    subscribe: jest.fn(() => jest.fn()), // Returns unsubscribe function
    send: jest.fn(),
  }),
}));

// Mock Redux store hooks
jest.mock("@/store/hooks", () => ({
  useAppDispatch: jest.fn(() => jest.fn()),
  useAppSelector: jest.fn((selector: any) => selector({ entities: { entities: [] } })),
}));

// Suppress console errors in tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === "string" &&
      (args[0].includes("Warning: ReactDOM.render") ||
        args[0].includes("Not implemented: HTMLFormElement.prototype.submit"))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
