# 🖼️ Open Graph Image Needed

## Current Status
⚠️ **Placeholder needed:** `/public/og-image.png`

---

## Specifications

Create an image with these specs:
- **Size:** 1200x630 pixels
- **Format:** PNG
- **File:** `public/og-image.png`

---

## Content Suggestions

### Option 1: Simple Text Card
```
┌─────────────────────────────────────┐
│                                     │
│    ASIA BITCOIN TREASURIES          │
│                                     │
│    Track Corporate BTC Holdings     │
│                                     │
│    🪙 Current Total                 │
│    [X,XXX BTC]                     │
│                                     │
│    📊 Companies Tracked             │
│    [XX]                            │
│                                     │
│    utxo210k.com                    │
│                                     │
└─────────────────────────────────────┘
```

### Option 2: With Branding
- Dark gradient background (#1a1a2e → #16213e)
- Bitcoin icon or logo
- Main headline: "Asia Bitcoin Treasuries"
- Subtext: "Real-time Corporate Bitcoin Tracker"
- Current stats (total BTC, companies)
- Your branding/logo

### Option 3: Data Visualization
- Bar chart showing top holdings
- Map of Asia highlighting tracked regions
- Live data display

---

## Tools to Create OG Image

### Quick & Easy:
1. **Canva** (free) - https://canva.com
   - Template: Social Media → Facebook Post (1200x630)
   - Easy drag-and-drop interface

2. **Figma** (free) - https://figma.com
   - Professional design tool
   - Export as PNG

3. **OG Image Generator** - https://og-playground.vercel.app
   - Generate programmatically
   - Use HTML/CSS

### Automated (Future):
Consider dynamic OG images that update with current data:
- Use `@vercel/og` package
- Generate images on-demand
- Show real-time BTC totals

---

## Temporary Placeholder

For now, you can use a simple solid color image or skip it. Browsers will fall back to using the site's favicon or default social card.

To create a quick placeholder:

```bash
# Using ImageMagick (if installed)
convert -size 1200x630 xc:#1a1a2e \
  -gravity center \
  -pointsize 60 \
  -fill white \
  -annotate +0-100 "Asia Bitcoin Treasuries" \
  -pointsize 30 \
  -annotate +0+0 "Track Corporate Bitcoin Holdings" \
  -pointsize 20 \
  -annotate +0+50 "utxo210k.com" \
  public/og-image.png
```

---

## Testing

Once you add the image, test it:

1. **Twitter Card Validator:**
   https://cards-dev.twitter.com/validator

2. **Facebook Sharing Debugger:**
   https://developers.facebook.com/tools/debug/

3. **LinkedIn Post Inspector:**
   https://www.linkedin.com/post-inspector/

4. **Open Graph Check:**
   https://www.opengraphcheck.com/

---

## Priority

⚠️ **Medium Priority**

The site will work fine without it, but an OG image significantly improves social sharing appearance. Add it before promoting on social media.

---

## Next Steps

1. Design OG image using Canva/Figma
2. Save as `public/og-image.png`
3. Test with validators above
4. Consider dynamic OG images for company pages (future)

