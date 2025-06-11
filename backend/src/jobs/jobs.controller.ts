import { Router, Request, Response, NextFunction } from 'express';
import { builtinService } from './builtin.service';
import { logger } from '../shared/logger.service';
// import { JobSource } from '@prisma/client'; // Removed as source is just a string in Prisma model

export const jobsRouter = Router();

export interface JobFilters { // Exporting for potential use in service
  // location?: string; // Filter removed
  // company?: string; // Filter removed
  // skills?: string[]; // Filter removed
  // title?: string; // Filter removed
  // modality?: string; // Filter removed
  source?: string; // Changed from JobSource to string
}

jobsRouter.get('/builtin', async (req: Request, res: Response, next: NextFunction) => {
  try {
    logger.log('Request received for /builtin jobs'); // Removed req.query from log

    const filters: JobFilters = {}; // Filters object is now minimal
    // if (req.query.location && typeof req.query.location === 'string') { // Filter logic removed
    //   filters.location = req.query.location;
    // }
    // if (req.query.company && typeof req.query.company === 'string') { // Filter logic removed
    //   filters.company = req.query.company;
    // }
    // if (req.query.title && typeof req.query.title === 'string') { // Filter logic removed
    //   filters.title = req.query.title;
    // }
    // if (req.query.modality && typeof req.query.modality === 'string') { // Filter logic removed
    //   filters.modality = req.query.modality;
    // }
    // if (req.query.skills && typeof req.query.skills === 'string') { // Filter logic removed
    //   filters.skills = req.query.skills.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0);
    //   if (filters.skills.length === 0) delete filters.skills; // Remove if empty after parsing
    // }
    
    // Source is implicitly 'builtin.com' for this controller, but filters can still hold it.
    filters.source = 'builtin.com';

    const jobs = await builtinService.getRecentDevJobs(filters); 
    res.json(jobs);
  } catch (error) {
    logger.error('Error in /builtin jobs controller', error);
    // Pass error to the global error handler
    next(error);
  }
}); 