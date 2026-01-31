import { NextRequest, NextResponse } from "next/server";
import {
    getDashboardById,
    updateDashboard,
    deleteDashboard,
    getDashboardCards
} from "@/components/dashboards/server/dashboard.registry";

export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const dashboard = await getDashboardById(params.id);
        if (!dashboard) {
            return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
        }

        const cards = await getDashboardCards(params.id);

        return NextResponse.json({
            ...dashboard,
            cards,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();
        const dashboard = await updateDashboard(params.id, body);

        if (!dashboard) {
            return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
        }

        return NextResponse.json(dashboard);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        await deleteDashboard(params.id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
