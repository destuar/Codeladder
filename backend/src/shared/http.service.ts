import axios, { AxiosInstance } from 'axios';
import { logger } from './logger.service';

const CODELADDER_USER_AGENT = 'CodeladderJobScraper/1.0 (Project Codeladder)';

export class HttpService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      headers: {
        'User-Agent': CODELADDER_USER_AGENT,
      },
      timeout: 15000, // 15 seconds timeout
    });
  }

  public async get(url: string): Promise<string> {
    try {
      logger.log(`Fetching URL: ${url}`);
      const response = await this.axiosInstance.get<string>(url);
      return response.data;
    } catch (error) {
      logger.error(`Error fetching URL: ${url}`, error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to fetch ${url}: ${error.message} (Status: ${error.response?.status})`);
      } else {
        throw new Error(`Failed to fetch ${url}: An unknown error occurred`);
      }
    }
  }
}

export const httpService = new HttpService(); 