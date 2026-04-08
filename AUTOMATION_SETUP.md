# 🤖 Automated Legal Registry Update System

This system automatically scrapes government regulatory websites and uses AI to summarize and structure new regulations into your legal registry.

## 🎯 How It Works

1. **Monthly Trigger**: GitHub Actions runs on the 1st of every month at 2 AM UTC
2. **Web Scraping**: Fetches latest standards from:
   - OSHA.gov (US)
   - HSE.gov.uk (UK)
   - ADEM.lu (Luxembourg)
   - UAE regulatory sources
3. **AI Processing**: Claude AI summarizes regulations and extracts:
   - Key requirements
   - Applicable hazard categories
   - Relevant industries
   - Penalties & compliance info
4. **Auto-Commit**: Updates `legal-registry.json` and commits to GitHub
5. **Auto-Deploy**: Vercel redeploys with new regulations

## 💰 Cost

- **GitHub Actions**: FREE (2,000 min/month included)
- **Claude API**: $0-5/month (free tier: 100K tokens/month)
- **Web Scraping**: FREE (open source tools)
- **Total**: ~$0-5/month (basically free)

## 🚀 Setup Instructions

### Step 1: Get Anthropic API Key (Free)

1. Go to https://console.anthropic.com/
2. Sign up (free tier available)
3. Create an API key
4. Copy the key

### Step 2: Add API Key to GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `ANTHROPIC_API_KEY`
5. Value: Paste your API key
6. Click **Add secret**

### Step 3: Commit Files to GitHub

```bash
git add scripts/update-regulations.js
git add .github/workflows/update-legal-registry.yml
git add package.json
git commit -m "Add automated legal registry update system"
git push
```

### Step 4: Test the Workflow (Optional)

1. Go to GitHub repo → **Actions** tab
2. Find "Update Legal Registry Monthly"
3. Click **Run workflow** → **Run workflow**
4. Wait ~2 minutes for completion
5. Check if `legal-registry.json` was updated

## 📋 What Gets Added

Each new regulation includes:

```json
{
  "id": "SOURCE-TIMESTAMP",
  "title": "Regulation Title",
  "type": "Standard",
  "hazardCategories": ["Physical health hazards"],
  "applicableIndustries": ["Manufacturing"],
  "summary": "2-3 sentence overview",
  "requirements": ["Requirement 1", "Requirement 2"],
  "keyPoints": ["Key point 1", "Key point 2"],
  "links": {
    "official": "https://government-source.gov",
    "guidance": "https://guidance-document.pdf"
  },
  "aiProcessed": true,
  "autoAdded": true
}
```

## 🔧 Manual Updates

You can also run the update script locally:

```bash
# Install dependencies
npm install

# Set API key
export ANTHROPIC_API_KEY="your-key-here"

# Run scraper
node scripts/update-regulations.js
```

## ⚙️ Customization

### Change Update Frequency

Edit `.github/workflows/update-legal-registry.yml`:

```yaml
on:
  schedule:
    - cron: '0 2 1 * *'  # Change this line
```

Cron format: `minute hour day month day-of-week`

Examples:
- `'0 2 1 * *'` = Monthly on 1st at 2 AM
- `'0 2 * * 0'` = Weekly on Sunday at 2 AM
- `'0 */6 * * *'` = Every 6 hours

### Add More Regulations Sources

Edit `scripts/update-regulations.js` and add new scraper functions:

```javascript
async function scrapeCustomSource() {
  // Fetch from your source
  // Parse and return regulation data
}
```

## 📊 Monitoring

Check the workflow runs:
1. GitHub repo → **Actions** tab
2. Click "Update Legal Registry Monthly"
3. View logs for each run

## 🐛 Troubleshooting

**"API key not set"**
- Go to GitHub Settings → Secrets
- Add `ANTHROPIC_API_KEY` secret

**"No regulations added"**
- Government websites may have structure changes
- Update scraper functions to match new HTML structure
- Check GitHub Actions logs for errors

**"Scraper rate limited"**
- Add delays between requests in script
- Check government website's robots.txt for crawling rules

## 🔐 Security Notes

- API key stored securely in GitHub Secrets (never logged)
- Only used during GitHub Actions execution
- No regulations exposed in public repo (JSON is public data)
- New regulations flagged with `aiProcessed: true` for review

## 📈 Future Enhancements

- [ ] Email notifications when new regulations added
- [ ] Slack integration for team alerts
- [ ] Manual review/approval workflow
- [ ] Support for more regions
- [ ] Penalty amount extraction
- [ ] Industry-specific filtering
- [ ] Regulation change tracking

## ❓ Questions?

- Anthropic API docs: https://docs.anthropic.com/
- GitHub Actions docs: https://docs.github.com/actions
- Cheerio (web scraping): https://cheerio.js.org/
