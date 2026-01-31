/**
 * HACS Filter Utilities
 * 
 * Client-side filtering functions for extensions
 */

import type { HacsExtension } from "../server/hacs.types";

export type FilterType = "all" | "downloaded" | "new";

/**
 * Filter extensions by status
 */
export function filterByStatus(
  extensions: HacsExtension[],
  filter: FilterType
): HacsExtension[] {
  switch (filter) {
    case "downloaded":
      return extensions.filter((ext) => ext.status === "installed");
    case "new":
      return extensions.filter((ext) => ext.status === "not_installed");
    case "all":
    default:
      return extensions;
  }
}

/**
 * Filter extensions by type
 */
export function filterByType(
  extensions: HacsExtension[],
  type: "integration" | "frontend" | "theme" | "panel" | "all"
): HacsExtension[] {
  if (type === "all") {
    return extensions;
  }
  return extensions.filter((ext) => ext.type === type);
}

/**
 * Search extensions by query
 */
export function searchExtensions(
  extensions: HacsExtension[],
  query: string
): HacsExtension[] {
  if (!query.trim()) {
    return extensions;
  }

  const lowerQuery = query.toLowerCase();
  return extensions.filter(
    (ext) =>
      ext.name.toLowerCase().includes(lowerQuery) ||
      ext.description.toLowerCase().includes(lowerQuery) ||
      ext.githubRepo.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Combine multiple filters
 */
export function applyFilters(
  extensions: HacsExtension[],
  filters: {
    status?: FilterType;
    type?: "integration" | "frontend" | "theme" | "panel" | "all";
    search?: string;
  }
): HacsExtension[] {
  let result = extensions;

  if (filters.status) {
    result = filterByStatus(result, filters.status);
  }

  if (filters.type) {
    result = filterByType(result, filters.type);
  }

  if (filters.search) {
    result = searchExtensions(result, filters.search);
  }

  return result;
}

