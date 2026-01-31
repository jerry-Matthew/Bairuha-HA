# TypeORM Migration - Full Backend Refactoring

## Overview
Migrate from raw SQL (pg) to TypeORM with auto-sync capabilities. This will enable automatic table generation when the project is cloned.

## Phase 1: Setup & Configuration (30 min)
- [ ] Install TypeORM dependencies
- [ ] Configure TypeORM in app.module.ts
- [ ] Set up database configuration
- [ ] Create base entity classes

## Phase 2: Create Entities (2-3 hours)
### Core Entities
- [ ] User entity (users table)
- [ ] Integration entity (integrations table)
- [ ] IntegrationCatalog entity (integration_catalog table)
- [ ] Device entity (devices table)
- [ ] EntityState entity (entity_states table)

### Feature Entities
- [ ] Dashboard entity (dashboards table)
- [ ] DashboardCard entity (dashboard_cards table)
- [ ] Activity entity (activity_logs table)
- [ ] Notification entity (notifications table)
- [ ] Setting entity (system_settings table)
- [ ] Group entity (groups table)
- [ ] GroupMember entity (group_members table)

### Media & HACS Entities
- [ ] MediaItem entity (media_items table)
- [ ] MediaPlaylist entity (media_playlists table)
- [ ] HacsRepository entity (hacs_repositories table)
- [ ] HacsInstallation entity (hacs_installations table)

### Additional Entities
- [ ] Flow entity (flows table)
- [ ] FlowStep entity (flow_steps table)
- [ ] Scene entity (scenes table)
- [ ] Automation entity (automations table)

## Phase 3: Create DTOs (1-2 hours)
For each entity, create:
- [ ] CreateDto (for POST requests)
- [ ] UpdateDto (for PATCH/PUT requests)
- [ ] ResponseDto (for GET responses)

## Phase 4: Refactor Services (2-3 hours)
### Services to Refactor
- [ ] UsersService - Replace pool.query with UserRepository
- [ ] IntegrationsService - Use IntegrationRepository
- [ ] DevicesService - Use DeviceRepository
- [ ] DashboardsService - Use DashboardRepository
- [ ] ActivityService - Use ActivityRepository
- [ ] NotificationsService - Use NotificationRepository
- [ ] SettingsService - Use SettingRepository
- [ ] GroupsService - Use GroupRepository
- [ ] MediaService - Use MediaRepository
- [ ] HacsService - Use HacsRepository

## Phase 5: Update Controllers (1 hour)
- [ ] Add validation pipes
- [ ] Update response types
- [ ] Add proper error handling

## Phase 6: Testing & Validation (1 hour)
- [ ] Test auto-sync on fresh database
- [ ] Verify all CRUD operations
- [ ] Test relationships
- [ ] Validate data integrity

## Phase 7: Cleanup (30 min)
- [ ] Remove old database.module.ts
- [ ] Remove pg pool provider
- [ ] Update scripts to use TypeORM CLI
- [ ] Update README with new setup instructions

## Estimated Total Time: 8-10 hours

## Breaking Changes
⚠️ This migration will:
- Replace all raw SQL queries
- Change service method signatures
- Require database reset (data loss)
- Update all imports across modules

## Rollback Plan
- Keep git branch before migration
- Backup current database
- Document all changes

## Next Steps
1. Review this plan
2. Backup current code
3. Start with Phase 1
