/**
 * Device Registry API
 * 
 * CRUD operations for device registry
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getAllDevices,
  registerDevice,
  getDeviceProviders,
} from "@/components/globalAdd/server/device.registry";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");

    if (action === "providers") {
      const providers = await getDeviceProviders();
      return NextResponse.json({ providers });
    }

    // Default: get all devices
    const devices = await getAllDevices();
    return NextResponse.json({ devices });
  } catch (error: any) {
    console.error("Device registry API error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch devices" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const device = await registerDevice(body);
    return NextResponse.json({ device }, { status: 201 });
  } catch (error: any) {
    console.error("Device registry API error:", error);
    return NextResponse.json({ error: error.message || "Failed to register device" }, { status: 500 });
  }
}

