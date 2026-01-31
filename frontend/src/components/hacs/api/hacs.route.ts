/**
 * HACS API Routes
 * 
 * Centralized API route handlers for HACS operations
 * These are used by the API route files in app/api/hacs/
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnrichedCatalog, getExtensionById } from "../server/hacs.catalog";
import {
  installExtension,
  updateExtension,
  refreshExtension,
  getExtensionDetails,
} from "../server/hacs.service";
import type {
  HacsCatalogResponse,
  HacsExtensionResponse,
  HacsInstallResponse,
  HacsUpdateResponse,
  HacsRefreshResponse,
} from "../server/hacs.types";

/**
 * GET /api/hacs/catalog
 * Get catalog of extensions with optional search and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const searchQuery = searchParams.get("q") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const perPage = parseInt(searchParams.get("per_page") || "30", 10);

    const result = await getEnrichedCatalog(searchQuery, page, perPage);

    const response: HacsCatalogResponse = {
      extensions: result.extensions,
      total: result.total,
      page: result.page,
      perPage: result.perPage,
      totalPages: result.totalPages,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching HACS catalog:", error);
    return NextResponse.json(
      { error: "Failed to fetch catalog" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/hacs/:id
 * Get single extension details
 */
export async function GET_EXTENSION(id: string) {
  try {
    const details = await getExtensionDetails(id);
    if (!details) {
      return NextResponse.json(
        { error: "Extension not found" },
        { status: 404 }
      );
    }

    const response: HacsExtensionResponse = {
      extension: details,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`Error fetching extension ${id}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch extension" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/hacs/:id/install
 * Install extension
 */
export async function POST_INSTALL(id: string) {
  try {
    const result = await installExtension(id);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(`Error installing extension ${id}:`, error);
    return NextResponse.json(
      { error: "Failed to install extension" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/hacs/:id/update
 * Update extension
 */
export async function POST_UPDATE(id: string) {
  try {
    const result = await updateExtension(id);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(`Error updating extension ${id}:`, error);
    return NextResponse.json(
      { error: "Failed to update extension" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/hacs/:id/refresh
 * Refresh extension metadata
 */
export async function POST_REFRESH(id: string) {
  try {
    const result = await refreshExtension(id);
    
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error(`Error refreshing extension ${id}:`, error);
    return NextResponse.json(
      { error: "Failed to refresh extension" },
      { status: 500 }
    );
  }
}

