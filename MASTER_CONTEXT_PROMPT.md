🧠 BAIRUHA HA — MASTER ARCHITECTURE CONTEXT PROMPT

You are working on Bairuha HA, a Home Assistant–compatible home automation platform with a strictly enforced architecture.

This context is authoritative. All design, code, tasks, and decisions must conform to it.

🎯 SYSTEM GOAL

Build a full-featured Home Assistant–style automation system where:

Bairuha HA is the only UI, backend, database, and automation brain

Home Assistant (HA) runs headless on Raspberry Pi as a hardware runtime only

All hardware interaction flows through Home Assistant APIs, never directly to hardware

Bairuha HA controls logic, state, UI, and automations.
Home Assistant executes hardware actions and reports state changes.

🧩 HIGH-LEVEL ARCHITECTURE
[ Browser / Mobile UI ]
         |
         v
[ Bairuha HA Backend + DB ]  ← Next.js (authoritative brain)
         |
   REST + WebSocket
         |
         v
[ Home Assistant (Headless Runtime) ]  ← Raspberry Pi
         |
         v
[ Physical Hardware ]

🧠 AUTHORITY & OWNERSHIP MODEL
✅ Bairuha HA IS AUTHORITATIVE FOR:

Users, authentication, permissions

Devices and entities registry

Entity state (source of truth in DB)

Automations, scripts, scenes, groups

Dashboards and UI state

History, logs, notifications

✅ HOME ASSISTANT PROVIDES:

Hardware runtime (Zigbee, GPIO, MQTT, BLE, etc.)

Protocol adapters

REST API:

/api/states

/api/services

WebSocket API:

state_changed events

❌ MUST NEVER EXIST:

Custom Raspberry Pi agent

Agent registry, discovery, telemetry, heartbeat

Dual state ownership

Direct hardware control from Bairuha

Entity state mutation via HTTP APIs

Background polling agents

🔄 DATA FLOW RULES (NON-NEGOTIABLE)
1️⃣ STATE AUTHORITY

Only Home Assistant state_changed events may update entity state

No REST or UI endpoint may directly mutate entity state

Entity state updates always flow HA → WebSocket → Bairuha

2️⃣ COMMAND FLOW
UI Action
 → Bairuha Command Intent
 → Home Assistant Service Call
 → HA Executes
 → HA Emits state_changed
 → Bairuha Updates Entity State
 → UI Updates via WebSocket


Commands never update entity state directly.

3️⃣ ENTITY SYNCHRONIZATION

Initial sync via HA REST API (/api/states)

Ongoing sync via HA WebSocket

Entities track:

source (ha, internal, hybrid)

ha_entity_id (when applicable)

🧱 CORE DOMAIN MODEL

Integration Catalog
Master list of supported brands/integrations

Integration Registry
Configured integrations with stored config entries

Config Flows
Backend-driven, step-based setup engine

Devices
Physical/logical devices owned by integrations

Entities
The only stateful and controllable units
(lights, switches, sensors, etc.)

Commands
Intent records only — never execution or state mutation

Events
Entity-centric (entity_state_changed)

🔌 HOME ASSISTANT INTEGRATION PRINCIPLES

Home Assistant is treated as one integration

Connected via:

REST client (states + service calls)

WebSocket client (state updates)

Long-lived access tokens stored securely

Multiple HA instances may be supported

HA downtime must be handled gracefully

🧪 DEVELOPMENT RULES

No feature is “done” unless:

Schema → Service → API → Consumer exists

Architecture rules are respected

No “temporary” shortcuts that violate the model

UI must reflect system capability honestly

If HA is not connected, entity control must be disabled

All decisions must remain HA-compatible long-term

🗑️ EXPLICITLY REMOVED CONCEPTS

The following are permanently banned:

Agent-based execution models

Agent discovery / telemetry / command polling

HTTP-based entity state mutation

Mixed execution responsibility

Shadow state outside Home Assistant events

🧭 MENTAL MODEL TO KEEP

Bairuha HA thinks.
Home Assistant acts.
Home Assistant reports.
Bairuha HA decides what it means.

🛑 FINAL INSTRUCTION

When implementing features, writing tasks, auditing code, or proposing changes:

Assume this context is already agreed upon

Do not reintroduce removed concepts

Do not bypass Home Assistant

Do not mutate entity state directly

Do not guess — follow evidence

This document is the single source of architectural truth.