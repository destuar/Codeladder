import * as cheerio from 'cheerio';
import { XMLParser } from 'fast-xml-parser';
import { Job as JobInterface } from './job.interface';
import { JobFilters } from './jobs.controller'; // Import JobFilters
import { httpService } from '../shared/http.service';
import { logger } from '../shared/logger.service';
import { prisma } from '../config/db';
import { Job as PrismaJob, Prisma } from '@prisma/client'; // Import Prisma for WhereInput types

const BUILTIN_JOBS_URL = 'https://www.builtin.com/jobs/dev-engineering';
const BUILTIN_SITEMAP_URL = 'https://builtin.com/job-board-sitemap.xml';
const MAX_PAGES_TO_SCRAPE_ON_DEMAND = 1;
export const MAX_PAGES_TO_SCRAPE_SCHEDULED = 3;
const BASE_URL = 'https://builtin.com';

const xmlParserOptions = { ignoreAttributes: false, attributeNamePrefix: '@_' };

interface ScrapedJobData {
  externalId: string; url: string; title: string; company: string; companyUrl?: string;
  companyLogoUrl?: string; location: string; rawLocationHtml?: string; modality?: string; salary?: string;
  datePosted?: string; description?: string; skills?: string[]; source: 'builtin.com';
}

// Helper function defined at the module level
function parseRelativeDate(dateString?: string): Date | null {
  if (!dateString) return null;
  const now = new Date();
  const lowerDateString = dateString.toLowerCase();
  if (lowerDateString.includes('just now') || lowerDateString.includes('recently') || lowerDateString.includes('today')) return now;
  if (lowerDateString.includes('yesterday')) {
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1); return yesterday;
  }
  const timeMatch = lowerDateString.match(/(\d+)\s+(minute|hour|day|week|month)s?\s+ago/);
  if (timeMatch) {
    const amount = parseInt(timeMatch[1], 10); const unit = timeMatch[2]; const date = new Date(now);
    if (unit === 'minute') date.setMinutes(now.getMinutes() - amount);
    else if (unit === 'hour') date.setHours(now.getHours() - amount);
    else if (unit === 'day') date.setDate(now.getDate() - amount);
    else if (unit === 'week') date.setDate(now.getDate() - amount * 7);
    else if (unit === 'month') date.setMonth(now.getMonth() - amount);
    return date;
  }
  const directDate = new Date(dateString);
  if (!isNaN(directDate.getTime()) && directDate.getFullYear() > 2000) return directDate;
  return null;
}

function mapPrismaJobToJobInterface(prismaJob: PrismaJob): JobInterface {
  return {
    id: prismaJob.externalId, url: prismaJob.url, title: prismaJob.title, company: prismaJob.company,
    companyUrl: prismaJob.companyUrl ?? undefined, companyLogoUrl: prismaJob.companyLogoUrl ?? undefined,
    location: prismaJob.location, rawLocationHtml: prismaJob.rawLocationHtml ?? undefined,
    modality: prismaJob.modality ?? undefined,
    salary: prismaJob.salary ?? undefined,
    datePosted: prismaJob.datePostedRaw ?? '',
    description: prismaJob.description ?? undefined,
    skills: prismaJob.skills ? [...prismaJob.skills] : undefined,
    source: 'builtin.com',
  };
}

export class BuiltinService {
  private xmlParser: XMLParser;
  constructor() { this.xmlParser = new XMLParser(xmlParserOptions); }

  public async getRecentDevJobs(filters?: JobFilters): Promise<JobInterface[]> {
    logger.log('Fetching recent dev jobs from database with filters:', filters);
    
    const whereClause: Prisma.JobWhereInput = { 
        // isActive: true, // No longer filtering by isActive
        source: filters?.source || 'builtin.com' // Source filter remains
    };

    // if (filters?.location) { // Filter logic removed
    //   whereClause.location = { contains: filters.location, mode: 'insensitive' };
    // }
    // if (filters?.company) { // Filter logic removed
    //   whereClause.company = { contains: filters.company, mode: 'insensitive' };
    // }
    // if (filters?.title) { // Filter logic removed
    //   whereClause.title = { contains: filters.title, mode: 'insensitive' };
    // }
    // if (filters?.skills && filters.skills.length > 0) { // Filter logic removed
    //   whereClause.skills = { hasSome: filters.skills };
    // }
    // if (filters?.modality) { // Filter logic removed
    //   whereClause.modality = { equals: filters.modality, mode: 'insensitive' };
    // }

    try {
      const jobsFromDb = await prisma.job.findMany({
        where: whereClause,
        orderBy: [ { parsedDatePosted: 'desc' }, { createdAt: 'desc' } ], // Sort by parsedDatePosted (most recent first), then createdAt (most recent first)
        take: 50,
      });

      // Initial scrape logic if DB is empty AND no specific filters were applied that might intentionally yield zero results
      const noFiltersApplied = !filters || Object.keys(filters).filter(k => k !== 'source').length === 0;
      if (jobsFromDb.length === 0 && noFiltersApplied) {
        logger.log('No jobs found in DB (and no specific filters applied), triggering initial small scrape...');
        await this.scrapeAndStoreJobs(MAX_PAGES_TO_SCRAPE_ON_DEMAND, false);
        const newJobsFromDb = await prisma.job.findMany({
          where: whereClause, // Re-apply same (likely empty) filters
          orderBy: [ { parsedDatePosted: 'desc' }, { createdAt: 'desc' } ], // Consistent sorting
          take: 50,
        });
        return newJobsFromDb.map(mapPrismaJobToJobInterface);
      }
      return jobsFromDb.map(mapPrismaJobToJobInterface);
    } catch (error) {
      logger.error('Error fetching jobs from database:', error);
      throw error;
    }
  }

  public async scrapeAndStoreJobs(
    pageLimit: number = MAX_PAGES_TO_SCRAPE_SCHEDULED,
    _markOldAsInactive_ignored_?: boolean // Parameter name indicates it's ignored for clarity
  ): Promise<{ newJobs: number, errors: number, processedScrapedJobs: number }> {
    logger.log(`Starting FULL REFRESH job scrape. Page limit: ${pageLimit}`);
    const scrapedJobsData: ScrapedJobData[] = [];
    let errorCount = 0;
    let createdJobsCount = 0;

    // --- Stage 0: Delete existing builtin.com jobs ---
    try {
      const deleteResult = await prisma.job.deleteMany({
        where: { source: 'builtin.com' },
      });
      logger.log(`Deleted ${deleteResult.count} existing builtin.com jobs from DB.`);
    } catch (deleteError) {
      logger.error('Error deleting existing builtin.com jobs from DB:', deleteError);
      // Decide if we should proceed if deletion fails. For now, we'll proceed but log heavily.
      errorCount++; 
    }

    // --- Stage 1: Scrape data from builtin.com (Sitemap + Page scraping) ---
    // (Existing scraping logic to populate scrapedJobsData - remains largely the same)
    try {
      const sitemapXml = await httpService.get(BUILTIN_SITEMAP_URL);
      const sitemap = this.xmlParser.parse(sitemapXml);
      const urls = sitemap?.urlset?.url;
      if (urls && Array.isArray(urls)) {
        const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const recentJobSitemapEntries = urls.filter((entry: any) => 
            entry.loc && typeof entry.loc === 'string' && entry.loc.includes('/job/') &&
            (!entry['@_lastmod'] || new Date(entry['@_lastmod']) >= sevenDaysAgo)
        ).slice(0, 25 * pageLimit);
        logger.log(`Sitemap: Found ${recentJobSitemapEntries.length} recent job URLs.`);
        for (const jobEntry of recentJobSitemapEntries) {
          try {
            const jobDetailHtml = await httpService.get(jobEntry.loc as string);
            const job = this.parseJobDetailPage(jobDetailHtml, jobEntry.loc as string, jobEntry['@_lastmod'] as string | undefined);
            if (job) scrapedJobsData.push(job);
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (e) { errorCount++; logger.error(`Sitemap: Error parsing detail page ${jobEntry.loc}`, e); }
        }
      }
    } catch (e) { logger.error('Sitemap scraping failed.', e); errorCount++; }

    const desiredJobCount = 15 * pageLimit;
    if (scrapedJobsData.length < desiredJobCount) {
      logger.log(`Sitemap yielded ${scrapedJobsData.length} jobs, aiming for ${desiredJobCount}. Proceeding with page scraping.`);
      for (let i = 1; i <= pageLimit; i++) {
        if (scrapedJobsData.length >= desiredJobCount && i > 1) { logger.log('Desired job count reached, stopping early.'); break; }
        const url = `${BUILTIN_JOBS_URL}?page=${i}`;
        try {
          const html = await httpService.get(url);
          const jobsFromPage = this.parseJobListingsPage(html);
          if (jobsFromPage.length === 0 && i > 1) { logger.log('No more jobs on page, stopping.'); break; }
          scrapedJobsData.push(...jobsFromPage);
          if (i < pageLimit) await new Promise(resolve => setTimeout(resolve, 500));
        } catch (e) { errorCount++; logger.error(`Error scraping page ${url}`, e); break; }
      }
    }
    const uniqueScrapedJobs = Array.from(new Map(scrapedJobsData.map(job => [job.externalId, job])).values());
    logger.log(`Total unique jobs scraped: ${uniqueScrapedJobs.length}`);

    // --- Stage 2: Create new job records in Database ---
    for (const jobData of uniqueScrapedJobs) {
      try {
        const parsedDate = parseRelativeDate(jobData.datePosted);
        const prismaData = {
          externalId: jobData.externalId,
          url: jobData.url, title: jobData.title, company: jobData.company,
          companyUrl: jobData.companyUrl, companyLogoUrl: jobData.companyLogoUrl,
          location: jobData.location, rawLocationHtml: jobData.rawLocationHtml, 
          modality: jobData.modality, salary: jobData.salary,
          datePostedRaw: jobData.datePosted, parsedDatePosted: parsedDate,
          description: jobData.description, skills: jobData.skills || [], 
          source: 'builtin.com',
          // isActive is no longer part of the model for create
        };
        await prisma.job.create({ data: prismaData });
        createdJobsCount++;
      } catch (dbError: any) {
        // Check for unique constraint violation if a job somehow wasn't deleted
        if (dbError instanceof Prisma.PrismaClientKnownRequestError && dbError.code === 'P2002') {
            logger.warn(`Job with externalId ${jobData.externalId} already exists, likely due to delete failure or race condition. Skipping.`);
            errorCount++; // Still count as an error/issue
        } else {
            logger.error(`DB error creating job externalId ${jobData.externalId}:`, dbError);
            errorCount++;
        }
      }
    }
    logger.log(`DB Create phase complete. Created jobs: ${createdJobsCount}.`);

    // Stage 3 (Marking old as inactive) is removed.

    return { newJobs: createdJobsCount, errors: errorCount, processedScrapedJobs: uniqueScrapedJobs.length }; // updatedJobs is 0 as we only create
  }

  private parseJobDetailPage(html: string, url: string, datePostedRaw?: string): ScrapedJobData | null {
    const $ = cheerio.load(html);
    const title = $('h1[data-id="job-title"]').first().text().trim() || $('.job-title').first().text().trim();
    const companyName = $('a[data-id="company-title"]').first().text().trim() || $('.company-name').first().text().trim();
    const mainLocationElement = $('span[data-id="job-location"]').first(); // More specific if available
    const location = mainLocationElement.text().trim() || $('.job-location').first().text().trim(); // Fallback
    const rawLocationHtml = mainLocationElement.parent().html() || undefined; // Get parent HTML for context
    let description = $('.job-description-container').first().html() || $('div[data-id="job-description"]').first().html() || '';
    description = cheerio.load(description).text().trim().substring(0, 1000) + (description.length > 1000 ? '...' : ''); // Increased length
    const companyLinkElement = $('a[data-id="company-title"]').first();
    const companyUrl = companyLinkElement.attr('href') ? `${BASE_URL}${companyLinkElement.attr('href')}` : undefined;
    const companyLogoUrl = $('img[data-id="company-img"]').first().attr('src');
    const urlParts = url.split('/');
    const potentialId = urlParts.pop() || urlParts.pop(); 
    const externalId = `builtin-job-${potentialId}`;
    // Modality and Salary are less common on detail pages, more on list items usually.
    // If they exist, selectors would be needed here.
    if (!title || !companyName || !location || !potentialId) { logger.warn(`Could not parse details for job detail page: ${url}`); return null; }
    return { externalId, url, title, company: companyName, companyUrl, companyLogoUrl, location, rawLocationHtml, datePosted: datePostedRaw, description, skills: [], source: 'builtin.com' };
  }

  private parseJobListingsPage(html: string): ScrapedJobData[] {
    const $ = cheerio.load(html);
    const jobs: ScrapedJobData[] = [];
    // Target job cards specifically within the top and bottom search results containers
    $('#search-results-top div[data-id="job-card"], #search-results-bottom div[data-id="job-card"]').each((_index: number, element: any) => {
      const jobCard = $(element);
      try {
        const titleElement = jobCard.find('a[data-id="job-card-title"]');
        const title = titleElement.text().trim();
        const jobUrlSuffix = titleElement.attr('href');
        const url = jobUrlSuffix ? `${BASE_URL}${jobUrlSuffix}` : '';
        const companyElement = jobCard.find('a[data-id="company-title"] span');
        const company = companyElement.text().trim();
        const companyUrlSuffix = jobCard.find('a[data-id="company-title"]').attr('href');
        const companyUrl = companyUrlSuffix ? `${BASE_URL}${companyUrlSuffix}` : undefined;
        const companyLogoUrl = jobCard.find('img[data-id="company-img"]').attr('src');
        
        // Location parsing
        const locationElementContainer = jobCard.find('i.fa-regular.fa-location-dot').first().parent().next('div');
        const mainLocationSpan = locationElementContainer.find('span.font-barlow.text-gray-04').first();

        let location: string = '';
        let rawLocationHtml: string | undefined = undefined;

        if (mainLocationSpan.length > 0) {
            location = mainLocationSpan.text().trim();
            // If this span has tooltip attributes, capture its HTML for rawLocationHtml
            if (mainLocationSpan.attr('data-bs-toggle') === 'tooltip') {
                // Cheerio's .html() on a single element gets its inner HTML.
                // To get the outer HTML of the span itself, we wrap it and get the parent's inner HTML.
                rawLocationHtml = $('<div>').append(mainLocationSpan.clone()).html() || undefined;
            }
        } else {
            // Fallback if the structure is different or span not found
            location = locationElementContainer.text().trim();
        }

        const datePostedElement = jobCard.find('span.fs-xs.fw-bold.bg-gray-01.font-Montserrat');
        let datePosted = datePostedElement.text().trim();
        if (datePostedElement.find('i.fa-clock').length > 0) { datePosted = datePostedElement.contents().filter(function(this: any) { return this.type === 'text'; }).text().trim(); }
        
        // Modality (Hybrid/Remote/In-person)
        let modality: string | undefined = undefined;
        const hybridIcon = jobCard.find('i.fa-house-building');
        if (hybridIcon.length > 0) {
            modality = hybridIcon.parent().next('span.font-barlow.text-gray-04').text().trim();
        }
        if (!modality) {
            const remoteIcon = jobCard.find('i.fa-signal-stream');
            if (remoteIcon.length > 0) {
                modality = remoteIcon.parent().next('span.font-barlow.text-gray-04').text().trim();
            }
        }
        // Add more checks for other modality icons/texts if needed

        // Salary
        let salary: string | undefined = undefined;
        const salaryIcons = jobCard.find('i.fa-sack-dollar');
        if (salaryIcons.length > 0) {
            const firstIcon = salaryIcons.first(); // Process only the first matched icon
            const salarySpan = firstIcon.parent().next('span.font-barlow.text-gray-04');
            if (salarySpan.length > 0) {
                const salaryText = salarySpan.text().trim();
                if (salaryText) { // Ensure it's not an empty string after trimming
                    salary = salaryText;
                }
            }
        }

        const descriptionContainerTarget = jobCard.find('[data-bs-target]').attr('data-bs-target');
        const descriptionContainerId = descriptionContainerTarget ? `#${descriptionContainerTarget.substring(1)}` : null;
        let description = '';
        if (descriptionContainerId) { description = $(descriptionContainerId).find('.fs-sm.fw-regular.mb-md.text-gray-04').first().text().trim(); }
        const skills: string[] = [];
        if (descriptionContainerId) { $(descriptionContainerId).find('.d-md-inline.ps-md-sm span.fs-xs.text-gray-04.mx-sm').each((_i: number, skillEl: any) => { skills.push($(skillEl).text().trim()); }); }
        const cardIdAttr = jobCard.attr('id');
        if (!cardIdAttr || !title || !url || !company || !location) { logger.warn('Missing attributes for job card:', cardIdAttr); return; }
        jobs.push({ externalId: cardIdAttr, url, title, company, companyUrl, companyLogoUrl, location, rawLocationHtml, modality, salary, datePosted, description: description.substring(0, 250) + (description.length > 250 ? '...':''), skills: skills.length > 0 ? skills : undefined, source: 'builtin.com' });
      } catch (e) { logger.error('Error parsing job card:', e, jobCard.html()?.substring(0,300)); }
    });
    logger.log(`Parsed ${jobs.length} jobs from page HTML.`);
    return jobs;
  }
}

export const builtinService = new BuiltinService(); 