import { NextRequest, NextResponse } from "next/server";
import {
    getAllDashboards,
    createDashboard,
    Dashboard
} from "@/components/dashboards/server/dashboard.registry";

export async function GET() {
    try {
        const dashboards = await getAllDashboards();
        return NextResponse.json(dashboards);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        if (!body.title || !body.url_path) {
            return NextResponse.json(
                { error: "Title and URL path are required" },
                { status: 400 }
            );
        }

        const dashboard = await createDashboard({
            title: body.title,
            icon: body.icon,
            url_path: body.url_path,
        });

        return NextResponse.json(dashboard);
    } catch (error: any) {
        // Handle unique constraint violation
        if (error.code === '23505') {
            return NextResponse.json(
                { error: "Dashboard with this URL path already exists" },
                { status: 409 }
            );
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
