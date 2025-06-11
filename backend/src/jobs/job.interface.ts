export interface Job {
  id: string; // Unique ID, derived from job URL or a unique attribute on the card
  url: string; // Direct URL to the job detail page on builtin.com
  title: string;
  company: string;
  companyUrl?: string; // URL to the company page on builtin.com
  companyLogoUrl?: string;
  location: string; // Primary display location (e.g., first one found or a summary)
  rawLocationHtml?: string; // For frontend to potentially render multiple locations or complex formats
  modality?: string; // e.g., "Remote", "Hybrid", "In-person"
  salary?: string;   // e.g., "87K-123K Annually"
  datePosted: string; // e.g., "Reposted 2 hours ago"
  description?: string; // Short description from the card
  skills?: string[];
  source: 'builtin.com';
} 