# EHS Smart - SaaS Version

AI-powered risk assessment platform for EHS professionals.

## Overview

This is the **generic SaaS version** of Risk Assessment Buddy, designed for commercial distribution to any company. It removes all Goodyear-specific features and provides a clean, branded experience for external customers.

## 🏗️ Architecture

The SaaS version follows a **separate codebase** architecture to protect Goodyear IP:

```
saas-version/
├── index.html          # Main SaaS application UI
├── core-engine.js      # Risk assessment logic (independent)
├── hazard-registry.js  # HSE UK + OSHA + IATA standards (370+ hazards)
├── video-processor.js  # Video upload, frame capture, face blur (NEW)
├── callback.html       # OAuth redirect handler
└── README.md           # This documentation
```

### Why Separate Codebase?

1. **Legal Protection** - Goodyear IP stays in parent folder
2. **Independence** - SaaS can evolve without internal approval
3. **No Conflict of Interest** - Clear separation for employee side-project
4. **Different Features** - SaaS needs billing, multi-tenant auth

## 🎥 Video Workflow (NEW)

The SaaS version includes a powerful video-based risk assessment workflow:

### Workflow
1. **Upload Video** → User uploads workplace video (MP4, MOV, AVI, MKV, WebM)
2. **Capture Frames** → Press SPACE or click to capture frames at key moments
3. **Auto Face Blur** → Faces automatically detected and blurred (GDPR compliant)
4. **Add Field Notes** → Click frames to add descriptions, hazards, controls
5. **AI Description (PRO)** → AI analyzes frames and auto-populates fields
6. **Generate Assessment** → Combined notes generate comprehensive risk assessment

### Free vs Pro Comparison

| Feature | Free | Pro ($79/mo) |
|---------|------|--------------|
| Video Upload | ✅ Up to 500MB | ✅ Unlimited |
| Manual Frame Capture | ✅ Yes | ✅ Yes |
| Auto Face Blur | ✅ Yes | ✅ Yes |
| Manual Field Notes | ✅ Yes | ✅ Yes |
| Auto-Capture Mode | ✅ 5s interval | ✅ Customizable |
| **AI Scene Analysis** | ❌ No | ✅ Yes |
| **Auto-populate Fields** | ❌ No | ✅ Yes |
| **AI Hazard Detection** | ❌ No | ✅ Yes |
| Export ZIP | ✅ Yes | ✅ Yes |
| Frames per Video | 20 | 50 |

### Technical Details

The `video-processor.js` module provides:
- Face detection using face-api.js (SSD MobileNet)
- Automatic face blurring with configurable blur intensity
- Manual blur for missed faces (click on image)
- Frame capture at any video timestamp
- Auto-capture mode (configurable intervals)
- Field notes storage per frame
- AI scene description via GPT-4 Vision (Pro)
- ZIP export with frames + notes

## 📊 Hazard Registry

The `hazard-registry.js` contains a comprehensive database of 370+ hazards across multiple international standards:

### Standards Covered
| Standard | Categories | Focus |
|----------|------------|-------|
| HSE UK | 20 | General workplace safety |
| OSHA 29 CFR 1910/1926 | 8 | US regulatory compliance |
| IATA/ICAO | 10 | Aviation safety |
| API/IOGP | 10 | Oil & Gas operations |

### Multi-Language Support
- 🇬🇧 **English** - Default
- 🇫🇷 **Français** - EU compliance
- 🇸🇦 **العربية** - Middle East markets (RTL supported)

### Industry Presets
The registry includes 24 industry-specific presets:
- Manufacturing (General, Automotive, Food, Pharma)
- Construction (General, Civil)
- Oil & Gas (Upstream, Downstream, Midstream, Offshore)
- Aviation (Ground, MRO, Cargo, Fueling)
- And more...

## Features

### Core Features
- 📸 **Image-based hazard analysis** - Upload workplace photos, AI identifies risks
- 🎥 **Video-based workflow** - Capture frames, add field notes, generate assessments
- 🔒 **Privacy protection** - Automatic face detection and blurring (GDPR compliant)
- 📊 **Excel import** - Multi-language support (EN, FR, DE, TR, ES)
- 🤖 **AI recommendations** - Intelligent mitigation suggestions
- 📄 **Multi-format export** - PDF, Excel, shareable HTML
- 📦 **Project management** - Save and load assessments

### SaaS-Specific Features
- 🔐 **User authentication** - Microsoft/Google OAuth + email signup
- 💳 **Subscription tiers** - Free, Pro ($79/mo), Enterprise ($199/mo)
- ☁️ **Cloud storage integration** - SharePoint, OneDrive, Google Drive
- 👥 **Team collaboration** - Share assessments with colleagues
- 📈 **Usage analytics** - Track assessment creation and exports

## Differences from Goodyear Version

| Feature | Goodyear Version | SaaS Version |
|---------|-----------------|--------------|
| **GOEHS Integration** | ✅ Yes | ❌ No |
| **Hazard Registry** | Goodyear-specific | HSE UK + OSHA + IATA |
| **Video Workflow** | ✅ Yes | ✅ Yes (enhanced) |
| **AI Scene Description** | ❌ No | ✅ Pro only |
| **Branding** | Goodyear colors | EHS Smart (green) |
| **Authentication** | Entra ID SSO | Multi-provider OAuth |
| **Languages** | EN, FR, DE, TR, ES | EN, FR, AR |
| **Pricing** | Internal use | Subscription tiers |
| **Target audience** | Goodyear employees | Any EHS professional |

## File Structure

```
saas-version/
├── index.html          # Main SaaS application
├── callback.html       # OAuth redirect handler
├── README.md           # This file
└── (uses parent /lib and /models folders)
```

## Setup Instructions

### 1. Azure App Registration

Replace `YOUR_CLIENT_ID_HERE` in both `index.html` and `callback.html` with your actual Azure Client ID.

```javascript
const CONFIG = {
    AZURE_CLIENT_ID: 'your-actual-client-id',
    AZURE_REDIRECT_URI: 'https://yourdomain.com/callback.html',
};
```

### 2. Deploy to GitHub Pages

```bash
# Copy saas-version folder to your GitHub repo
git add saas-version/
git commit -m "Add SaaS version"
git push origin main

# Enable GitHub Pages in repo settings
# Your app will be at: https://username.github.io/repo-name/saas-version/
```

### 3. Update Azure Redirect URIs

In Azure Portal > App registrations > Your app > Authentication:

Add these redirect URIs:
- `https://yourdomain.com/callback.html` (production)
- `http://localhost:3000/callback.html` (development)

### 4. Set Up Backend (Vercel)

The SaaS version requires a backend for:
- Token exchange (OAuth)
- Storing user data
- Subscription management

See `/server/` folder for backend API setup.

## Pricing Tiers

### Free Tier ($0/month)
- 5 assessments/month
- Image analysis
- PDF export only
- No cloud storage

### Pro Tier ($79/month)
- Unlimited assessments
- All export formats
- 5GB cloud storage
- Priority support
- Team collaboration

### Enterprise Tier ($199/month)
- Everything in Pro
- 50GB cloud storage
- SSO/SAML integration
- Audit logging
- Dedicated support

## Customization

### Branding Colors

Update Tailwind config in `<head>`:

```javascript
tailwind.config = {
    theme: {
        extend: {
            colors: {
                brand: {
                    500: '#22c55e',  // Primary green
                    600: '#16a34a',  // Darker green
                    700: '#15803d',  // Even darker
                }
            }
        }
    }
}
```

### Logo

Replace the emoji logo with your actual logo:

```html
<!-- Current (emoji) -->
<div class="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-xl w-10 h-10 flex items-center justify-center">
    🛡️
</div>

<!-- With image -->
<img src="your-logo.png" class="w-10 h-10" alt="Logo">
```

### Pricing

Update pricing section in `index.html` to match your business model.

## Development

### Local Testing

```bash
# Install a simple HTTP server
npm install -g http-server

# Run from saas-version folder
cd saas-version
http-server -p 3000

# Open http://localhost:3000
```

### Build Process

No build step required! This is a single HTML file with inline CSS/JS.

For production, consider:
- Minifying JavaScript
- Extracting CSS to separate file
- Adding service worker for offline support

## Security Considerations

### Never Expose in Frontend
- ❌ Azure Client Secret
- ❌ Database credentials
- ❌ API keys with write access

### Safe for Frontend
- ✅ Azure Client ID (public by design)
- ✅ Redirect URIs
- ✅ Public API endpoints

### Backend Required For
- Token exchange (OAuth)
- User data storage
- Payment processing (Stripe)
- File upload handling

## Migration from Goodyear Version

If a Goodyear user wants to use the SaaS version:

1. **Export** their assessments as JSON from Goodyear version
2. **Import** into SaaS version via "Load Project" feature
3. **Reconnect** cloud storage (will use their own SharePoint/OneDrive)

## Support

- Email: support@ehssmart.com
- Documentation: https://docs.ehssmart.com
- Status: https://status.ehssmart.com

## License

Proprietary - All rights reserved.

---

**Built with ❤️ in Luxembourg**
