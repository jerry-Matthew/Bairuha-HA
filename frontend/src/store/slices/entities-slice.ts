import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import type { Entity } from "@/types";

interface EntitiesState {
  entities: Entity[];
}

const initialState: EntitiesState = {
  entities: [],
};

export const entitiesSlice = createSlice({
  name: "entities",
  initialState,
  reducers: {
    setEntities: (state, action: PayloadAction<Entity[]>) => {
      state.entities = action.payload;
    },
    updateEntity: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<Entity> }>
    ) => {
      const { id, updates } = action.payload;
      const entityIndex = state.entities.findIndex((e) => e.id === id);
      if (entityIndex >= 0) {
        const entity = state.entities[entityIndex];
        // Create a new entity object to ensure Immer detects the change
        // This ensures React re-renders when entity state changes
        state.entities[entityIndex] = {
          ...entity,
          ...updates,
        };
      }
    },
    updateEntityByEntityId: (
      state,
      action: PayloadAction<{ entityId: string; updates: Partial<Entity> }>
    ) => {
      const { entityId, updates } = action.payload;
      const entityIndex = state.entities.findIndex((e) => e.entityId === entityId);

      if (import.meta.env.DEV) {
        console.log("[Redux] updateEntityByEntityId called:", {
          entityId,
          updates,
          foundEntityIndex: entityIndex,
          foundEntity: entityIndex >= 0 ? { id: state.entities[entityIndex].id, entityId: state.entities[entityIndex].entityId, currentState: state.entities[entityIndex].state } : null,
          totalEntities: state.entities.length,
        });
      }

      if (entityIndex >= 0) {
        const entity = state.entities[entityIndex];
        const oldState = entity.state;

        // Create a new entity object with all updates applied
        // This ensures Immer detects the change and React re-renders
        const updatedEntity: Entity = {
          ...entity,
          state: updates.state !== undefined ? updates.state : entity.state,
          attributes: updates.attributes !== undefined ? updates.attributes : entity.attributes,
          lastChanged: updates.lastChanged !== undefined ? updates.lastChanged : entity.lastChanged,
          lastUpdated: updates.lastUpdated !== undefined ? updates.lastUpdated : entity.lastUpdated,
        };

        // Replace the entity in the array - Immer will create a new array reference
        state.entities[entityIndex] = updatedEntity;

        if (import.meta.env.DEV) {
          console.log("[Redux] Entity updated successfully:", {
            entityId: updatedEntity.entityId,
            oldState,
            newState: updatedEntity.state,
            entityObjectChanged: entity !== updatedEntity,
          });
        }
      } else {
        console.warn("[Redux] Entity not found for update:", {
          entityId,
          availableEntityIds: state.entities.map(e => e.entityId),
        });
      }
    },
    addEntities: (
      state,
      action: PayloadAction<Entity[]>
    ) => {
      const newEntities = action.payload;

      if (import.meta.env.DEV) {
        console.log("[Redux] addEntities called:", {
          newEntitiesCount: newEntities.length,
          newEntityIds: newEntities.map(e => e.entityId),
          existingCount: state.entities.length,
        });
      }

      // Add new entities, avoiding duplicates by entityId
      for (const newEntity of newEntities) {
        const exists = state.entities.some(e => e.entityId === newEntity.entityId);
        if (!exists) {
          state.entities.push(newEntity);
        } else {
          if (import.meta.env.DEV) {
            console.log("[Redux] Skipping duplicate entity:", newEntity.entityId);
          }
        }
      }

      if (import.meta.env.DEV) {
        console.log("[Redux] Entities added successfully. Total entities:", state.entities.length);
      }
    },
  },
});

export const { setEntities, updateEntity, updateEntityByEntityId, addEntities } = entitiesSlice.actions;








