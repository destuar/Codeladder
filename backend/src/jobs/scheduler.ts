import cron from 'node-cron';
import { builtinService, MAX_PAGES_TO_SCRAPE_SCHEDULED } from './builtin.service';
import { logger } from '../shared/logger.service';

// Simple in-memory lock to prevent overlapping jobs
// For a multi-instance deployment, a distributed lock (e.g., using Redis) would be necessary.
let isBuiltinScrapeJobRunning = false;

// Schedule to run every 15 minutes (e.g., at 0, 15, 30, 45 minutes past the hour)
// For testing, you might use '*/1 * * * *' (every minute)
const CRON_SCHEDULE = '*/15 * * * *'; // Every 5 minutes

logger.log(`Initializing job scheduler for builtin.com with schedule: ${CRON_SCHEDULE}`);

cron.schedule(CRON_SCHEDULE, async () => {
  if (isBuiltinScrapeJobRunning) {
    logger.warn('Builtin.com scrape job is already in progress. Skipping this scheduled run.');
    return;
  }

  logger.log('Starting scheduled job scrape for builtin.com...');
  isBuiltinScrapeJobRunning = true;

  try {
    // Use the exported constant for page limit in scheduled job
    const result = await builtinService.scrapeAndStoreJobs(MAX_PAGES_TO_SCRAPE_SCHEDULED);
    logger.log(
      `Scheduled builtin.com scrape finished. ` +
      `Processed Scraped: ${result.processedScrapedJobs}, ` +
      `DB New (Created): ${result.newJobs}, ` +
      `Errors: ${result.errors}`
    );
  } catch (error) {
    logger.error('Error during scheduled builtin.com job scrape execution:', error);
  } finally {
    isBuiltinScrapeJobRunning = false;
    logger.log('Scheduled builtin.com scrape job lock released.');
  }
});

// Initial scrape on startup, after a short delay to allow server to be fully up.
// This helps populate the DB quickly if it's empty, without waiting for the first cron.
setTimeout(() => {
  logger.log('Performing initial startup scrape for builtin.com...');
  if (isBuiltinScrapeJobRunning) {
    logger.warn('Builtin.com scrape job is already in progress (perhaps from a very fast cron). Skipping initial startup run.');
    return;
  }
  isBuiltinScrapeJobRunning = true; // Set lock for initial run
  builtinService.scrapeAndStoreJobs(MAX_PAGES_TO_SCRAPE_SCHEDULED)
    .then(result => {
      logger.log(
        `Initial startup builtin.com scrape finished. ` +
        `Processed Scraped: ${result.processedScrapedJobs}, ` +
        `DB New (Created): ${result.newJobs}, ` +
        `Errors: ${result.errors}`
      );
    })
    .catch(error => {
      logger.error('Error during initial startup builtin.com job scrape:', error);
    })
    .finally(() => {
        isBuiltinScrapeJobRunning = false;
        logger.log('Initial startup builtin.com scrape job lock released.');
    });
}, 10000); // 10-second delay 