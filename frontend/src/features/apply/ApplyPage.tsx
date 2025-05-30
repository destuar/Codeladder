import React, { useEffect, useState, useCallback } from 'react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'; // Import Radix UI Tooltip components

interface Job {
  id: string;
  title: string;
  company: string;
  location: string; // Primary display location
  rawLocationHtml?: string; // For potentially richer display of multiple locations
  modality?: string; // e.g., "Remote", "Hybrid", "In-person"
  salary?: string;   // e.g., "87K-123K Annually"
  url: string;
  description?: string;
  // New fields from backend
  companyLogoUrl?: string;
  companyUrl?: string;
  datePosted?: string;
  skills?: string[];
  source?: string; // e.g., 'builtin.com'
}

// const MODALITY_OPTIONS = ['Remote', 'Hybrid', 'In-person']; // Or fetch from backend if dynamic -- Filter UI Removed

export function ApplyPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedJobs, setExpandedJobs] = useState<Record<string, boolean>>({}); // State for expanded jobs

  const toggleJobExpansion = (jobId: string) => {
    setExpandedJobs(prev => ({ ...prev, [jobId]: !prev[jobId] }));
  };

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    setError(null);


    const apiUrl = '/api/jobs/builtin'; // API URL without query params

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorData.error || errorMsg;
        } catch (jsonError) { /* Ignore */ }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      setJobs(data as Job[]);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred while fetching jobs.');
      }
      console.error("Failed to fetch jobs:", err);
      setJobs([]); // Clear jobs on error
    } finally {
      setIsLoading(false);
    }
  }, []); // Dependencies removed as filters are gone 

  // Initial fetch on component mount
  useEffect(() => {
      fetchJobs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchJobs]); // fetchJobs is now a stable dependency due to empty deps array in its useCallback

  return (
    <div className="font-mono relative bg-background min-h-screen container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 z-0 bg-dot-[#5271FF]/[0.2] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
      <div className="relative z-10"> {/* Wrapper for content to be above the dot pattern */}
        <h1 className="text-3xl font-bold mb-4 text-center">
          <span className="block sm:hidden">New Software Roles</span>
          <span className="hidden sm:block">New Software Engineering Roles</span>
        </h1>
        <p className="text-center text-muted-foreground mb-6">
          Updated by the minute.
          <br className="sm:hidden" /> Powered by Built In.
        </p>


        {isLoading && (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
          </div>
        )}

        {error && (
          <div className="text-center text-red-500 bg-red-100 p-4 rounded-md">
            <p className="font-semibold">Error loading jobs:</p>
            <p>{error}</p>
            <p className="mt-2 text-sm">Please try again later or check if the backend service is running.</p>
          </div>
        )}

        {!isLoading && !error && jobs.length === 0 && (
          <div className="text-center text-muted-foreground bg-card p-6 rounded-md shadow">
            <h2 className="text-xl font-semibold mb-2">No Jobs Found</h2>
            <p>No jobs match your current filters, or the job scraper encountered an issue.</p>
            <p>Please check back later, try different filters, or clear filters.</p>
          </div>
        )}

        {!isLoading && !error && jobs.length > 0 && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {jobs.map((job) => {
              const isExpanded = expandedJobs[job.id];
              const hasExpandableContent = job.description || (job.skills && job.skills.length > 0);

              return (
                <div 
                  key={job.id} 
                  className={`relative font-sans bg-card pt-6 px-6 pb-1 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 ${hasExpandableContent ? 'cursor-pointer' : ''} dark:border dark:border-[#5271FF]/15 dark:shadow-[0_4px_6px_-1px_rgba(82,113,255,0.15),_0_2px_4px_-2px_rgba(82,113,255,0.15)]`}
                  onClick={hasExpandableContent ? () => toggleJobExpansion(job.id) : undefined}
                  role={hasExpandableContent ? "button" : undefined}
                  tabIndex={hasExpandableContent ? 0 : undefined}
                  onKeyDown={hasExpandableContent ? (e) => { if (e.key === 'Enter' || e.key === ' ') toggleJobExpansion(job.id); } : undefined}
                  aria-expanded={hasExpandableContent ? isExpanded : undefined}
                >
                  {/* New Header div to contain all always-visible content */}
                  <div className="relative pb-6"> {/* pb-12 is to ensure space for the absolute positioned button at the bottom */}
                    {/* Top-right absolutely positioned date and salary (relative to this new header div) */}
                    <div className="absolute top-0 right-0 text-xs sm:text-sm text-right space-y-1">
                      {job.datePosted && (
                        <p className="text-muted-foreground">{job.datePosted}</p>
                      )}
                      {job.salary && (
                        <p className="text-muted-foreground">{job.salary}</p>
                      )}
                    </div>

                    {/* Bottom-right absolutely positioned apply button (relative to this new header div) */}
                    <div className="absolute bottom-5 right-0">
                      <a 
                        href={job.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-sans antialiased bg-[#5271FF] text-white hover:bg-[#415ACC] px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-colors duration-200 whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()} // Prevent tile click when button is clicked
                      >
                        View or Apply
                      </a>
                    </div>

                    {/* Main content area (left side), now inside the header div */}
                    <div className="mr-[150px]"> {/* Removed mb-3, mr-[150px] remains */}
                      <div className="flex items-start space-x-4">
                        {job.companyLogoUrl && (
                          <img 
                            src={job.companyLogoUrl} 
                            alt={`${job.company} logo`} 
                            className="h-12 w-12 object-contain rounded-md border border-border"
                          />
                        )}
                        <div>
                          <h2 className="text-lg sm:text-xl font-semibold text-primary mb-1">{job.title}</h2>
                          {job.companyUrl ? (
                            <a href={job.companyUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm sm:text-base">{job.company}</a>
                          ) : (
                            <p className="text-muted-foreground text-sm sm:text-base">{job.company}</p>
                          )}
                          <div className="text-muted-foreground text-xs sm:text-sm">
                            {job.rawLocationHtml ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span 
                                      dangerouslySetInnerHTML={{ __html: job.location }} // Display primary location text or "X Locations"
                                      className="cursor-pointer text-primary hover:underline"
                                    />
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom">
                                    {
                                      (() => {
                                        const locationsHtmlString = job.rawLocationHtml.match(/data-bs-title="([^"]*)"/)?.[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                                        if (locationsHtmlString) {
                                          const parser = new DOMParser();
                                          const doc = parser.parseFromString(locationsHtmlString, 'text/html');
                                          const locationElements = doc.querySelectorAll('div.text-truncate');
                                          const locations = Array.from(locationElements).map(el => el.textContent || '').filter(loc => loc.trim() !== '');
                                          
                                          if (locations.length > 0) {
                                            return locations.map((loc, index) => (
                                              <div key={index} className="whitespace-nowrap">{loc}</div>
                                            ));
                                          }
                                        }
                                        return <p>Details not available</p>;
                                      })()
                                    }
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              job.location
                            )} 
                            {job.modality && <span className="mx-1">|</span>} 
                            {job.modality && <span className="text-accent-foreground">{job.modality}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div> {/* End of new Header div */}
                  
                  {/* Expanded content section - remains a direct child of the main tile div */}
                  {isExpanded && hasExpandableContent && (
                    <div className="p-4 border-t border-border">
                      {job.description && (
                        <div className="mb-4">
                          <h4 className="text-xs sm:text-sm font-semibold mb-1 text-foreground">Description:</h4>
                          <p className="text-xs sm:text-sm text-foreground/80">
                            {job.description}
                          </p>
                        </div>
                      )}

                      {job.skills && job.skills.length > 0 && (
                        <div>
                          <h4 className="text-xs sm:text-sm font-semibold mb-1 text-foreground">Top Skills:</h4>
                          <div className="flex flex-wrap gap-2">
                            {job.skills.map((skill, index) => (
                              <span key={index} className="bg-secondary text-secondary-foreground px-2 py-1 rounded-full text-xs">
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div> {/* Close relative z-10 wrapper */}
    </div>
  );
} 