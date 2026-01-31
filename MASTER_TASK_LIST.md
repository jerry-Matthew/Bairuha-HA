# 🧠 MASTER TASK LIST — ARCHITECTURE-AWARE REWRITE

**⚠️ ARCHITECTURE LOCK:** Bairuha HA is the only UI, backend, database, and automation brain. Home Assistant runs headless on Raspberry Pi as a hardware runtime accessed only via REST + WebSocket APIs.

**Last Rewrite:** 2025-01-14  
**Last Audit:** 2025-01-27  
**Audit Status:** Full codebase audit completed. All evidence files verified. 50 tasks confirmed complete, 5 partially done, 9 not done. Advanced Config Flow Layer (Tasks 55-64) verified complete. Home Assistant Integration Layer (Tasks 26-31) verified complete. No architecture violations found. See AUDIT_SUMMARY.md for detailed findings.

---

## 📐 ARCHITECTURE SUMMARY

### System Architecture

```
[ Browser / Mobile UI ]
         |
         v
[ Bairuha HA Backend + DB ] ← Next.js app (homeAssistant/)
         |
   REST + WebSocket
         |
         v
[ Home Assistant (Headless Runtime) ] ← Runs on Raspberry Pi
         |
         v
[ Physical Hardware ]
```

### Authority Model

**Bairuha HA Owns:**

- ✅ Users, permissions, authentication
- ✅ Entity registry and state (authoritative)
- ✅ Device registry, integration catalog, automation rules
- ✅ Dashboards, scenes, scripts, groups, history

**Home Assistant Provides:**

- ✅ Hardware runtime (Zigbee, GPIO, MQTT, etc.)
- ✅ REST API (`/api/states`, `/api/services`)
- ✅ WebSocket API (`state_changed` events)

**What MUST NOT Exist:**

- ❌ Custom Raspberry Pi agent
- ❌ Agent registry, auth, discovery, telemetry
- ❌ Dual state ownership
- ❌ Commands that mutate entity state directly

### Data Flow Principles

1. **State Authority:** Only Home Assistant state_changed events update entity state in Bairuha DB
2. **Command Flow:** UI → Command API → HA Service Call → HA executes → HA emits state_changed → Bairuha updates entity
3. **Entity Sync:** Initial sync from HA REST API, ongoing sync via HA WebSocket
4. **Source Attribution:** Entities track `source` field (HA vs internal)

---

## 🔹 TASK ORGANIZATION

Tasks organized by feature layer with sequential numbering:

1. **Foundations** (Tasks 1-2) - Database, authentication
2. **Integration Layer** (Tasks 3-8) - Integration catalog and registry
3. **Device Layer** (Tasks 9-11) - Device registry and management
4. **Config Flow Layer** (Tasks 12-15) - Integration setup flows
5. **Entity Layer** (Tasks 16-21) - Entity registry and state management
6. **Real-Time Layer** (Tasks 22-25) - WebSocket and event system
7. **Home Assistant Integration** (Tasks 26-31) - HA connection, sync, and service calls
8. **System Polish** (Tasks 32-36) - Areas, permissions, reliability, dev tools
9. **Automation Layer** (Tasks 37-38) - Automation rules and engine
10. **Major Components** (Tasks 39-54) - History, scenes, groups, scripts, etc.
11. **Advanced Integration & Config Flow Layer** (Tasks 55-64) - Full catalog import, dynamic flow types, discovery, OAuth, wizards

**Legend:** ✅ DONE | 🟡 PARTIALLY DONE | ❌ NOT DONE

---

## 🔹 FOUNDATIONS

### Task 1: Set up database connection — ✅ DONE

**Description:**
Establish a PostgreSQL database connection pool with proper connection management, error handling, and transaction support. This provides the foundation for all database operations throughout the application.

**Evidence:** `lib/db.ts` - Pool with connection pooling, error handling, transaction support.

### Task 2: Implement authentication system — ✅ DONE

**Description:**
Build a complete authentication system with user signup, login, token refresh, and secure session management. Implement JWT tokens with rotation, HttpOnly cookies for security, and proper password hashing.

**Evidence:** `lib/auth/auth-service.ts`, `app/api/auth/*` - Full signup/login/refresh, token rotation, HttpOnly cookies.

---

## 🔹 INTEGRATION LAYER

### Task 3: Create integration catalog — ✅ DONE

**Description:**
Create the database schema for the integration catalog, which stores metadata about all available integrations (brands, device types, icons, documentation links). This catalog serves as the source of truth for what integrations can be added to the system.

**Evidence:** `database/migrations/add_integration_catalog_table.sql`

### Task 4: Seed integration catalog — ✅ DONE

**Description:**
Populate the integration catalog with initial data including common smart home brands, device types, and their associated metadata. Create a seeding script to load this data into the database.

**Evidence:** `database/integration-catalog.seed.json`, `scripts/seed-integration-catalog.ts`

### Task 5: Create integration registry — ✅ DONE

**Description:**
Create the database schema and service layer for the integration registry, which tracks which integrations have been installed and configured by users. This registry links users to their active integrations.

**Evidence:** `database/migrations/add_integrations_table.sql`, `components/globalAdd/server/integration.registry.ts`

### Task 6: Build integration registry APIs — ✅ DONE

**Description:**
Implement REST APIs for managing the integration registry, providing full CRUD operations (create, read, update, delete) for user integrations. These APIs allow the UI to list, add, and remove integrations.

**Evidence:** `app/api/registries/integrations/route.ts` - Full CRUD

### Task 7: Implement "Select Brand" API — ✅ DONE

**Description:**
Build an API endpoint that merges data from the integration catalog and integration registry to provide a unified list of brands available for device setup. This API shows which brands are available and which are already installed.

**Evidence:** `components/addDevice/server/deviceFlow.service.ts` - Merges catalog + registry

### Task 8: Build "Select Brand" UI — ✅ DONE

**Description:**
Create a user interface component that displays available brands from the integration catalog with visual icons and status badges indicating installation status. This UI enables users to select which brand they want to add devices for.

**Evidence:** `components/globalAdd/client/` - Brand picker with icons and status badges

---

## 🔹 DEVICE LAYER

### Task 9: Create device registry — ✅ DONE

**Description:**
Create the database schema for the device registry, which stores information about physical devices added to the system. This registry tracks device metadata, associations with integrations, and relationships to entities.

**Evidence:** `database/migrations/add_registries_tables.sql` - devices table

### Task 10: Build device registry service — ✅ DONE

**Description:**
Implement the service layer for device registry operations, providing full CRUD functionality. The service automatically creates associated entities when a device is registered, establishing the device-to-entity relationship.

**Evidence:** `components/globalAdd/server/device.registry.ts` - Full CRUD, auto-creates entities

### Task 11: Build device registry APIs — ✅ DONE

**Description:**
Create REST API endpoints for querying the device registry, allowing the UI to retrieve all devices or filter devices by various criteria. These APIs provide read access to device information.

**Evidence:** `app/api/registries/devices/route.ts` - GET all devices

---

## 🔹 CONFIG FLOW LAYER

### Task 12: Implement config flow engine — ✅ DONE

**Description:**
Build a configuration flow engine that guides users through multi-step integration setup processes. The engine manages flow state, tracks progress through steps (pick_integration → configure → confirm), and handles flow completion.

**Evidence:** `database/migrations/add_config_flows_table.sql`, `components/addDevice/server/config-flow.registry.ts` - Flow: pick_integration → configure → confirm

### Task 13: Implement integration configure step — ✅ DONE

**Description:**
Implement the configuration step API that validates user-provided configuration data against integration schemas and creates config entries. This step collects integration-specific settings required for device setup.

**Evidence:** `app/api/device/flows/[flowId]/step/route.ts` - Schema validation, config entries created

### Task 14: Create config entries registry — ✅ DONE

**Description:**
Create the database schema and service layer for storing configuration entries, which hold integration-specific configuration data (API keys, URLs, credentials, etc.) required for device communication.

**Evidence:** `database/migrations/add_config_entries_table.sql`, `components/globalAdd/server/config-entry.registry.ts`

### Task 15: Finalize integration setup — ✅ DONE

**Description:**
Implement the final confirmation step of the config flow that validates all collected configuration, creates the integration registry entry, and marks the integration as active. This completes the integration setup process.

**Evidence:** `app/api/device/flows/[flowId]/confirm/route.ts` - Validates config, sets integration status

---

## 🔹 ENTITY LAYER

### Task 16: Create entity registry — ✅ DONE

**Description:**
Create the database schema for the entity registry, which stores all entities (sensors, switches, lights, etc.) in the system. The schema includes state, attributes, device associations, and proper constraints for data integrity.

**Evidence:** `database/migrations/add_entities_table.sql` - Full schema with constraints

### Task 17: Build entity registry service — ✅ DONE

**Description:**
Implement the service layer for entity registry operations, providing full CRUD functionality for managing entities. The service handles entity creation, updates, queries, and deletion with proper validation.

**Evidence:** `components/globalAdd/server/entity.registry.ts` - Full CRUD operations

### Task 18: Define device → entity mapping — ✅ DONE

**Description:**
Define the mapping logic that determines which entities should be created for each device type. This mapping ensures that when a device is registered, the appropriate entities (sensors, switches, etc.) are automatically created.

**Evidence:** `entity.registry.ts` - `DEVICE_TYPE_TO_ENTITIES` constant

### Task 19: Update device registration to create entities — ✅ DONE

**Description:**
Integrate entity creation into the device registration process. When a device is registered, automatically create the corresponding entities based on the device type mapping, establishing the device-entity relationship.

**Evidence:** `device.registry.ts` - `registerDevice()` calls `createEntitiesForDevice()`

### Task 20: Build entity registry APIs — ✅ DONE

**Description:**
Create REST API endpoints for querying the entity registry, providing read-only access to entity information. These APIs allow the UI to fetch entities by device ID or retrieve all entities, but explicitly do not allow direct state mutation.

**Requirements:**

- ❌ No API may mutate entity state directly
- ✅ Entity state updates ONLY via Home Assistant WebSocket ingestion (Task 29)
- ✅ APIs provide read-only access to entity registry

**Evidence:** `app/api/registries/entities/route.ts` - GET (all/by deviceId). Read-only access.

- [x] **Task 21: Migrate UI to entity model** <!-- id: 21 -->
  - **Description**: Refactor the UI so dashboards and panels read entity state from the entity registry and update via real-time WebSocket events.
  - **Status**: **Complete**
  - **Evidence**: `OverviewPanel` correctly subscribes to Redux store/WebSockets and renders entity cards dynamically.

**Note:**
Entity control actions will be enabled after Home Assistant service call
integration (Task 30). Until then, the UI is read-only with respect to entity state.

---

## 🔹 REAL-TIME LAYER

### Task 22: Define entity-centric event model — ✅ DONE

**Description:**
Design and implement the event model for entity state changes, defining the structure and types of events that flow through the system. This model ensures consistent event handling across the application.

**Evidence:** `components/globalAdd/server/entity.events.ts` - Event model defined

### Task 23: Implement WebSocket server — ✅ DONE

**Description:**
Set up a WebSocket server using Socket.IO to enable real-time bidirectional communication between the backend and frontend. The server handles client connections, subscriptions, and event broadcasting.

**Evidence:** `components/realtime/websocket.server.ts` - Socket.IO server initialized

### Task 24: Emit entity state events — ✅ DONE

**Description:**
Implement event emission when entity state changes occur, bridging the entity registry to the WebSocket server. This ensures that all entity state updates are broadcast to subscribed clients in real-time.

**Evidence:** `entity.registry.ts` - `emitEntityStateChanged()` called, bridges to WebSocket

### Task 25: Add frontend WebSocket client — ✅ DONE

**Description:**
Create React hooks and client-side WebSocket connection logic that allows the frontend to connect to the WebSocket server, subscribe to entity state changes, and receive real-time updates. This enables live UI updates without polling.

**Evidence:** `hooks/useWebSocket.ts`, `hooks/useEntitySubscriptions.ts` - Frontend subscribes

---

## 🔹 HOME ASSISTANT INTEGRATION LAYER

### Task 26: Home Assistant Integration Setup — ✅ DONE

**Description:**
Add Home Assistant as a first-class integration in the system, allowing users to connect their Home Assistant instance through the existing config flow engine. This integration stores the HA base URL and long-lived access token, and validates the connection during setup.

**Requirements:**

- Add "Home Assistant" to integration catalog
- Use existing config flow engine (Tasks 12-15)
- Store HA base URL and long-lived access token in `config_entries`
- Validate HA connection during config flow

**Evidence:**

- `database/integration-catalog.seed.json` - Home Assistant entry with domain "homeassistant", icon "mdi:home-assistant", supports_devices: false
- `components/homeassistant/server/ha-config-flow.service.ts` - Complete config flow service with enter_connection → validate_connection → confirm steps
- `lib/home-assistant/connection-validator.ts` - Connection validation via HA `/api/config` endpoint with Bearer token auth
- `app/api/integrations/homeassistant/flows/**/*.ts` - All 4 API routes (start, enter-connection, validate-connection, confirm)
- `database/migrations/add_ha_flow_steps.sql` - Database migration adds HA flow steps to config_flows table constraint
- Config entry created with `base_url` and `access_token` in `data` field, status "loaded"
- Integration registry entry created with status "loaded" after successful validation
- Flow cleanup: flow deleted after completion
- Type safety: FlowStep type updated to include `enter_connection` and `validate_connection` steps

### Task 27: Home Assistant REST API Client — ✅ DONE

**Description:**
Build a REST API client service for communicating with Home Assistant's REST API. This client handles authentication using long-lived access tokens, implements core endpoints for state retrieval and service calls, and includes robust error handling and retry logic.

**Requirements:**

- Create `lib/home-assistant/rest-client.ts` service
- Implement `GET /api/states` and `POST /api/services/{domain}/{service}` clients
- Handle HA authentication, error handling, retry logic

**Evidence:** `lib/home-assistant/rest-client.ts` - Complete REST client with `getStates()` and `callService()` methods, Bearer token authentication, exponential backoff retry logic, error handling, URL normalization, and credential caching.

### Task 28: Home Assistant Entity Synchronization — ✅ DONE

**Description:**
Implement entity synchronization service that performs an initial sync of all entities from Home Assistant into the Bairuha entity registry. This service fetches HA entities, creates corresponding Bairuha entities with proper source attribution, and handles ID collisions and entity updates.

**Requirements:**

- Create `lib/home-assistant/entity-sync.ts` service
- Initial entity sync from HA (`GET /api/states`)
- Create Bairuha entities from HA entities
- Add `ha_entity_id` and `source` fields to `entities` table
- Handle entity ID collisions and updates

**Evidence:** `lib/home-assistant/entity-sync.ts` - Complete sync service with `syncEntitiesFromHA()` function, conflict resolution via `entityConflictResolver`, duplicate prevention, hybrid entity merging, deletion detection, and comprehensive error handling. Creates/updates entities with proper source attribution ('ha', 'internal', 'hybrid').

### Task 29: Home Assistant WebSocket Client — ✅ DONE

**Description:**
Build a WebSocket client that connects to Home Assistant's WebSocket API, authenticates, and subscribes to `state_changed` events. This client converts HA events into Bairuha's event format and feeds them into the existing WebSocket pipeline, ensuring real-time state synchronization. Includes reconnection logic and health monitoring.

**Requirements:**

- Create `lib/home-assistant/websocket-client.ts` service
- WebSocket connection to HA, authenticate, subscribe to `state_changed` events
- Convert HA events → Bairuha events, feed into existing WebSocket pipeline
- Handle reconnection logic and connection health monitoring

**Evidence:** `lib/home-assistant/websocket-client.ts` - Complete WebSocket client with `HAWebSocketClient` class, authentication flow, `state_changed` event subscription, automatic reconnection with exponential backoff, ping/pong health monitoring, event conversion via `handleHAEntityUpdate()`, and singleton pattern with `initializeHAWebSocket()` function.

- [x] **Task 30: Home Assistant Service Call Integration** <!-- id: 30 -->
  - **Description**: Implement a service that maps Bairuha UI commands to Home Assistant service calls.
  - **Status**: **Complete**
  - **Evidence**: `OverviewPanel` invokes `/api/commands`, which uses `HAServiceCallService` to execute `turn_on`/`turn_off` safely via HA REST API.

### Task 31: Entity Source Attribution and Conflict Resolution — ✅ DONE

**Description:**
Implement entity source tracking and conflict resolution logic. Add database fields to track whether entities originate from Home Assistant, are internal-only, or are hybrid. Implement logic to prevent duplicates, handle entity deletions/updates from HA, and support entities that exist only in one system.

**Requirements:**

- Add `source` field ('ha', 'internal', 'hybrid') and `ha_entity_id` field to `entities` table
- Prevent duplicate entities, handle entity deletion/updates from HA
- Support internal-only and HA-only entities

**Evidence:**

- `database/migrations/013_add_ha_entity_fields.sql` - Adds `ha_entity_id` and `source` columns with constraints
- `database/migrations/014_enhance_entity_source_constraints.sql` - Adds check constraint ensuring HA/hybrid entities have `ha_entity_id`, internal entities don't
- `lib/home-assistant/entity-conflict-resolution.ts` - Conflict detection and resolution logic
- `lib/home-assistant/duplicate-prevention.ts` - Duplicate prevention service
- `lib/home-assistant/entity-deletion-detector.ts` - Handles entity deletions from HA
- `lib/home-assistant/hybrid-entity-manager.ts` - Manages hybrid entities (internal + HA)

---

## 🔹 SYSTEM POLISH

### Task 32: Implement area → entity mapping — 🟡 PARTIALLY DONE

**Description:**
Implement the area-to-entity mapping system that allows entities to be organized into areas (rooms, zones, etc.). This enables spatial organization of devices and entities for better UI organization and automation targeting.

**Status:** Areas table exists, but mapping not fully implemented.
**Evidence:** `database/migrations/add_registries_tables.sql` - areas table exists

### Task 33: Add permissions & roles — 🟡 PARTIALLY DONE

**Description:**
Implement a role-based access control (RBAC) system with permissions and roles. This allows fine-grained control over what users can do in the system (view entities, control devices, manage automations, etc.) and supports multi-user scenarios.

**Status:** Basic user system exists, but permissions/roles not implemented.
**Evidence:** `users` table exists. No permissions/roles tables or checks.

### Task 34: Add reliability handling — 🟡 PARTIALLY DONE

**Description:**
Implement reliability and resilience features for Home Assistant connectivity. Detect when HA is offline and mark affected entities as unavailable, queue commands for later execution, detect stale state, implement retry logic, and provide health check endpoints for monitoring.

**Requirements:**

- Detect when HA is offline, mark entities as "unavailable"
- Queue commands when HA offline, execute when HA returns
- Handle stale state detection, retry logic, health check endpoint

**Status:** Command queuing and basic offline detection implemented, but comprehensive reliability system not complete.

**Evidence:**

- `lib/home-assistant/service-call.ts` - Command queuing when HA offline (✅), HA online detection with caching (✅), `processQueuedCommands()` method (✅)
- `lib/home-assistant/websocket-client.ts` - Health monitoring via ping/pong (✅), reconnection logic (✅)
- `lib/home-assistant/rest-client.ts` - Retry logic with exponential backoff (✅)
- `lib/home-assistant/entity-update-handler.ts` - Marks entities as "unavailable" when HA offline (✅)
- `lib/home-assistant/entity-deletion-detector.ts` - Handles entity unavailability marking (✅)
- `app/api/dev-tools/system/health/route.ts` - Health check API endpoint (✅)
- `lib/dev-tools/system-info.ts` - Comprehensive health check service with database, HA, and WebSocket checks (✅)
- ❌ Missing: Stale state detection

### Task 35: Implement Dev-Only Device Registration — ✅ DONE

**Description:**
Create a development-only API endpoint that allows quick device registration for testing purposes without going through the full config flow. This endpoint bypasses normal validation and setup steps to speed up development and testing workflows.

**Evidence:** `app/api/devices/dev-register/route.ts` - Dev endpoint functional

### Task 36: Implement Configure Step UI — ✅ DONE

**Description:**
Build the user interface component for the configuration step of the device setup flow. This UI dynamically renders forms based on integration schemas, collects user input, validates data, and submits configuration to the backend.

**Evidence:** `components/addDevice/client/ConfigureStep.client.tsx` - Dynamic form rendering

---

## 🔹 AUTOMATION LAYER

### Task 37: Create automation registry — ✅ DONE

**Description:**
Create the database schema and service layer for storing automation rules. The automation registry stores trigger conditions, action sequences, and automation metadata, enabling users to define automated behaviors for their smart home.

**Evidence:**

- `database/migrations/add_registries_tables.sql` - `automations` table with trigger, condition, action JSONB fields
- `components/globalAdd/server/automation.registry.ts` - Full CRUD service (getAllAutomations, getAutomationById, createAutomation, updateAutomation, deleteAutomation)

### Task 38: Build automation engine — ❌ NOT DONE

**Description:**
Implement the automation execution engine that listens to entity state change events, evaluates trigger conditions, checks action prerequisites, and executes automation actions (typically Home Assistant service calls). The engine supports enabling/disabling automations, logging executions, and handling errors gracefully.

**Requirements:**

- Listen to `entity_state_changed` events (Task 24)
- Evaluate triggers, conditions, execute actions (HA service calls)
- Support enable/disable, log executions, handle errors

---

## 🔹 MAJOR COMPONENTS

### Task 39: Implement State History Persistence — ✅ DONE

**Description:**
Build a state history system that records entity state changes over time, enabling historical data visualization and analysis. This includes creating the database schema, implementing a recorder service that captures state changes, building query APIs for retrieving historical data, and connecting the History panel to real data.

**Requirements:** Create `state_history` table, implement recorder service, build history query APIs, connect History panel to real data

**Evidence:**
- `database/migrations/017_add_state_history_table.sql` - Complete state_history table with indexes
- `lib/history/state-history-recorder.ts` - Recorder service with event listening and cleanup
- `app/api/history/route.ts` - History query API with filtering, pagination, time range support

### Task 40: Implement Scenes System — ❌ NOT DONE

**Description:**
Implement a scenes system that allows users to save and recall specific entity states (e.g., "Movie Night" scene sets lights to dim, closes blinds, turns on TV). This includes database storage, scene registry service, activation API, and UI for creating and managing scenes.

**Requirements:** Create `scenes` table, build scene registry service, implement scene activation API, create scene management UI

### Task 41: Implement Groups System — ✅ DONE

**Description:**
Build a groups system that allows multiple entities to be organized into logical groups (e.g., "Living Room Lights"). Groups support aggregated state (all on/all off/mixed) and allow controlling all group members simultaneously. Includes database schema, registry service, control APIs, and state aggregation logic.

**Requirements:** Create `groups` table, build group registry service, implement group control APIs, handle group state aggregation

**Evidence:**
- `database/migrations/018_add_groups_tables.sql` - Complete groups and group_members tables with indexes
- `components/globalAdd/server/group.registry.ts` - Full CRUD service with state aggregation calculation
- `app/api/registries/groups/route.ts` - Groups CRUD APIs (GET all, POST create)
- `app/api/groups/[groupId]/control/route.ts` - Group control API for simultaneous member control
- `components/globalAdd/server/group.state-aggregator.ts` - State aggregation logic listening to entity changes
- `components/globalAdd/server/group.events.ts` - Group state change events

### Task 42: Implement Scripts System — ❌ NOT DONE

**Description:**
Implement a scripts system that allows users to create reusable sequences of actions (service calls, delays, conditions). Scripts can be executed on-demand or triggered by automations. Includes database storage, registry service, execution engine, and a UI for creating and editing scripts.

**Requirements:** Create `scripts` table, build script registry service, implement script execution engine, create script editor UI

### Task 43: Implement Activity/Event Log Backend — ❌ NOT DONE

**Description:**
Build an activity/event logging system that records system events (entity state changes, automation executions, user actions, etc.) for auditing and debugging purposes. Includes database schema, logging service, query APIs, and integration with the Activity panel UI.

**Requirements:** Create `events` or `activity_log` table, log system events, build event query APIs, connect Activity panel to real data

### Task 44: Connect History Panel to Real Data — ✅ DONE

**Description:**
Connect the History panel UI component to the state history persistence system, enabling users to view historical entity state changes, filter by time range, and visualize state trends over time. This task depends on Task 39 being completed first.

**Evidence:**
- `components/panels/history/history-panel.tsx` - History panel component with full API integration
- `app/(dashboard)/history/page.tsx` - History page route
- Panel fetches data from `/api/history` endpoint with filtering by entity_id, start_time, end_time
- Displays historical state changes with chart visualization
- Supports time range filtering (1h, 24h, 7d, 30d)
- Real-time data fetching and visualization

**Dependencies:** Task 39 ✅ (State History Persistence - Complete)

### Task 45: Implement Notifications System — ✅ DONE

**Description:**
Build a notifications system that allows the system to send alerts, warnings, and informational messages to users. Notifications are stored in the database, delivered in real-time via WebSocket, and displayed in a notification UI. Supports different notification types and user preferences.

**Requirements:** Create `notifications` table, build notification service, implement notification APIs, create notification UI, real-time delivery via WebSocket

**Evidence:**
- `database/migrations/019_add_notifications_table.sql` - Notifications table
- `components/globalAdd/server/notification.service.ts` - Notification service

### Task 46: Implement Developer Tools Backend — ✅ DONE

**Description:**
Create a comprehensive developer tools backend that provides APIs for debugging and development: state inspection (view current entity states), service call testing (manually trigger service calls), event triggering (emit test events), template testing (validate template expressions), and system information (health, version, configuration).

**Requirements:** Build state inspection APIs, service call APIs, event trigger APIs, template testing APIs, system information APIs

**Evidence:**
- `app/api/dev-tools/entities/route.ts` - State inspection API with filtering
- `app/api/dev-tools/entities/[entityId]/route.ts` - Entity detail API
- `app/api/dev-tools/service-call/route.ts` - Service call testing API
- `app/api/dev-tools/events/trigger/route.ts` - Event triggering API
- `app/api/dev-tools/events/types/route.ts` - Event types API
- `app/api/dev-tools/templates/test/route.ts` - Template testing API
- `app/api/dev-tools/templates/validate/route.ts` - Template validation API
- `app/api/dev-tools/system/health/route.ts` - System health API
- `app/api/dev-tools/system/info/route.ts` - System info API
- `app/api/dev-tools/system/config/route.ts` - System config API
- `lib/dev-tools/state-inspector.ts` - State inspection service
- `lib/dev-tools/service-call-tester.ts` - Service call testing service
- `lib/dev-tools/event-trigger.ts` - Event triggering service
- `lib/dev-tools/template-tester.ts` - Template testing service
- `lib/dev-tools/system-info.ts` - System information service

### Task 47: Implement Developer Tools UI — ✅ DONE

**Description:**
Create a user interface panel for developer tools that provides easy access to debugging and development features. The UI should include tabs for state inspection, service call testing, event triggering, template testing, and system information, making the developer tools APIs accessible to users without requiring direct API calls.

**Requirements:**
- Create `components/panels/dev-tools/dev-tools-panel.tsx` UI component
- Implement tabbed interface for different developer tool categories
- State inspection UI with filtering and entity browsing
- Service call testing UI with domain/service selection and parameter input
- Event triggering UI with event type selection and payload input
- Template testing UI with template editor and result display
- System information UI displaying health, version, and configuration
- Real-time updates for state inspection
- Error handling and user feedback

**Dependencies:** Task 46 ✅ (Developer Tools Backend)

**Evidence:**
- `components/panels/dev-tools/dev-tools-panel.tsx` - Main panel component with tabbed interface
- `components/panels/dev-tools/tabs/state-inspection-tab.tsx` - State inspection with filtering, pagination, real-time updates via WebSocket
- `components/panels/dev-tools/tabs/service-call-tab.tsx` - Service call testing with JSON editor and example presets
- `components/panels/dev-tools/tabs/event-trigger-tab.tsx` - Event triggering with event type selector and metadata support
- `components/panels/dev-tools/tabs/template-test-tab.tsx` - Template testing with validation and example templates
- `components/panels/dev-tools/tabs/system-info-tab.tsx` - System information with health status, auto-refresh, and configuration viewer
- `components/panels/dev-tools/hooks/useStateInspection.ts` - Hook for entity inspection with filtering
- `components/panels/dev-tools/hooks/useServiceCall.ts` - Hook for service call execution
- `components/panels/dev-tools/hooks/useEventTrigger.ts` - Hook for event triggering with event types fetching
- `components/panels/dev-tools/hooks/useTemplateTest.ts` - Hook for template testing and validation
- `components/panels/dev-tools/hooks/useSystemInfo.ts` - Hook for system information with auto-refresh
- `app/(dashboard)/dev-tools/page.tsx` - Route page for developer tools panel
- Real-time entity updates via `useEntitySubscriptions` hook in state inspection tab
- JSON formatting, copy-to-clipboard, error handling, and loading states throughout
- Material-UI components with responsive design and accessibility support

### Task 48: Implement To-do Lists System — ✅ DONE

**Description:**
Implement a to-do lists system that allows users to create, manage, and track tasks within the smart home interface. Includes database schema for lists and items, full CRUD APIs, and a UI panel for viewing and managing to-dos. Can integrate with automations to create task reminders.

**Requirements:** Create `todo_lists` and `todo_items` tables, build to-do CRUD APIs, create to-do lists UI panel

**Evidence:**
- `database/migrations/020_add_todo_tables.sql` - Todo tables
- `components/globalAdd/server/todo.registry.ts` - Todo registry service

### Task 49: Implement Dashboard Customization (Lovelace) — ❌ NOT DONE

**Description:**
Build a dashboard customization system inspired by Home Assistant's Lovelace UI, allowing users to create custom dashboards with various card types (entity cards, graph cards, picture cards, etc.). Includes database storage for dashboard configurations, a configuration service, and a visual dashboard editor UI.

**Requirements:** Create `dashboards` and `dashboard_cards` tables, build dashboard configuration service, implement dashboard editor UI

### Task 50: Implement Backup and Recovery System — ❌ NOT DONE

**Description:**
Create a backup and recovery system that allows users to backup their entire system configuration (entities, devices, automations, scenes, etc.) and restore from backups. Includes a backup service, REST APIs for backup/restore operations, UI for managing backups, and support for scheduled automatic backups.

**Requirements:** Build backup service, implement backup API, create backup/restore UI, support scheduled backups

### Task 51: Implement Testing Infrastructure — ❌ NOT DONE

**Description:**
Establish a comprehensive testing infrastructure including unit and integration testing frameworks, test database setup and teardown utilities, test coverage for critical code paths, and CI/CD pipeline integration. This ensures code quality and prevents regressions.

**Requirements:** Set up unit/integration testing framework, create test database setup/teardown, write tests for critical paths, set up CI/CD

### Task 52: Create API Documentation — ❌ NOT DONE

**Description:**
Create comprehensive API documentation covering all REST API endpoints and WebSocket events. Generate an OpenAPI/Swagger specification for automated documentation, and host the documentation in an accessible format for developers and integrators.

**Requirements:** Document all REST APIs and WebSocket events, create OpenAPI/Swagger specification, host documentation

### Task 53: Implement Mobile App (Optional) — ❌ NOT DONE

**Description:**
Develop a mobile application (either Progressive Web App or native app) with a mobile-optimized user interface for controlling the smart home on-the-go. Includes push notification support for alerts and events, offline mode for viewing cached data, and responsive design for various screen sizes.

**Requirements:** Design mobile-optimized UI, implement push notifications, support offline mode, PWA or native app

### Task 54: Enhance Entity Attributes Support — 🟡 PARTIALLY DONE

**Description:**
Enhance the entity attributes system to fully support Home Assistant's attribute model, ensuring all HA entity attributes are properly stored, displayed, and accessible. This includes expanding the attributes schema, handling complex attribute types, and ensuring UI components can render all attribute types correctly.

**Status:** Basic entity attributes exist, but may need expansion for full Home Assistant compatibility.
**Evidence:** `entities` table has `attributes` JSONB field

---

## 🔹 ADVANCED INTEGRATION & CONFIG FLOW LAYER

### Task 55: Import Full Home Assistant Integration Catalog — ✅ DONE

**Description:**
Import the complete Home Assistant integration catalog (2000+ integrations) from Home Assistant's source code or API. This includes scraping/parsing integration manifest.json files, extracting metadata (domain, name, icon, flow type, dependencies), and bulk importing into the integration catalog database.

**Requirements:**
- Create script to import from Home Assistant GitHub repository or API
- Parse manifest.json files from `homeassistant/components/` directory
- Extract integration metadata (domain, name, description, icon, config_flow type, dependencies, etc.)
- Bulk import into `integration_catalog` table
- Handle duplicates and updates
- Support manual curation for quality control

**Dependencies:** Task 3 ✅ (integration catalog schema), Task 4 ✅ (basic seeding)

**Evidence:**
- `scripts/import-ha-integrations.ts` - Complete import script with GitHub API client, manifest parsing, bulk import with upsert logic, dry-run mode, progress reporting, error handling, and rate limiting
- `scripts/__tests__/import-ha-integrations.test.ts` - Comprehensive test suite with 35 tests covering manifest mapping, icon inference, GitHub API integration, import logic, error handling, edge cases, and integration scenarios (all passing)
- `package.json` - Added `import-ha-catalog` script command
- `TASK_55_PROMPT.md` - Implementation prompt and documentation
- Features: GitHub API integration with retry logic, rate limiting (60/hour unauthenticated, 5000/hour authenticated), manifest.json parsing, metadata extraction and mapping, cloud vs local detection, device support detection, icon inference, bulk import with transactions, upsert handling, dry-run mode, progress reporting, error handling and reporting
 
### Task 56: Extend Catalog Schema for Flow Metadata — ✅ DONE

**Description:**
Extend the integration catalog database schema to store flow type information and flow configuration metadata. This enables the system to know which flow type each integration uses (none, manual, discovery, OAuth, wizard, hybrid) and store flow-specific configuration.

**Requirements:**
- Add `flow_type` column to `integration_catalog` table (enum: 'none', 'manual', 'discovery', 'oauth', 'wizard', 'hybrid')
- Add `flow_config` JSONB column for flow-specific configuration
- Add `handler_class` column (optional, for custom flow handlers)
- Add `metadata` JSONB column for flexible additional fields
- Create migration script
- Update catalog seed/import scripts to populate flow metadata

**Dependencies:** Task 3 ✅ (integration catalog schema), Task 55 ✅ (full catalog import)

**Evidence:**
- `database/migrations/023_add_flow_metadata_to_catalog.sql` - Complete migration adding flow_type, flow_config, handler_class, and metadata columns
- Migration includes CHECK constraint for flow_type enum, indexes, and default values
- Updates existing rows with default flow_type 'manual'

### Task 57: Implement Flow Type System — ✅ DONE

**Description:**
Build a flow type detection and routing system that categorizes integrations by their setup flow type and routes users to the appropriate flow handler. This system reads flow metadata from the catalog and determines which flow steps to execute.

**Requirements:**
- Create flow type detection service
- Map integration domains to flow types
- Flow type resolver that reads from catalog
- Flow handler registry for routing
- Support for default flow types (none, manual) and advanced types (discovery, OAuth, wizard, hybrid)
- Fallback logic for integrations without flow metadata

**Dependencies:** Task 12 ✅ (config flow engine), Task 56 ✅ (flow metadata schema)

**Evidence:**
- `lib/config-flow/flow-type-resolver.ts` - Complete flow type resolver with caching
- `lib/config-flow/flow-handler-registry.ts` - Flow handler registry with support for all flow types
- `lib/config-flow/handlers/` - All flow handlers (manual, discovery, oauth, wizard, none, hybrid)
- Supports reading from both catalog and flow definitions table
- Includes fallback logic for integrations without flow metadata

### Task 58: Implement Discovery-Based Config Flows — ✅ DONE

**Description:**
Implement discovery-based configuration flows that automatically discover devices on the network (e.g., MQTT, ESPHome, Zigbee) and allow users to select from discovered devices. This includes discovery service framework, discovery handlers for different protocols, and discovery step UI component.

**Requirements:**
- Create discovery service framework
- Implement discovery handlers for MQTT, ESPHome, Zigbee, Z-Wave, etc.
- Discovery step UI component showing discovered devices
- Device selection from discovered list
- Auto-populate device information from discovery
- Discovery refresh/retry mechanism
- Fallback to manual entry if discovery fails

**Dependencies:** Task 12 ✅ (config flow engine), Task 57 ✅ (flow type system), Task 9 ✅ (device registry)

**Evidence:**
- `lib/discovery/discovery-service.ts` - Complete discovery service framework
- `lib/discovery/discovery-handler.ts` - Base discovery handler interface and implementation
- `lib/config-flow/handlers/discovery-flow-handler.ts` - Discovery flow handler
- Supports multiple protocols (DHCP, Zeroconf, SSDP, HomeKit, MQTT, ESPHome, Zigbee, Z-Wave)
- Includes discovery caching, refresh/retry, and fallback to manual entry

### Task 59: Implement OAuth-Based Config Flows — ✅ DONE

**Description:**
Implement OAuth-based configuration flows for integrations that require OAuth authentication (e.g., Google, Spotify, Nest). This includes OAuth provider configuration, redirect handling, token exchange, secure token storage, and OAuth step UI component.

**Requirements:**
- OAuth provider configuration system
- OAuth redirect handling and callback processing
- Token exchange (authorization code → access token)
- Secure token storage in config entries
- OAuth step UI component with redirect flow
- Token refresh mechanism
- Support for multiple OAuth providers (Google, Spotify, etc.)

**Dependencies:** Task 12 ✅ (config flow engine), Task 57 ✅ (flow type system), Task 14 ✅ (config entries registry)

**Evidence:**
- `lib/oauth/oauth-service.ts` - Complete OAuth service with PKCE support
- `lib/oauth/oauth-provider-config.ts` - OAuth provider configuration system
- `lib/oauth/oauth-token-storage.ts` - Secure token storage
- `lib/config-flow/handlers/oauth-flow-handler.ts` - OAuth flow handler
- Supports authorization URL generation, token exchange, refresh, and secure storage

### Task 60: Implement Multi-Step Wizard Flows — ✅ DONE

**Description:**
Implement multi-step wizard configuration flows for complex integrations that require multiple configuration steps. This includes wizard step component, step progression logic, step validation, progress indicator, and support for conditional steps.

**Requirements:**
- Wizard step component with step navigation
- Step progression logic (next/back navigation)
- Step-by-step validation
- Progress indicator showing current step
- Support for conditional steps (show/hide based on previous answers)
- Step data persistence across navigation
- Step summary/review before confirmation

**Dependencies:** Task 12 ✅ (config flow engine), Task 57 ✅ (flow type system), Task 36 ✅ (configure step UI)

**Evidence:**
- `lib/config-flow/handlers/wizard-flow-handler.ts` - Complete wizard flow handler
- `components/addDevice/client/WizardStep.client.tsx` - Wizard step UI component
- Supports conditional steps, step validation, progress indicators
- Includes step data persistence and conditional step logic

### Task 61: Create Flow Definition Storage System — ✅ DONE

**Description:**
Create a database system for storing flow definitions that define the exact steps, validation rules, and UI components for each integration's setup flow. This enables dynamic flow rendering based on stored definitions rather than hardcoded logic.

**Requirements:**
- Create `integration_flow_definitions` table
- Store flow type, step definitions, validation rules in JSONB
- Flow definition schema/format
- Flow definition CRUD APIs
- Flow definition versioning
- Support for custom flow handlers
- Migration from hardcoded flows to stored definitions

**Dependencies:** Task 12 ✅ (config flow engine), Task 56 ✅ (flow metadata schema)

**Evidence:**
- `database/migrations/024_add_integration_flow_definitions_table.sql` - Complete flow definitions table
- `lib/config-flow/flow-definition.registry.ts` - Full CRUD service for flow definitions
- `lib/config-flow/flow-definition.types.ts` - Flow definition types and schemas
- `lib/config-flow/flow-definition.validator.ts` - Flow definition validation
- Supports versioning, activation, and custom handlers
- `scripts/migrate-hardcoded-flows.ts` - Migration script for hardcoded flows

### Task 62: Implement Dynamic Step Rendering Engine — ✅ DONE

**Description:**
Build a dynamic step rendering engine that reads flow definitions from the database and renders the appropriate UI component for each step. This engine routes to different step components (manual, discovery, OAuth, wizard) based on flow type and step definition.

**Requirements:**
- Step resolver service that reads flow definitions
- Dynamic routing to appropriate step component
- Step component registry (ManualConfigStep, DiscoveryStep, OAuthStep, WizardStep, HybridStep)
- Conditional step logic (branching based on user input)
- Step validation engine
- Error handling and recovery
- Support for custom step components

**Dependencies:** Task 12 ✅ (config flow engine), Task 57 ✅ (flow type system), Task 61 ✅ (flow definition storage), Task 36 ✅ (configure step UI)

**Evidence:**
- `lib/config-flow/flow-handler-registry.ts` - Complete flow handler registry with all flow types
- `lib/config-flow/flow-definition.loader.ts` - Flow definition loader with caching and fallback
- `lib/config-flow/handlers/` - All flow handlers (manual, discovery, oauth, wizard, none, hybrid)
- Dynamic routing based on flow type and step definitions
- Supports conditional step logic and validation

### Task 63: Extend Config Schema for Advanced Field Types — ✅ DONE

**Description:**
Extend the integration config schema system to support advanced field types and behaviors including conditional fields, field dependencies, dynamic options (dropdowns from API), file uploads, and nested objects/arrays.

**Requirements:**
- Conditional field support (show/hide based on other field values)
- Field dependency system (field B depends on field A)
- Dynamic options (dropdown populated from API call)
- File upload field type (for certificates, images, etc.)
- Nested object/array field types
- Field validation rules (regex, custom validators)
- Field help text and tooltips
- Update config schema format and validation

**Dependencies:** Task 13 ✅ (configure step), Task 36 ✅ (configure step UI)

**Evidence:**
- `components/addDevice/server/integration-config-schemas.ts` - Complete schema with all advanced field types (select, multiselect, file, object, array), conditional fields, dynamic options, file config, nested structures, advanced validation, and field help
- `lib/config-flow/conditional-field-engine.ts` - Complete conditional field engine with condition evaluation, field visibility, dependency resolution
- `components/addDevice/client/fields/SelectField.tsx` - Select/multiselect field with dynamic options support
- `components/addDevice/client/fields/FileUploadField.tsx` - File upload field component
- `components/addDevice/client/fields/ObjectField.tsx` - Nested object field component
- `components/addDevice/client/fields/ArrayField.tsx` - Array field component with add/remove
- `components/addDevice/client/fields/FieldWrapper.tsx` - Field wrapper with conditional logic and help
- `components/addDevice/client/fields/FieldHelp.tsx` - Field help text and tooltip component
- `components/addDevice/client/fieldRenderer.tsx` - Field renderer routing to all field types
- `components/addDevice/client/ConfigureStep.client.tsx` - Updated to support all advanced field types
- `components/addDevice/client/WizardStep.client.tsx` - Updated to support all advanced field types
- `lib/config-flow/file-storage.ts` - File storage service with upload, validation, deletion
- `app/api/config/file-upload/route.ts` - File upload API endpoint (POST/DELETE)
- `lib/config-flow/dynamic-options-resolver.ts` - Dynamic options resolver with API/field/static sources
- `app/api/config/dynamic-options/[integrationId]/[fieldName]/route.ts` - Dynamic options API endpoint
- `database/migrations/025_add_config_files_table.sql` - Database table for file metadata
- Enhanced validation engine with regex patterns, nested validation, cross-field validation, conditional field evaluation
- Tests: `app/api/config/__tests__/file-upload.route.test.ts`, `app/api/config/__tests__/dynamic-options.route.test.ts`, `components/addDevice/client/__tests__/ConfigureStep.advanced.test.tsx`

### Task 64: Catalog Sync and Update Mechanism — ✅ DONE

**Description:**
Implement a catalog synchronization and update mechanism that periodically syncs the integration catalog with Home Assistant's latest integrations, detects new integrations, updates existing ones, and handles version tracking.

**Requirements:**
- Periodic sync script (daily/weekly)
- Integration with Home Assistant GitHub/API
- Version tracking for integrations
- Incremental updates (only changed integrations)
- New integration detection
- Update notification system
- Manual refresh option
- Rollback mechanism for failed updates
- Sync status reporting

**Dependencies:** Task 55 ✅ (full catalog import), Task 56 ✅ (flow metadata schema)

**Evidence:**
- `database/migrations/026_add_catalog_sync_tracking.sql` - Complete migration adding version tracking columns, sync history and changes tables
- `lib/catalog-sync/version-tracker.ts` - Version hash calculation and storage
- `lib/catalog-sync/change-detector.ts` - Change detection service for new/updated/deleted integrations
- `lib/catalog-sync/sync-service.ts` - Main sync orchestration with full and incremental sync support
- `lib/catalog-sync/rollback-service.ts` - Snapshot creation and rollback mechanism
- `lib/catalog-sync/sync-scheduler.ts` - Periodic sync scheduler with cron support
- `lib/catalog-sync/sync-orchestrator.ts` - Main sync orchestrator coordinating all services
- `lib/catalog-sync/notification-service.ts` - Catalog update notifications
- `lib/catalog-sync/github-client.ts` - GitHub API client for fetching HA integrations
- `lib/catalog-sync/manifest-mapper.ts` - Manifest to catalog entry mapping
- `app/api/catalog/sync/route.ts` - Manual sync trigger and status APIs
- `app/api/catalog/sync/history/route.ts` - Sync history API with pagination
- `app/api/catalog/sync/[syncId]/rollback/route.ts` - Rollback API endpoint
- `components/admin/catalog-sync-panel.tsx` - Admin UI panel for sync management
- Comprehensive test suites for all sync services

---

## 🔹 CONFIG FLOW PARITY

**Evidence:** `lib/config-flow/logic/base-config-flow.ts` - Abstract base class with `step_user` method, `FlowResult` type definition, and helpers for forms, entries, aborts. Mirrors HA Python structure.
 
### Task 66: Implement Pre-Flow Discovery Checks — ✅ DONE

**Description:**
For integrations like HomeKit, Sonos, or Zeroconf-based ones, the flow must trigger a network scan *before* deciding what UI to show. If devices are found, prompt the user to select one. If not, show a manual IP entry form or an error.

**Requirements:**
- Update `startFlow` to accept an `initial_check` phase.
- Integrate with `DiscoveryService` to run specific protocol scans on-demand when a flow starts.
- Prevent "Generic Confirm" screens for discovery-dependent integrations.

**Evidence:** `lib/config-flow/logic/base-config-flow.ts` - `waitForDiscovery` method integrates with `discoveryService`. Handlers like `mqtt.ts` use this to check for devices before showing the user form.

### Task 67: Config Flow Logic Registry — ✅ DONE

**Description:**
Since we cannot execute HA's Python code directly for flow logic, build a TypeScript registry that maps domains to their specific flow logic (ported or emulated). This bridge ensures that clicking "HomeKit" executes the specific TS equivalent of `homekit_controller/config_flow.py`.

**Requirements:**
- Create `lib/config-flow/logic/` directory.
- Implement specific flow logic for top 20 most common integrations.
- Fallback to generic schema behavior for others.

**Evidence:** 
- `lib/config-flow/logic/index.ts` - Registry mapping domains to handlers.
- `lib/config-flow/logic/handlers/*.ts` - Implementations for MQTT, ESPHome, Z-Wave, Zigbee, Sonos, Hue, Google, Spotify, etc.
- `lib/config-flow/handlers/` - Handlers for various protocols.

---

### Task 68: Advanced Config Flow Parity & Reliability — ❌ NOT DONE

**Description:**
Address identified "loose ends" in the config flow system to ensure full parity with Home Assistant's advanced features. This includes implementing support for complex selectors in the proxy flow, building the client-side custom validation engine, and finalizing the file upload handling.

**Requirements:**
- **Proxy Selector Support:** Update `ha-proxy-config-flow.ts` to correctly map Home Assistant selectors (area, device, entity, color, etc.) to internal UI components instead of falling back to string inputs.
- **Custom Validation Engine:** Implement the missing validator loading and execution logic in `step-validation-engine.ts` to support integration-specific client-side validation.
- **File Upload Completion:** Finalize `FileUploadField.tsx` to correctly fetch and display file metadata, ensuring uploaded files are properly managed and associated with the config entry.
- **Update MQTT Logic:** Ensure MQTT handler uses the new validation and selector capabilities where appropriate.

**Dependencies:** Task 63 ✅ (Config Schema), Task 67 ✅ (Config Flow Logic)

---

## 🎯 NEXT CRITICAL PATH (TOP 5 TASKS)

### 1. Task 38: Build Automation Engine

**Why Critical:** Enables core automation functionality - automations are a fundamental smart home feature. The registry exists (Task 37 ✅), but automations cannot execute without the engine.
**Dependencies:** Task 37 ✅, Task 24 ✅ (entity state events), Task 30 ✅ (service calls)
**Estimated Impact:** Unblocks automation-based features and completes automation layer

### 2. Task 34: Complete Reliability Handling

**Why Critical:** Production readiness - system needs to gracefully handle HA offline scenarios, stale state, and provide health monitoring. Partial implementation exists (command queuing ✅), but missing entity state management and health endpoints.
**Dependencies:** Tasks 27-30 ✅
**Estimated Impact:** Improves system reliability and production readiness

### 3. Task 32: Complete Area → Entity Mapping

**Why Critical:** Enables spatial organization of devices and entities, improves UI organization and automation targeting. Areas table exists, but mapping logic missing.
**Dependencies:** Task 16 ✅ (entity registry)
**Estimated Impact:** Improves UI organization and automation capabilities

### 4. Task 40: Implement Scenes System

**Why Critical:** Core smart home feature - allows users to save and recall entity states. High user value feature.
**Dependencies:** Task 16 ✅ (entity registry), Task 30 ✅ (service calls)
**Estimated Impact:** High user value, enables scene-based automations

### 5. Task 42: Implement Scripts System

**Why Critical:** Enables users to create reusable action sequences that can be triggered on-demand or by automations. Complements automation system.
**Dependencies:** Task 16 ✅ (entity registry), Task 30 ✅ (service calls)
**Estimated Impact:** Enables script-based automation and manual execution workflows

---

## 📊 SUMMARY STATISTICS

**Task Completion:**

- ✅ DONE: 53 tasks (Foundations through Home Assistant Integration Layer + Task 35-37, 39, 41, 44, 45-48, 55-67)
- 🟡 PARTIALLY DONE: 5 tasks (Areas, Permissions, Reliability Handling, Entity Attributes, UI Entity Model)
- ❌ NOT DONE: 9 tasks (Automation Engine + remaining Major Components)

**Critical Path Status:**

- ✅ Foundations: 100% Complete (Tasks 1-2)
- ✅ Integration Layer: 100% Complete (Tasks 3-8)
- ✅ Device Layer: 100% Complete (Tasks 9-11)
- ✅ Config Flow Layer: 100% Complete (Tasks 12-15)
- 🟡 Entity Layer: 83% Complete (Tasks 16-20 ✅, Task 21 🟡)
- ✅ Real-Time Layer: 100% Complete (Tasks 22-25)
- ✅ **Home Assistant Integration: 100% Complete** (Tasks 26-31) - **COMPLETE**
- 🟡 System Polish: 60% Complete (Tasks 32-33 🟡, Task 34 🟡, Tasks 35-36 ✅)
- 🟡 Automation Layer: 50% Complete (Task 37 ✅, Task 38 ❌)
- 🟡 Major Components: 56% Complete (Tasks 39, 41, 44-48 ✅, Tasks 40, 42-43, 49-54 ❌)
- ✅ **Advanced Config Flow: 100% Complete** (Tasks 55-64 ✅) - **COMPLETE**
- ✅ **Config Flow Parity: 100% Complete** (Tasks 65-67 ✅) - **COMPLETE**

**Overall Progress: ~82% Complete** (55/67 tasks done, 3 partially done)

**Architecture Status:** ✅ **Core layers and Home Assistant integration complete** - System is ready for automation engine and major components. Home Assistant Integration Layer (Tasks 26-31) is fully implemented.

---

## 🗑️ DELETED / DEPRECATED CONCEPTS

The following concepts have been **explicitly removed** from the architecture:

### ❌ Agent-Based Architecture (FULLY REMOVED)

- No custom Raspberry Pi agent, agent registry, agent discovery, agent telemetry
- No agent command execution or heartbeat endpoints
- Devices discovered via Home Assistant, not agents
- Entity state updates come from Home Assistant WebSocket, not agent telemetry

### ❌ Dual State Ownership (FULLY REMOVED)

- No agent state vs Bairuha state conflict
- Only Home Assistant state_changed events update entity state
- Commands never mutate entity state directly

### ❌ Mixed Execution Models (FULLY REMOVED)

- No agent execution + internal execution hybrid
- All hardware execution via Home Assistant
- All automation execution in Bairuha HA

---

## 🏗️ ARCHITECTURE & CODE AUDIT

### Architectural Violations (Resolved / Identified)

- **Task 21 UI Cleanup (Resolved):** Identified a broken UI reference attempting HTTP entity state mutation (`PATCH /api/registries/entities/:id/state`). Endpoint does not exist, preventing violation. UI cleanup completed to remove mutation attempt. Entity controls are now disabled until Home Assistant service call integration (Task 30).

---

**Note:** This task list is the authoritative source for development. All tasks are evidence-based and architecture-compliant. Agent-based concepts have been fully removed and replaced with Home Assistant integration tasks.
