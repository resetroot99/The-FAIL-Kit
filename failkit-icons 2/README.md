# FailKit Icons

Professional punk-coder themed icons for FailKit VS Code extension and web favicons.

## Files Included

### VS Code Extension
- **`icon.png`** - Main VS Code extension icon (128x128)

### Web Favicons
- **`favicon.ico`** - Multi-resolution ICO file (16x16, 32x32, 48x48)
- **`apple-touch-icon.png`** - Apple touch icon (180x180)
- **`android-chrome-192x192.png`** - Android/Chrome icon (192x192)
- **`android-chrome-512x512.png`** - Android/Chrome icon (512x512)

### Individual PNG Sizes
All sizes available as individual PNG files with transparent backgrounds:
- 16x16, 32x32, 48x48, 64x64, 96x96, 128x128
- 180x180, 192x192, 256x256, 512x512

### Source Files
- **`failkit-icon-base.png`** - Original high-resolution source (2048x2048)

## Usage

### VS Code Extension (package.json)
```json
{
  "icon": "icon.png"
}
```

### HTML Favicon Tags
```html
<!-- Standard favicon -->
<link rel="icon" type="image/x-icon" href="/favicon.ico">

<!-- PNG favicons for different sizes -->
<link rel="icon" type="image/png" sizes="16x16" href="/failkit-icon-16x16.png">
<link rel="icon" type="image/png" sizes="32x32" href="/failkit-icon-32x32.png">
<link rel="icon" type="image/png" sizes="96x96" href="/failkit-icon-96x96.png">

<!-- Apple touch icon -->
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">

<!-- Android/Chrome -->
<link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png">
<link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png">
```

### Web Manifest (manifest.json)
```json
{
  "icons": [
    {
      "src": "/android-chrome-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/android-chrome-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

## Design Details

**Style**: Punk-coder professional aesthetic  
**Colors**: Electric cyan (#00FFFF) and hot magenta (#FF00FF)  
**Theme**: Circuit board patterns, glitch effects, neon glow  
**Background**: Transparent (all PNG files)  
**Format**: Optimized PNG with alpha channel

## File Sizes
- ICO: ~722 bytes
- 16x16: ~701 bytes
- 32x32: ~1.9 KB
- 128x128: ~21 KB
- 512x512: ~252 KB
- Source: ~6 MB (high-resolution)
