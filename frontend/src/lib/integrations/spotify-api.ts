/**
 * Spotify API Helper
 * 
 * Integrates Spotify API calls with OAuth token management
 * Automatically handles token refresh and uses stored OAuth tokens
 */

import { getTokens, areTokensExpired, updateTokens } from '@/lib/oauth/oauth-token-storage';
import { refreshAccessToken } from '@/lib/oauth/oauth-service';

/**
 * Get valid access token for Spotify API
 * Automatically refreshes if expired
 */
async function getValidAccessToken(configEntryId: string): Promise<string | null> {
  let tokens = await getTokens(configEntryId);
  
  if (!tokens) {
    throw new Error('No Spotify OAuth tokens found. Please authenticate first.');
  }

  // Check if token is expired and refresh if needed
  if (areTokensExpired(tokens) && tokens.refresh_token) {
    try {
      tokens = await refreshAccessToken('spotify', tokens.refresh_token);
      await updateTokens(configEntryId, tokens);
    } catch (error) {
      console.error('[Spotify API] Failed to refresh token:', error);
      throw new Error('Failed to refresh Spotify access token. Please re-authenticate.');
    }
  }

  return tokens.access_token;
}

/**
 * Make authenticated request to Spotify Web API
 */
async function fetchSpotifyApi(
  configEntryId: string,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<any> {
  const accessToken = await getValidAccessToken(configEntryId);
  
  if (!accessToken) {
    throw new Error('No valid Spotify access token available');
  }

  const url = endpoint.startsWith('http') 
    ? endpoint 
    : `https://api.spotify.com/v1/${endpoint}`;

  const options: RequestInit = {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    method,
  };

  if (body && (method === 'POST' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  const res = await fetch(url, options);

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(`Spotify API error: ${error.error?.message || res.statusText}`);
  }

  return await res.json();
}

/**
 * Get user's top tracks from Spotify
 */
export async function getTopTracks(
  configEntryId: string,
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'long_term',
  limit: number = 5
): Promise<any[]> {
  const response = await fetchSpotifyApi(
    configEntryId,
    `me/top/tracks?time_range=${timeRange}&limit=${limit}`,
    'GET'
  );
  
  return response.items || [];
}

/**
 * Get user's top artists from Spotify
 */
export async function getTopArtists(
  configEntryId: string,
  timeRange: 'short_term' | 'medium_term' | 'long_term' = 'long_term',
  limit: number = 5
): Promise<any[]> {
  const response = await fetchSpotifyApi(
    configEntryId,
    `me/top/artists?time_range=${timeRange}&limit=${limit}`,
    'GET'
  );
  
  return response.items || [];
}

/**
 * Get user's currently playing track
 */
export async function getCurrentlyPlaying(configEntryId: string): Promise<any> {
  return await fetchSpotifyApi(configEntryId, 'me/player/currently-playing', 'GET');
}

/**
 * Get user's playlists
 */
export async function getUserPlaylists(
  configEntryId: string,
  limit: number = 20,
  offset: number = 0
): Promise<any> {
  return await fetchSpotifyApi(
    configEntryId,
    `me/playlists?limit=${limit}&offset=${offset}`,
    'GET'
  );
}

/**
 * Play a track on user's active device
 */
export async function playTrack(
  configEntryId: string,
  trackUri: string,
  deviceId?: string
): Promise<void> {
  const body: any = {
    uris: [trackUri],
  };
  
  if (deviceId) {
    body.device_id = deviceId;
  }

  await fetchSpotifyApi(
    configEntryId,
    `me/player/play${deviceId ? `?device_id=${deviceId}` : ''}`,
    'PUT',
    body
  );
}

/**
 * Pause playback
 */
export async function pausePlayback(configEntryId: string, deviceId?: string): Promise<void> {
  await fetchSpotifyApi(
    configEntryId,
    `me/player/pause${deviceId ? `?device_id=${deviceId}` : ''}`,
    'PUT'
  );
}

/**
 * Generic Spotify API call helper
 * Use this for any Spotify API endpoint not covered by the specific functions above
 */
export async function spotifyApiCall(
  configEntryId: string,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<any> {
  return await fetchSpotifyApi(configEntryId, endpoint, method, body);
}
