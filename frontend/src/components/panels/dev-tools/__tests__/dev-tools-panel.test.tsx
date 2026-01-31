/**
 * Developer Tools Panel Tests
 * 
 * Tests for the main Developer Tools panel component including:
 * - Tab navigation
 * - Panel rendering
 * - Tab switching functionality
 */

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DevToolsPanel } from "../dev-tools-panel";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { entitiesSlice } from "@/store/slices/entities-slice";

// Mock the tab components
jest.mock("../tabs/state-inspection-tab", () => ({
  StateInspectionTab: () => <div data-testid="state-inspection-tab">State Inspection Tab</div>,
}));

jest.mock("../tabs/service-call-tab", () => ({
  ServiceCallTab: () => <div data-testid="service-call-tab">Service Call Tab</div>,
}));

jest.mock("../tabs/event-trigger-tab", () => ({
  EventTriggerTab: () => <div data-testid="event-trigger-tab">Event Trigger Tab</div>,
}));

jest.mock("../tabs/template-test-tab", () => ({
  TemplateTestTab: () => <div data-testid="template-test-tab">Template Test Tab</div>,
}));

jest.mock("../tabs/system-info-tab", () => ({
  SystemInfoTab: () => <div data-testid="system-info-tab">System Info Tab</div>,
}));

// Mock PanelHeader
jest.mock("@/components/ui/panel-header", () => ({
  PanelHeader: ({ title, description }: { title: string; description: string }) => (
    <div data-testid="panel-header">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));

const createMockStore = () => {
  return configureStore({
    reducer: {
      entities: entitiesSlice.reducer,
    },
    preloadedState: {
      entities: {
        entities: [],
      },
    },
  });
};

describe("DevToolsPanel", () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    store = createMockStore();
  });

  it("renders the panel with header", () => {
    render(
      <Provider store={store}>
        <DevToolsPanel />
      </Provider>
    );

    expect(screen.getByTestId("panel-header")).toBeInTheDocument();
    expect(screen.getByText("Developer Tools")).toBeInTheDocument();
  });

  it("renders all tabs in the tab bar", () => {
    render(
      <Provider store={store}>
        <DevToolsPanel />
      </Provider>
    );

    expect(screen.getByRole("tab", { name: /state inspection/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /service calls/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /events/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /templates/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /system info/i })).toBeInTheDocument();
  });

  it("shows State Inspection tab by default", () => {
    render(
      <Provider store={store}>
        <DevToolsPanel />
      </Provider>
    );

    expect(screen.getByTestId("state-inspection-tab")).toBeInTheDocument();
  });

  it("switches to Service Calls tab when clicked", async () => {
    const user = userEvent.setup();
    render(
      <Provider store={store}>
        <DevToolsPanel />
      </Provider>
    );

    const serviceCallsTab = screen.getByRole("tab", { name: /service calls/i });
    await user.click(serviceCallsTab);

    expect(screen.getByTestId("service-call-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("state-inspection-tab")).not.toBeInTheDocument();
  });

  it("switches to Events tab when clicked", async () => {
    const user = userEvent.setup();
    render(
      <Provider store={store}>
        <DevToolsPanel />
      </Provider>
    );

    const eventsTab = screen.getByRole("tab", { name: /events/i });
    await user.click(eventsTab);

    expect(screen.getByTestId("event-trigger-tab")).toBeInTheDocument();
  });

  it("switches to Templates tab when clicked", async () => {
    const user = userEvent.setup();
    render(
      <Provider store={store}>
        <DevToolsPanel />
      </Provider>
    );

    const templatesTab = screen.getByRole("tab", { name: /templates/i });
    await user.click(templatesTab);

    expect(screen.getByTestId("template-test-tab")).toBeInTheDocument();
  });

  it("switches to System Info tab when clicked", async () => {
    const user = userEvent.setup();
    render(
      <Provider store={store}>
        <DevToolsPanel />
      </Provider>
    );

    const systemInfoTab = screen.getByRole("tab", { name: /system info/i });
    await user.click(systemInfoTab);

    expect(screen.getByTestId("system-info-tab")).toBeInTheDocument();
  });

  it("maintains active tab state correctly", async () => {
    const user = userEvent.setup();
    render(
      <Provider store={store}>
        <DevToolsPanel />
      </Provider>
    );

    // Start on State Inspection
    expect(screen.getByTestId("state-inspection-tab")).toBeInTheDocument();

    // Switch to Service Calls
    await user.click(screen.getByRole("tab", { name: /service calls/i }));
    expect(screen.getByTestId("service-call-tab")).toBeInTheDocument();

    // Switch back to State Inspection
    await user.click(screen.getByRole("tab", { name: /state inspection/i }));
    expect(screen.getByTestId("state-inspection-tab")).toBeInTheDocument();
  });
});
