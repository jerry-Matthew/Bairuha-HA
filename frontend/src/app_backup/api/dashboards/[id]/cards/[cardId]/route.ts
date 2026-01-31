import { NextRequest, NextResponse } from "next/server";
import { deleteCard, updateCard } from "@/components/dashboards/server/dashboard.registry";

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string; cardId: string } }
) {
    try {
        await deleteCard(params.cardId);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string; cardId: string } }
) {
    try {
        const body = await request.json();
        const card = await updateCard(params.cardId, {
            width: body.width,
            config: body.config,
        });
        return NextResponse.json(card);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
