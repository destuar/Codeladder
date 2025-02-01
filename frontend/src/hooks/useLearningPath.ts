import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export interface Problem {
  id: string;
  name: string;
  difficulty: 'EASY_IIII' | 'EASY_III' | 'EASY_II' | 'EASY_I' | 'MEDIUM' | 'HARD';
  required: boolean;
  reqOrder?: number;
  content?: string;
  completed?: boolean;
}

export interface Topic {
  id: string;
  name: string;
  description?: string;
  content?: string;
  order: number;
  problems: Problem[];
}

export interface Level {
  id: string;
  name: string;
  order: number;
  description?: string;
  topics: Topic[];
}

export function useLearningPath() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLearningPath = async () => {
      try {
        setLoading(true);
        console.log('Fetching learning path data...');
        const response = await api.get('/learning/levels');
        console.log('Raw API response:', response);
        console.log('Response data:', response);
        
        if (!Array.isArray(response)) {
          console.error('Expected array of levels, got:', typeof response);
          setError('Invalid data format received from server');
          return;
        }

        setLevels(response);
        setError(null);
      } catch (err) {
        console.error('Error fetching learning path:', err);
        setError('Failed to load learning path data');
      } finally {
        setLoading(false);
      }
    };

    fetchLearningPath();
  }, []);

  return { levels, loading, error };
} 