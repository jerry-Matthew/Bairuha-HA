/**
 * HACS Sort Utilities
 * 
 * Client-side sorting functions for extensions
 */

import type { HacsExtension, SortField } from "../server/hacs.types";

/**
 * Sort extensions by field
 */
export function sortExtensions(
  extensions: HacsExtension[],
  field: SortField
): HacsExtension[] {
  const sorted = [...extensions];

  switch (field) {
    case "name":
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "stars":
      sorted.sort((a, b) => b.stars - a.stars);
      break;
    case "downloads":
      sorted.sort((a, b) => b.downloads - a.downloads);
      break;
    case "activity":
      // Sort by activity (most recent first)
      // This is a simplified sort - in production would parse dates
      sorted.sort((a, b) => {
        // For now, just maintain order (activity is already formatted)
        return 0;
      });
      break;
    default:
      break;
  }

  return sorted;
}

/**
 * Group extensions by status
 */
export function groupByStatus(extensions: HacsExtension[]): {
  downloaded: HacsExtension[];
  new: HacsExtension[];
} {
  return {
    downloaded: extensions.filter((ext) => ext.status === "installed"),
    new: extensions.filter((ext) => ext.status === "not_installed"),
  };
}

