import { NextRequest, NextResponse } from "next/server";
import { reorderCards } from "@/components/dashboards/server/dashboard.registry";

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const body = await request.json();

        if (!Array.isArray(body.cardIds)) {
            return NextResponse.json(
                { error: "cardIds array is required" },
                { status: 400 }
            );
        }

        await reorderCards(params.id, body.cardIds);

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
