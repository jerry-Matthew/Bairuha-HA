/**
 * Test Setup for Developer Tools Tests
 * 
 * This file sets up the testing environment including:
 * - Mock configurations
 * - Global test utilities
 * - Common test mocks
 */

import "@testing-library/jest-dom";

// Polyfill for TextEncoder/TextDecoder (needed for pg library in tests)
if (typeof global.TextEncoder === "undefined") {
  const { TextEncoder, TextDecoder } = require("util");
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
  }),
  usePathname: () => "/dev-tools",
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
