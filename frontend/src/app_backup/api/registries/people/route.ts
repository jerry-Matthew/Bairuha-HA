/**
 * Person Registry API
 * 
 * CRUD operations for person registry
 */

import { NextRequest, NextResponse } from "next/server";
import { getAllPeople, createPerson } from "@/components/globalAdd/server/person.registry";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const people = await getAllPeople();
    return NextResponse.json({ people });
  } catch (error: any) {
    console.error("Person registry API error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch people" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const person = await createPerson(body);
    return NextResponse.json({ person }, { status: 201 });
  } catch (error: any) {
    console.error("Person registry API error:", error);
    return NextResponse.json({ error: error.message || "Failed to create person" }, { status: 500 });
  }
}

