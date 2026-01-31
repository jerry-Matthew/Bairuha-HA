# Developer Tools Tests

This directory contains comprehensive tests for the Developer Tools UI implementation (Task 47).

## Test Structure

- `dev-tools-panel.test.tsx` - Tests for the main panel component
- `hooks/useStateInspection.test.ts` - Tests for entity state inspection hook
- `hooks/useServiceCall.test.ts` - Tests for service call execution hook
- `hooks/useEventTrigger.test.ts` - Tests for event triggering hook
- `hooks/useTemplateTest.test.ts` - Tests for template testing hook
- `hooks/useSystemInfo.test.ts` - Tests for system information hook
- `setup.ts` - Test setup and global mocks

## Running Tests

To run these tests, you'll need to install a testing framework. Recommended setup:

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jest jest-environment-jsdom @types/jest
```

Add to `package.json`:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "testEnvironment": "jsdom",
    "setupFilesAfterEnv": ["<rootDir>/components/panels/dev-tools/__tests__/setup.ts"],
    "moduleNameMapper": {
      "^@/(.*)$": "<rootDir>/$1"
    }
  }
}
```

## Test Coverage

### Main Panel Component
- ✅ Renders panel with header
- ✅ Renders all tabs
- ✅ Default tab display (State Inspection)
- ✅ Tab switching functionality
- ✅ Tab state management

### Hooks
- ✅ useStateInspection: Entity fetching, filtering, pagination, error handling
- ✅ useServiceCall: Service call execution, error handling, result management
- ✅ useEventTrigger: Event type fetching, event triggering, error handling
- ✅ useTemplateTest: Template testing, validation, error handling
- ✅ useSystemInfo: System info fetching, auto-refresh, error handling

## Test Principles

1. **Isolation**: Each test is independent and doesn't rely on other tests
2. **Mocking**: External dependencies (API calls, Redux store, WebSocket) are mocked
3. **Async Handling**: Proper use of `waitFor` and async/await for async operations
4. **Error Cases**: Tests cover both success and error scenarios
5. **Edge Cases**: Tests handle edge cases like empty data, network errors, etc.

## Adding New Tests

When adding new functionality:
1. Add tests for new hooks in the `hooks/__tests__` directory
2. Add component tests for new UI components
3. Ensure all API interactions are mocked
4. Test both success and error paths
5. Update this README with new test coverage
