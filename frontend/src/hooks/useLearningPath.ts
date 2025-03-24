import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/features/auth/AuthContext';

export interface Problem {
  id: string;
  name: string;
  slug?: string;
  difficulty: 'EASY_IIII' | 'EASY_III' | 'EASY_II' | 'EASY_I' | 'MEDIUM' | 'HARD';
  required: boolean;
  reqOrder?: number;
  content?: string;
  completed?: boolean;
  problemType: 'INFO' | 'CODING';
  collectionIds?: string[];
  codeTemplate?: string;
  testCases?: string;
  estimatedTime?: number;
  topic?: Topic;
}

export interface Topic {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  content?: string;
  order: number;
  problems: Problem[];
  level: Level;
}

export interface Level {
  id: string;
  name: string;
  order: number;
  description?: string;
  topics: Topic[];
}

export function useLearningPath() {
  const { token } = useAuth();
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const fetchLevels = async () => {
      try {
        setLoading(true);
        const response = await api.get('/learning/levels', token);
        setLevels(response);
        setError(null);
      } catch (err) {
        console.error('Error fetching levels:', err);
        setError('Failed to load learning path');
      } finally {
        setLoading(false);
      }
    };

    fetchLevels();
  }, [token, version]);

  const refresh = () => {
    setVersion(v => v + 1);
  };

  return { levels, loading, error, refresh, setLevels };
} 