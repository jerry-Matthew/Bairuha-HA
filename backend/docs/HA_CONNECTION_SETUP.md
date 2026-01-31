# Home Assistant Connection Setup

## Generating a Long-Lived Access Token

To connect Bairuha HA to your Home Assistant instance, you need to generate a **Long-Lived Access Token**.

### Steps:

1. **Open Home Assistant** in your browser (e.g., `http://192.168.1.100:8123`)

2. **Navigate to your Profile**:
   - Click your username in the bottom-left corner
   - Scroll down to the **"Long-Lived Access Tokens"** section

3. **Create a new token**:
   - Click **"Create Token"**
   - Give it a name like `Bairuha HA Integration`
   - Click **"OK"**

4. **Copy the token**:
   - The token will be displayed **only once**
   - Copy it immediately (it looks like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

5. **Add to your `.env` file**:
   ```bash
   HA_BASE_URL=http://192.168.1.100:8123
   HA_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

6. **Restart the backend**:
   ```bash
   npm run start:dev
   ```

## Testing the Connection

Once configured, you can test the connection:

### Via API:
```bash
POST http://localhost:3000/integrations/sync/ha
```

This will fetch all components from your Home Assistant instance and populate the integration catalog.

### Expected Response:
```json
{
  "success": true,
  "message": "Synced 150 components from Home Assistant",
  "componentsCount": 150,
  "newCount": 150
}
```

## Troubleshooting

### "Home Assistant is not configured"
- Verify `HA_BASE_URL` and `HA_ACCESS_TOKEN` are set in `.env`
- Restart the backend after adding them

### "Failed to get config: 401"
- Your access token is invalid or expired
- Generate a new token and update `.env`

### "Failed to get config: Connection refused"
- Your Home Assistant is not reachable at the specified URL
- Verify the IP address and port
- Ensure your Pi is powered on and connected to the network

## What Gets Synced?

When you run `/integrations/sync/ha`, Bairuha HA will:
1. Fetch the list of **loaded components** from your Pi
2. Create catalog entries for each component
3. Mark them with `source: 'ha'` to distinguish from HACS integrations
4. Display them in the "Add Device" menu

This ensures your integration list matches your actual Home Assistant setup.
