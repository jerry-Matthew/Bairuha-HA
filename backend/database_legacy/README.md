# Legacy Database Folder

This folder contains the original SQL schema and migration files commonly used in early development.

## ⚠️ Deprecated
This application is now configured as a **Code-First** project using TypeORM.
- The Single Source of Truth for the database schema is the typescript entities (`*.entity.ts` files) in `src/`.
- The database schema is automatically verified and synchronized by the application on startup (`synchronize: true`).

**Do NOT run the SQL files in this folder manually.** They may be outdated and cause conflicts with the current application state.

## Purpose
This folder is kept for archival and historical analysis purposes only.
