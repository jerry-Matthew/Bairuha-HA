import { query, transaction } from "@/lib/db";

export interface Dashboard {
    id: string;
    title: string;
    icon?: string;
    url_path: string;
    order: number;
    cards?: DashboardCard[];
}

export interface DashboardCard {
    id: string;
    dashboard_id: string;
    type: string;
    config: Record<string, any>;
    order: number;
    width: number;
}

/**
 * Get all dashboards ordered by order field
 */
export async function getAllDashboards(): Promise<Dashboard[]> {
    return query<Dashboard>(
        `SELECT * FROM dashboards ORDER BY "order" ASC`
    );
}

/**
 * Get dashboard by URL path (e.g. 'overview')
 */
export async function getDashboardByPath(path: string): Promise<Dashboard | null> {
    const rows = await query<Dashboard>(
        `SELECT * FROM dashboards WHERE url_path = $1`,
        [path]
    );
    return rows[0] || null;
}

/**
 * Get dashboard by ID
 */
export async function getDashboardById(id: string): Promise<Dashboard | null> {
    const rows = await query<Dashboard>(
        `SELECT * FROM dashboards WHERE id = $1`,
        [id]
    );
    return rows[0] || null;
}

/**
 * Create a new dashboard
 */
export async function createDashboard(
    data: Omit<Dashboard, "id" | "order" | "created_at" | "updated_at">
): Promise<Dashboard> {
    // Get max order
    const orderResult = await query<{ max_order: number }>(
        `SELECT COALESCE(MAX("order"), -1) as max_order FROM dashboards`
    );
    const nextOrder = (orderResult[0]?.max_order ?? -1) + 1;

    const rows = await query<Dashboard>(
        `INSERT INTO dashboards (title, icon, url_path, "order")
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
        [data.title, data.icon, data.url_path, nextOrder]
    );
    return rows[0];
}

/**
 * Update dashboard metadata
 */
export async function updateDashboard(
    id: string,
    data: Partial<Pick<Dashboard, "title" | "icon" | "url_path">>
): Promise<Dashboard> {
    const updates: string[] = [];
    const values: any[] = [id];
    let paramIndex = 2;

    if (data.title !== undefined) {
        updates.push(`title = $${paramIndex++}`);
        values.push(data.title);
    }
    if (data.icon !== undefined) {
        updates.push(`icon = $${paramIndex++}`);
        values.push(data.icon);
    }
    if (data.url_path !== undefined) {
        updates.push(`url_path = $${paramIndex++}`);
        values.push(data.url_path);
    }

    updates.push(`updated_at = NOW()`);

    const rows = await query<Dashboard>(
        `UPDATE dashboards 
     SET ${updates.join(", ")}
     WHERE id = $1
     RETURNING *`,
        values
    );
    return rows[0];
}

/**
 * Delete dashboard
 */
export async function deleteDashboard(id: string): Promise<void> {
    await query(`DELETE FROM dashboards WHERE id = $1`, [id]);
}

/**
 * Get all cards for a dashboard
 */
export async function getDashboardCards(dashboardId: string): Promise<DashboardCard[]> {
    return query<DashboardCard>(
        `SELECT * FROM dashboard_cards WHERE dashboard_id = $1 ORDER BY "order" ASC`,
        [dashboardId]
    );
}

/**
 * Add a card to a dashboard
 */
export async function addCard(
    dashboardId: string,
    data: Omit<DashboardCard, "id" | "dashboard_id" | "order" | "created_at" | "updated_at">
): Promise<DashboardCard> {
    // Get max order for this dashboard
    const orderResult = await query<{ max_order: number }>(
        `SELECT COALESCE(MAX("order"), -1) as max_order FROM dashboard_cards WHERE dashboard_id = $1`,
        [dashboardId]
    );
    const nextOrder = (orderResult[0]?.max_order ?? -1) + 1;

    const rows = await query<DashboardCard>(
        `INSERT INTO dashboard_cards (dashboard_id, type, config, "order", width)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
        [dashboardId, data.type, data.config, nextOrder, data.width || 1]
    );
    return rows[0];
}

/**
 * Update card configuration/layout
 */
export async function updateCard(
    id: string,
    data: Partial<Pick<DashboardCard, "config" | "width" | "type">>
): Promise<DashboardCard> {
    const updates: string[] = [];
    const values: any[] = [id];
    let paramIndex = 2;

    if (data.config !== undefined) {
        updates.push(`config = $${paramIndex++}`);
        values.push(data.config);
    }
    if (data.width !== undefined) {
        updates.push(`width = $${paramIndex++}`);
        values.push(data.width);
    }
    if (data.type !== undefined) {
        updates.push(`type = $${paramIndex++}`);
        values.push(data.type);
    }

    updates.push(`updated_at = NOW()`);

    const rows = await query<DashboardCard>(
        `UPDATE dashboard_cards 
     SET ${updates.join(", ")}
     WHERE id = $1
     RETURNING *`,
        values
    );
    return rows[0];
}

/**
 * Delete a card
 */
export async function deleteCard(id: string): Promise<void> {
    await query(`DELETE FROM dashboard_cards WHERE id = $1`, [id]);
}

/**
 * Reorder cards in a dashboard
 * Expects an ordered array of card IDs
 */
export async function reorderCards(dashboardId: string, cardIds: string[]): Promise<void> {
    await transaction(async (client) => {
        // We update each card's order based on its index in the array
        for (let i = 0; i < cardIds.length; i++) {
            await client.query(
                `UPDATE dashboard_cards SET "order" = $1 WHERE id = $2 AND dashboard_id = $3`,
                [i, cardIds[i], dashboardId]
            );
        }
    });
}
