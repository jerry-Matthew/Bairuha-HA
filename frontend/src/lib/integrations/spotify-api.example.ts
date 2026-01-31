/**
 * Example: How to use Spotify API with OAuth tokens
 * 
 * This replaces your hardcoded token approach with the OAuth-integrated system
 */

import { getTopTracks } from './spotify-api';

// ❌ OLD WAY (what you had):
// const token = 'BQDFTPZoieaLCzwI-ziBOyfi-rN80dEpGdwcOUvBCQHSYgcStrHjd1iSxiCkuSr-LXIFLRD9cf1E5BBG1orU07p8DEBGYLiZJZejI7hfeHRx5RdJRv80-SvvqerPjcGvCQfe8ytuK5Hbmi1F5fkXa07Jn5J9PZ_RPox67_cSpwD_osaYyB5xZp3GTwVLcTFWTtt5Wep09uJuAzdb2oKEAT9ffwSZHRymHbYnxoQZnm-u7SoQphk515DYG7uuIXDGcIHPrBUBuocNrVvJ5Z0iINon7WrPYRp8P_RHUJ-e8wiltkN7Ln30U7OXPae-JIPEDKLr';
// async function fetchWebApi(endpoint, method, body) {
//   const res = await fetch(`https://api.spotify.com/${endpoint}`, {
//     headers: {
//       Authorization: `Bearer ${token}`,
//     },
//     method,
//     body:JSON.stringify(body)
//   });
//   return await res.json();
// }
// async function getTopTracks(){
//   return (await fetchWebApi('v1/me/top/tracks?time_range=long_term&limit=5', 'GET')).items;
// }

// ✅ NEW WAY (OAuth-integrated):
// Step 1: User authenticates via OAuth flow (handled by your OAuth system)
// Step 2: Get the configEntryId from the OAuth flow completion
// Step 3: Use the helper functions:

async function exampleUsage(configEntryId: string) {
  try {
    // Get top tracks - automatically handles token refresh if needed
    const topTracks = await getTopTracks(configEntryId, 'long_term', 5);
    
    console.log(
      topTracks?.map(
        ({name, artists}: any) =>
          `${name} by ${artists.map((artist: any) => artist.name).join(', ')}`
      )
    );
  } catch (error) {
    console.error('Failed to fetch top tracks:', error);
    // Handle error - might need to re-authenticate
  }
}

// To get configEntryId:
// 1. After OAuth flow completes, check the config entry registry
// 2. Or store it when OAuth callback completes
// Example:
// import { getConfigEntriesByDomain } from '@/components/globalAdd/server/config-entry.registry';
// const spotifyEntries = await getConfigEntriesByDomain('spotify');
// const configEntryId = spotifyEntries[0]?.id;

export { exampleUsage };
