/**
 * Person Registry
 * 
 * Backend-owned registry for managing people in the system
 */

import { query } from "@/lib/db";
import type { Person } from "./registries.types";

/**
 * Get all people
 */
export async function getAllPeople(): Promise<Person[]> {
  const rows = await query<Person>(
    `SELECT id, name, photo_url as "photoUrl", user_id as "userId", created_at, updated_at
     FROM people
     ORDER BY name ASC`
  );
  return rows;
}

/**
 * Get person by ID
 */
export async function getPersonById(id: string): Promise<Person | null> {
  const rows = await query<Person>(
    `SELECT id, name, photo_url as "photoUrl", user_id as "userId", created_at, updated_at
     FROM people
     WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
}

/**
 * Create a new person
 */
export async function createPerson(person: Omit<Person, "id" | "created_at" | "updated_at">): Promise<Person> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await query(
    `INSERT INTO people (id, name, photo_url, user_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, person.name, person.photoUrl || null, person.userId || null, now, now]
  );

  const created = await getPersonById(id);
  if (!created) {
    throw new Error("Failed to create person");
  }
  return created;
}

/**
 * Update person
 */
export async function updatePerson(id: string, updates: Partial<Person>): Promise<Person> {
  const updatesList: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (updates.name !== undefined) {
    updatesList.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.photoUrl !== undefined) {
    updatesList.push(`photo_url = $${paramIndex++}`);
    values.push(updates.photoUrl);
  }
  if (updates.userId !== undefined) {
    updatesList.push(`user_id = $${paramIndex++}`);
    values.push(updates.userId);
  }

  updatesList.push(`updated_at = $${paramIndex++}`);
  values.push(new Date().toISOString());
  values.push(id);

  if (updatesList.length > 1) {
    await query(
      `UPDATE people SET ${updatesList.join(", ")} WHERE id = $${paramIndex}`,
      values
    );
  }

  const updated = await getPersonById(id);
  if (!updated) {
    throw new Error("Person not found");
  }
  return updated;
}

/**
 * Delete person
 */
export async function deletePerson(id: string): Promise<void> {
  await query("DELETE FROM people WHERE id = $1", [id]);
}

