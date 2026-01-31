# Logo Image Instructions

## Where to Place Your Logo

Place your logo image file in this directory: `homeAssistantFrontend/public/images/`

## Supported Formats
- SVG (recommended for scalability)
- PNG
- JPG/JPEG

## How to Connect Your Image

1. **Copy your logo image file** to this folder (`public/images/`)
2. **Name it `logo.svg`** (or `logo.png`, `logo.jpg`, etc.)
3. **Update the LOGO_PATH constant** in `components/layout/dashboard-layout.tsx`:
   - Open `homeAssistantFrontend/components/layout/dashboard-layout.tsx`
   - Find the line: `const LOGO_PATH = "/images/logo.svg";`
   - Change the filename to match your image (e.g., `"/images/logo.png"`)

## Example

If your image is named `my-logo.png`:
1. Place it in: `public/images/my-logo.png`
2. Update the code to: `const LOGO_PATH = "/images/my-logo.png";`

## Current Setup

The logo is currently set to: `/images/logo.svg`

Make sure your image file exists at: `public/images/logo.svg` (or update the path in the code)

