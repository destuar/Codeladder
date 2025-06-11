import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/tooltip'; // Import Radix UI Tooltip components
import { PageLoadingSpinner } from '@/components/ui/loading-spinner';
import DottedBackground from "@/components/DottedBackground";

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

// Helper function to extract individual locations from raw HTML string
const extractLocationsFromRawHtml = (rawHtml: string | undefined): string[] => {
  if (!rawHtml) return [];
  // Regex to find content within data-bs-title="..."
  const match = rawHtml.match(/data-bs-title="([^"]*)"/);
  const locationsHtmlString = match?.[1]?.replace(/&lt;/g, '<').replace(/&gt;/g, '>');

  if (locationsHtmlString) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(locationsHtmlString, 'text/html');
      // This selector is based on observed structure from builtin.com tooltip data
      const locationElements = doc.querySelectorAll('div.text-truncate');
      return Array.from(locationElements)
        .map(el => el.textContent?.trim() || '')
        .filter(loc => loc !== '');
    } catch (e) {
      console.error("Error parsing rawLocationHtml:", e);
      return [];
    }
  }
  return [];
};

export function ApplyPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedJobs, setExpandedJobs] = useState<Record<string, boolean>>({}); // State for expanded jobs

  // New state variables for filters
  const [selectedModalities, setSelectedModalities] = useState<string[]>([]); // 'Remote', 'Hybrid'
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedCompany, setSelectedCompany] = useState<string>('');

  const [availableLocations, setAvailableLocations] = useState<string[]>(['']); // Start with "All"
  const [availableCompanies, setAvailableCompanies] = useState<string[]>(['']); // Start with "All"

  // State for mobile filter dropdown visibility
  const [showMobileFilters, setShowMobileFilters] = useState(false);

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

  // Populate available locations for dropdown
  useEffect(() => {
    if (jobs.length > 0) {
      const locationsSet = new Set<string>();
      jobs.forEach(job => {
        const modality = job.modality?.trim().toLowerCase() || '';
        // Populate from Hybrid jobs or jobs with blank modality
        if (modality === 'hybrid' || !modality) {
          const primaryLocation = job.location?.trim() || '';
          let individualLocations: string[] = extractLocationsFromRawHtml(job.rawLocationHtml);

          if (individualLocations.length > 0) {
            // If we successfully extracted individual locations, add them
            individualLocations.forEach(loc => locationsSet.add(loc));
          } else if (primaryLocation && !/^\d+\s*locations?$/i.test(primaryLocation) && !primaryLocation.toLowerCase().includes('multiple locations')) {
            // Otherwise, add the primary location text, but only if it's not a generic "X locations" / "Multiple locations" string
            locationsSet.add(primaryLocation);
          }
        }
      });
      setAvailableLocations(['', ...Array.from(locationsSet).sort()]);
    } else {
      setAvailableLocations(['']);
    }
  }, [jobs]);

  // Populate available companies for dropdown
  useEffect(() => {
    if (jobs.length > 0) {
      const companies = new Set<string>();
      jobs.forEach(job => {
        if (job.company && job.company.trim()) {
          companies.add(job.company.trim());
        }
      });
      setAvailableCompanies(['', ...Array.from(companies).sort()]);
    } else {
      setAvailableCompanies(['']);
    }
  }, [jobs]);

  const handleModalityChange = (modality: string) => {
    setSelectedModalities(prev =>
      prev.includes(modality)
        ? prev.filter(m => m !== modality)
        : [...prev, modality]
    );
  };

  // Client-side filtering logic
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const jobModality = job.modality?.trim().toLowerCase() || '';
      const jobLocation = job.location?.trim() || ''; // Keep original casing for comparison with dropdown values
      const jobCompany = job.company?.trim() || '';   // Keep original casing

      // Modality Filter
      let passesModality = false;
      if (selectedModalities.length === 0) {
        passesModality = true;
      } else {
        if (selectedModalities.some(sm => jobModality === sm.toLowerCase())) {
          passesModality = true;
        } else if (!jobModality) { // If job's modality is blank
          passesModality = true; // "if modality is blank, always include it"
        }
      }
      if (!passesModality) return false;

      // Company Filter
      const passesCompany = !selectedCompany || jobCompany === selectedCompany;
      if (!passesCompany) return false;

      // Location Filter
      const isRemoteModalityActive = selectedModalities.some(sm => sm.toLowerCase() === 'remote');
      const noModalitiesSelected = selectedModalities.length === 0;

      if (jobModality === 'remote' && (isRemoteModalityActive || noModalitiesSelected)) {
        return true; // Remote job passes location filter if Remote is an active/implied choice
      }

      // If not a "Remote job that bypasses location filter", then apply location dropdown
      if (!selectedLocation) return true; // No location selected in dropdown, so passes

      const primaryJobLocation = job.location?.trim() || '';
      if (primaryJobLocation === selectedLocation) return true; // Direct match of primary location text

      // If primary location text didn't match, and it MIGHT be a multi-location job, parse rawHTML
      if (job.rawLocationHtml) { // Check rawLocationHtml for more detailed matching
        const extractedJobLocations = extractLocationsFromRawHtml(job.rawLocationHtml);
        if (extractedJobLocations.includes(selectedLocation)) {
          return true;
        }
      }

      return false; // Fails location filter
    });
  }, [jobs, selectedModalities, selectedLocation, selectedCompany]);

  return (
    <div className="font-mono relative bg-background min-h-screen container mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <DottedBackground />
      <div className="relative z-10"> {/* Wrapper for content to be above the dot pattern */}
        <h1 className="text-3xl font-bold mb-4 text-center">
          <span className="block sm:hidden">New Software Roles</span>
          <span className="hidden sm:block">New Software Engineering Roles</span>
        </h1>
        <p className="text-center text-muted-foreground mb-6">
          Updated by the minute.
          <br className="sm:hidden" /> Powered by Built In.
        </p>

        {/* Filter UI Section - Outer container for button and filter box */}
        <div className="mb-8 max-w-4xl mx-auto">
          {/* Mobile "Show/Hide Filters" Button */}
          <div className="md:hidden text-center mb-4">
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className="
                inline-block px-8 py-2 font-sans /* Removed w-full, added inline-block, adjusted px */
                bg-card text-primary rounded-lg shadow-md hover:shadow-lg 
                focus:outline-none 
                dark:border dark:border-[#5271FF]/15 
                dark:shadow-[0_4px_6px_-1px_rgba(82,113,255,0.15),_0_2px_4px_-2px_rgba(82,113,255,0.15)]
              "
            >
              {showMobileFilters ? 'Hide Filters' : 'Show Filters'}
            </button>
          </div>

          {/* Filters container - hidden on mobile by default, shown on md+, or shown on mobile if showMobileFilters is true */}
          <div
            className={`
              p-6 bg-card shadow-md rounded-lg
              dark:border dark:border-[#5271FF]/15 
              dark:shadow-[0_4px_6px_-1px_rgba(82,113,255,0.15),_0_2px_4px_-2px_rgba(82,113,255,0.15)]
              ${showMobileFilters ? 'block' : 'hidden'} md:block
            `}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-baseline">
              {/* Modality Filter */}
              <div>
                <label className="block text-sm font-sans text-muted-foreground mb-1">Modality</label>
                <div className="flex space-x-4 mt-1 transform translate-x-4 translate-y-2 mb-2">
                  {['Remote', 'Hybrid'].map(modality => (
                    <label key={modality} className="flex items-center space-x-2 cursor-pointer font-sans">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded-sm border-gray-300 bg-gray-100 accent-primary focus:ring-0 focus:ring-offset-0 checked:bg-primary checked:text-black dark:border-gray-600 dark:bg-gray-700 dark:checked:text-white"
                        checked={selectedModalities.includes(modality)}
                        onChange={() => handleModalityChange(modality)}
                      />
                      <span className="text-sm text-foreground">{modality}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Location Filter */}
              <div>
                <label htmlFor="location-filter" className="block text-sm font-sans text-muted-foreground mb-1">Location</label>
                <select
                  id="location-filter"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-primary focus:border-primary rounded-md bg-background text-foreground font-sans"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                >
                  {availableLocations.map(loc => (
                    <option key={loc || 'all-locations'} value={loc}>{loc || 'All Locations'}</option>
                  ))}
                </select>
              </div>

              {/* Company Filter */}
              <div>
                <label htmlFor="company-filter" className="block text-sm font-sans text-muted-foreground mb-1">Company</label>
                <select
                  id="company-filter"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-primary focus:border-primary rounded-md bg-background text-foreground font-sans"
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                >
                  {availableCompanies.map(comp => (
                    <option key={comp || 'all-companies'} value={comp}>{comp || 'All Companies'}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {isLoading && (
          <PageLoadingSpinner />
        )}

        {error && (
          <div className="text-center text-red-500 bg-red-100 p-4 rounded-md">
            <p className="font-semibold">Error loading jobs:</p>
            <p>{error}</p>
            <p className="mt-2 text-sm">Please try again later or check if the backend service is running.</p>
          </div>
        )}

        {!isLoading && !error && filteredJobs.length === 0 && (
          <div className="text-center text-muted-foreground bg-card p-6 rounded-md shadow">
            <h2 className="text-xl font-semibold mb-2">No Jobs Found</h2>
            <p>No jobs match your current filters, or the job scraper encountered an issue.</p>
            <p>Please check back later, try different filters, or clear filters.</p>
          </div>
        )}

        {!isLoading && !error && filteredJobs.length > 0 && (
          <div className="space-y-6 max-w-4xl mx-auto">
            {filteredJobs.map((job) => {
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