# PWA Icon Generation

Since you need PNG icons for the PWA manifest, you have several FREE options:

## Option 1: Online Converters (Recommended)
1. Go to https://realfavicongenerator.net/
2. Upload your logo or the icon.svg file
3. Download all sizes automatically

## Option 2: Use Favicon.io
1. Go to https://favicon.io/favicon-converter/
2. Upload your image
3. Download the zip with all sizes

## Option 3: Use GIMP/Photoshop
Export your logo at these sizes:
- icon-72.png (72x72)
- icon-96.png (96x96)
- icon-128.png (128x128)
- icon-144.png (144x144)
- icon-152.png (152x152)
- icon-192.png (192x192)
- icon-384.png (384x384)
- icon-512.png (512x512)

## Option 4: Use ImageMagick (Command Line)
```bash
# If you have ImageMagick installed:
convert icon.svg -resize 72x72 icon-72.png
convert icon.svg -resize 96x96 icon-96.png
convert icon.svg -resize 128x128 icon-128.png
convert icon.svg -resize 144x144 icon-144.png
convert icon.svg -resize 152x152 icon-152.png
convert icon.svg -resize 192x192 icon-192.png
convert icon.svg -resize 384x384 icon-384.png
convert icon.svg -resize 512x512 icon-512.png
```

## Quick Placeholder (for testing)
The PWA will work without icons - just with default browser icons.
Add proper branded icons before deploying to production.

## Tip for Reselling
When selling to a client:
1. Get their logo
2. Use realfavicongenerator.net to generate all sizes
3. Replace the icons in this folder
4. Update manifest.json theme_color to match their brand
