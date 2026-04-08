/**
 * Regulation Update Automation Script
 * Fetches new regulations and uses AI to summarize them
 * Runs via GitHub Actions monthly
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const Anthropic = require('@anthropic-ai/sdk');

// Initialize Anthropic client (uses ANTHROPIC_API_KEY env var)
const client = new Anthropic();

// Paths
const registryPath = path.join(__dirname, '..', 'legal-registry.json');

/**
 * Fetch regulations from government websites
 */
async function scrapeRegulations() {
  console.log('🕷️  Starting regulation scraper...');
  
  const regulations = {
    us_new: await scrapeOSHA(),
    uk_new: await scrapeHSE(),
    uae_new: await scrapeUAE(),
    luxembourg_new: await scrapeLuxembourg(),
  };
  
  return regulations;
}

/**
 * Scrape OSHA.gov for new standards
 */
async function scrapeOSHA() {
  try {
    console.log('📍 Scraping OSHA.gov...');
    const response = await axios.get('https://www.osha.gov/dsg/naics/');
    const $ = cheerio.load(response.data);
    
    // This is a simple example - in production, would parse more thoroughly
    const standards = [];
    
    // Get latest updates from OSHA homepage
    $('h3').each((i, elem) => {
      if (i < 3) { // Get top 3 recent updates
        standards.push({
          title: $(elem).text().trim(),
          source: 'OSHA',
          url: 'https://www.osha.gov',
          fetchedDate: new Date().toISOString(),
        });
      }
    });
    
    console.log(`✅ Found ${standards.length} OSHA updates`);
    return standards;
  } catch (error) {
    console.error('❌ OSHA scrape failed:', error.message);
    return [];
  }
}

/**
 * Scrape HSE.gov.uk for new standards
 */
async function scrapeHSE() {
  try {
    console.log('📍 Scraping HSE.gov.uk...');
    const response = await axios.get('https://www.hse.gov.uk/news/');
    const $ = cheerio.load(response.data);
    
    const standards = [];
    
    $('h3').each((i, elem) => {
      if (i < 3) {
        standards.push({
          title: $(elem).text().trim(),
          source: 'HSE',
          url: 'https://www.hse.gov.uk',
          fetchedDate: new Date().toISOString(),
        });
      }
    });
    
    console.log(`✅ Found ${standards.length} HSE updates`);
    return standards;
  } catch (error) {
    console.error('❌ HSE scrape failed:', error.message);
    return [];
  }
}

/**
 * Scrape UAE regulations
 */
async function scrapeUAE() {
  try {
    console.log('📍 Scraping UAE regulations...');
    // Note: ADOSH website may be restricted; using alternative sources
    
    const standards = [];
    
    // Placeholder for UAE regulatory updates
    standards.push({
      title: 'UAE Occupational Safety Updates - Check ADOSH directly',
      source: 'ADOSH',
      url: 'https://www.adosh.gov.ae/',
      fetchedDate: new Date().toISOString(),
      note: 'Manual verification recommended for UAE'
    });
    
    console.log(`✅ UAE data collection set`);
    return standards;
  } catch (error) {
    console.error('⚠️  UAE scrape partial:', error.message);
    return [];
  }
}

/**
 * Scrape Luxembourg regulations
 */
async function scrapeLuxembourg() {
  try {
    console.log('📍 Scraping Luxembourg regulations...');
    const response = await axios.get('https://adem.public.lu/en/');
    const $ = cheerio.load(response.data);
    
    const standards = [];
    
    $('h2, h3').each((i, elem) => {
      if (i < 3) {
        standards.push({
          title: $(elem).text().trim(),
          source: 'ADEM',
          url: 'https://adem.public.lu/en/',
          fetchedDate: new Date().toISOString(),
        });
      }
    });
    
    console.log(`✅ Found ${standards.length} Luxembourg updates`);
    return standards;
  } catch (error) {
    console.error('❌ Luxembourg scrape failed:', error.message);
    return [];
  }
}

/**
 * Use Claude AI to summarize and structure regulations
 */
async function summarizeWithAI(rawRegulation) {
  try {
    const prompt = `
    Analyze this regulation and extract key information in JSON format:
    
    Title: ${rawRegulation.title}
    Source: ${rawRegulation.source}
    
    Extract and return ONLY valid JSON (no markdown, no extra text):
    {
      "summary": "2-3 sentence overview",
      "requirements": ["requirement 1", "requirement 2", "requirement 3"],
      "hazardCategories": ["Mechanical / Machinery hazards" or "Physical health hazards" or "Chemical hazards" or "Workplace / Infrastructure Design" or "Hazardous Energy" or "Transportation" or "Ergonomic hazards" or "Organizational and Psychosocial" or "Biological hazard" or "Fire and explosion"],
      "applicableIndustries": ["industry 1", "industry 2"],
      "keyPoints": ["key point 1", "key point 2"]
    }
    `;

    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract JSON from response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    
    // Parse JSON - handle markdown code blocks
    let jsonStr = responseText;
    if (jsonStr.includes('```json')) {
      jsonStr = jsonStr.split('```json')[1].split('```')[0].trim();
    } else if (jsonStr.includes('```')) {
      jsonStr = jsonStr.split('```')[1].split('```')[0].trim();
    }
    
    const structured = JSON.parse(jsonStr);
    
    return {
      ...rawRegulation,
      ...structured,
    };
  } catch (error) {
    console.error('⚠️  AI summarization failed:', error.message);
    // Return basic structure if AI fails
    return {
      ...rawRegulation,
      summary: rawRegulation.title,
      requirements: ['See official source for requirements'],
      hazardCategories: ['Physical health hazards'],
      applicableIndustries: ['All'],
      keyPoints: ['New regulation - verify with official source'],
    };
  }
}

/**
 * Update the legal registry with new regulations
 */
async function updateRegistry(newRegulations) {
  console.log('\n📝 Updating legal registry...');
  
  // Read current registry
  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
  
  // Track additions
  let addedCount = 0;
  
  // Process each source
  for (const [source, regulations] of Object.entries(newRegulations)) {
    if (!Array.isArray(regulations) || regulations.length === 0) continue;
    
    for (const reg of regulations) {
      // Skip if already exists (check by title)
      const exists = Object.values(registry.regions).some(region =>
        Array.isArray(region.standards) &&
        region.standards.some(s => s.title === reg.title)
      );
      
      if (exists) {
        console.log(`⏭️  Already exists: ${reg.title}`);
        continue;
      }
      
      // Use AI to structure the regulation
      console.log(`🤖 Processing with AI: ${reg.title.substring(0, 50)}...`);
      const structured = await summarizeWithAI(reg);
      
      // Determine which region to add to
      let targetRegion = null;
      if (reg.source === 'OSHA') {
        targetRegion = registry.regions.US;
      } else if (reg.source === 'HSE') {
        targetRegion = registry.regions.UK;
      } else if (reg.source === 'ADOSH') {
        targetRegion = registry.regions.UAE;
      } else if (reg.source === 'ADEM') {
        targetRegion = registry.regions.LUXEMBOURG;
      }
      
      if (targetRegion && Array.isArray(targetRegion.standards)) {
        // Create regulation entry
        const newStandard = {
          id: `${reg.source}-${Date.now()}`,
          title: structured.title || reg.title,
          type: 'Standard',
          hazardCategories: structured.hazardCategories || ['Physical health hazards'],
          applicableIndustries: structured.applicableIndustries || ['All'],
          summary: structured.summary || reg.title,
          requirements: structured.requirements || [],
          keyPoints: structured.keyPoints || [],
          links: {
            official: reg.url || '#',
            guidance: reg.url || '#',
          },
          version: new Date().getFullYear().toString(),
          revisionDate: new Date().toISOString().split('T')[0],
          autoAdded: true,
          aiProcessed: true,
        };
        
        targetRegion.standards.push(newStandard);
        addedCount++;
        console.log(`✅ Added: ${newStandard.title}`);
      }
    }
  }
  
  // Update metadata
  registry.lastUpdated = new Date().toISOString();
  registry.version = '2.0.0'; // Increment version
  
  // Write back to file
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
  
  console.log(`\n✅ Registry updated: Added ${addedCount} new regulations`);
  return addedCount;
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🚀 Legal Registry Auto-Update Starting...\n');
    
    // Check for API key
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('⚠️  ANTHROPIC_API_KEY not set. AI summarization will be skipped.');
      console.warn('   Set via: export ANTHROPIC_API_KEY="your-key-here"');
    }
    
    // Step 1: Scrape regulations
    const newRegulations = await scrapeRegulations();
    
    // Step 2: Update registry
    const added = await updateRegistry(newRegulations);
    
    console.log('\n✨ Update complete!');
    console.log(`   Regulations added: ${added}`);
    console.log(`   Registry updated at: ${new Date().toISOString()}`);
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Update failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { scrapeRegulations, summarizeWithAI, updateRegistry };
