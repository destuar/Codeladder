import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useProfile } from './ProfileContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Pencil, X, Check, Book, Trophy, Brain, ChevronRight, ArrowRight, RepeatIcon, LockIcon } from 'lucide-react';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";

// Types for dashboard statistics
interface DashboardStats {
  topicsExplored: number;
  topicsCompleted: number;
  problemsSolved: number;
  practiceReviews: number;
  nextTopicId?: string;
  nextTopicSlug?: string;
}

// Types for learning data
interface Problem {
  id: string;
  completed: boolean;
  required: boolean;
}

interface Topic {
  id: string;
  name: string;
  slug?: string;
  problems: Problem[];
}

interface Level {
  id: string;
  name: string;
  topics: Topic[];
}

// Memory strength stats interface
interface MemoryStats {
  byLevel: Record<string, number>;
  averageLevel: number;
  dueNow: number;
}

// Review stats from API
interface ReviewStatsResponse {
  byLevel: Record<string, number>;
  dueNow: number;
  dueThisWeek: number;
  totalReviewed: number;
  completedToday: number;
  completedThisWeek: number;
  completedThisMonth: number;
}

export default function ProfilePage() {
  const { user, setUser, token } = useAuth();
  const { profile, updateProfile } = useProfile();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [isLoading, setIsLoading] = useState(false);

  // Get learning path data
  const { data: levelsData, isLoading: levelsLoading } = useQuery<Level[]>({
    queryKey: ['learningPath'],
    queryFn: async () => {
      if (!token) throw new Error('No token available');
      return api.get('/learning/levels', token);
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Get review stats data
  const { data: reviewStats, isLoading: reviewStatsLoading } = useQuery<ReviewStatsResponse>({
    queryKey: ['reviewStats'],
    queryFn: async () => {
      if (!token) throw new Error('No token available');
      return api.get('/spaced-repetition/stats', token);
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Calculate memory strength from review stats
  const memoryStats = useQuery<MemoryStats>({
    queryKey: ['memoryStrength', reviewStats],
    queryFn: () => {
      if (!reviewStats?.byLevel) {
        return {
          byLevel: {},
          averageLevel: 0,
          dueNow: 0
        };
      }
      
      let totalLevelCount = 0;
      let totalItems = 0;
      
      Object.entries(reviewStats.byLevel).forEach(([level, count]) => {
        if (level !== 'null' && level !== 'undefined') {
          const numLevel = parseInt(level, 10);
          if (!isNaN(numLevel)) {
            totalLevelCount += numLevel * (count as number);
            totalItems += (count as number);
          }
        }
      });
      
      const averageLevel = totalItems > 0 
        ? parseFloat((totalLevelCount / totalItems).toFixed(1)) 
        : 0;
      
      return {
        byLevel: reviewStats.byLevel,
        averageLevel,
        dueNow: reviewStats.dueNow || 0
      };
    },
    enabled: !!reviewStats,
  });
  
  // Calculate dashboard stats from levels data
  const dashboardStats = useQuery<DashboardStats>({
    queryKey: ['dashboardStats', levelsData, reviewStats],
    queryFn: () => {
      if (!levelsData || !reviewStats) {
        return {
          topicsExplored: 0,
          topicsCompleted: 0,
          problemsSolved: 0,
          practiceReviews: 0
        };
      }
      
      // Set to track seen topic and problem IDs to prevent double counting
      const seenTopicIds = new Set<string>();
      const seenProblemIds = new Set<string>();
      
      let topicsExplored = 0;
      let topicsCompleted = 0;
      let problemsSolved = 0;
      let nextTopicId: string | undefined;
      let nextTopicSlug: string | undefined;
      let foundIncomplete = false;
      
      for (const level of levelsData) {
        if (foundIncomplete) break;
        
        for (const topic of level.topics) {
          // Skip if already processed
          if (seenTopicIds.has(topic.id)) continue;
          seenTopicIds.add(topic.id);
          
          // Count completed and required problems
          let completedProblems = 0;
          let requiredProblems = 0;
          let completedRequiredProblems = 0;
          
          for (const problem of topic.problems) {
            // Skip if already counted
            if (seenProblemIds.has(problem.id)) continue;
            seenProblemIds.add(problem.id);
            
            if (problem.required) {
              requiredProblems++;
            }
            
            if (problem.completed) {
              completedProblems++;
              problemsSolved++;
              
              if (problem.required) {
                completedRequiredProblems++;
              }
            }
          }
          
          // Topic is explored if it has at least one completed problem
          const hasCompletedProblems = completedProblems > 0;
          if (hasCompletedProblems) {
            topicsExplored++;
            
            // Topic is completed only if all required problems are completed
            const isCompleted = requiredProblems > 0 && completedRequiredProblems >= requiredProblems;
            if (isCompleted) {
              topicsCompleted++;
            } else if (!nextTopicId) {
              // This is a started but incomplete topic - perfect for "continue learning"
              nextTopicId = topic.id;
              nextTopicSlug = topic.slug;
              foundIncomplete = true;
              break;
            }
          } else if (!nextTopicId) {
            // If no incomplete topic found yet, use the first untouched one
            nextTopicId = topic.id;
            nextTopicSlug = topic.slug;
          }
        }
      }
      
      return {
        topicsExplored,
        topicsCompleted,
        problemsSolved,
        practiceReviews: reviewStats.totalReviewed || 0,
        nextTopicId,
        nextTopicSlug
      };
    },
    enabled: !!levelsData && !!reviewStats,
  });
  
  // Combined loading state
  const statsLoading = levelsLoading || reviewStatsLoading || dashboardStats.isLoading || memoryStats.isLoading;
  
  // Navigation handlers
  const handleContinueLearning = () => {
    if (user && (user.role === 'ADMIN' || user.role === 'DEVELOPER')) {
      if (dashboardStats.data?.nextTopicSlug) {
        navigate(`/topic/${dashboardStats.data.nextTopicSlug}`);
      } else if (dashboardStats.data?.nextTopicId) {
        navigate(`/topics/${dashboardStats.data.nextTopicId}`);
      } else {
        navigate('/dashboard');
      }
    } else {
      toast({
        title: "Feature Access",
        description: "The full Learning Dashboard is currently available for admins and will be rolled out to all users soon!",
        variant: "default",
      });
    }
  };
  
  const handleSeeProblems = () => {
    navigate('/problems');
  };
  
  const handleStartReview = () => {
    if (user && (user.role === 'ADMIN' || user.role === 'DEVELOPER')) {
      navigate('/review');
    } else {
      toast({
        title: "Feature Access",
        description: "The Review Dashboard is currently available for admins and will be rolled out to all users soon!",
        variant: "default", 
      });
    }
  };

  const handleAvatarClick = () => {
    if (!isEditing) return;
    
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }

      setIsLoading(true);
      try {
        const formData = new FormData();
        formData.append('avatar', file);

        const response = await fetch('/api/profile/avatar', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) throw new Error('Failed to upload avatar');

        const data = await response.json();
        updateProfile({
          ...profile,
          avatarUrl: data.avatarUrl,
        });
      } catch (error) {
        console.error('Error uploading avatar:', error);
        alert('Failed to upload avatar');
      } finally {
        setIsLoading(false);
      }
    };
    input.click();
  };

  const handleSave = async () => {
    if (!token) return;
    
    setIsLoading(true);
    try {
      const updatedUser = await api.put('/profile/me', {
        name: newName,
      }, token);

      setUser(updatedUser);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setNewName(user?.name || '');
    setIsEditing(false);
  };

  return (
    <div className="h-full bg-background py-8">
      <div className="container max-w-4xl">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative group">
                <Avatar 
                  className={`h-20 w-20 transition-all duration-200 ${
                    isEditing ? 'cursor-pointer hover:opacity-75' : ''
                  }`}
                  onClick={handleAvatarClick}
                >
                  <AvatarImage src={profile?.avatarUrl} alt={user?.name || 'User'} />
                  <AvatarFallback>{user?.name?.[0] || user?.email?.[0]}</AvatarFallback>
                  {isEditing && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 rounded-full transition-opacity">
                      <Pencil className="w-6 h-6 text-white" />
                    </div>
                  )}
                </Avatar>
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <div>
                {isEditing ? (
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Enter your name"
                    className="text-lg font-semibold mb-1"
                  />
                ) : (
                  <h1 className="text-2xl font-bold">{user?.name || 'Profile Settings'}</h1>
                )}
                <p className="text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </div>
            
            <div>
              {isEditing ? (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCancel}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    onClick={handleSave}
                    disabled={isLoading}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profile
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-sm font-medium text-muted-foreground">Role</h2>
            <p className="capitalize">{user?.role.toLowerCase()}</p>
          </div>

          {/* Stats Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Your Learning Stats</h2>
            
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              {/* Topics Explored */}
              <div className="flex-1 border border-gray-200 dark:border-gray-800 rounded-lg bg-card shadow-sm relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>
                <div className="p-5 relative">
                  <div className="flex items-center gap-2">
                    <Book className="h-5 w-5 text-blue-500" />
                    <h3 className="text-lg font-medium">Topics Explored</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Your learning breadth</p>
                  <div className="mt-3">
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold">{statsLoading ? '-' : dashboardStats.data?.topicsExplored || 0}</span>
                      <span className="text-sm text-muted-foreground ml-2">topics</span>
                    </div>
                    <div className="mt-1 flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{statsLoading ? '-' : dashboardStats.data?.topicsCompleted || 0} completed</span>
                      <Button 
                        variant="ghost" 
                        className="p-0 h-auto text-blue-500 hover:text-blue-600 hover:bg-transparent"
                        onClick={handleContinueLearning}
                      >
                        <span className="mr-1">Continue Learning</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Problems Solved */}
              <div className="flex-1 border border-gray-200 dark:border-gray-800 rounded-lg bg-card shadow-sm relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
                <div className="p-5 relative">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-emerald-500" />
                    <h3 className="text-lg font-medium">Problems Solved</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Your coding progress</p>
                  <div className="mt-3">
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold">{statsLoading ? '-' : dashboardStats.data?.problemsSolved || 0}</span>
                      <span className="text-sm text-muted-foreground ml-2">problems</span>
                    </div>
                    <div className="mt-1 flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{statsLoading ? '-' : dashboardStats.data?.practiceReviews || 0} practice reviews</span>
                      <Button 
                        variant="ghost" 
                        className="p-0 h-auto text-emerald-500 hover:text-emerald-600 hover:bg-transparent"
                        onClick={handleSeeProblems}
                      >
                        <span className="mr-1">See Problems</span>
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Memory Strength */}
              <div className="flex-1 border border-gray-200 dark:border-gray-800 rounded-lg bg-card shadow-sm relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500"></div>
                <div className="p-5 relative">
                  <div className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-500" />
                    <h3 className="text-lg font-medium">Memory Strength</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Your knowledge retention</p>
                  <div className="mt-3">
                    <div className="flex items-baseline">
                      <span className="text-3xl font-bold">{statsLoading ? '0.0' : memoryStats.data?.averageLevel || 0}</span>
                      <span className="text-sm text-muted-foreground ml-2">average level</span>
                    </div>
                    <div className="mt-1 flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{statsLoading ? 0 : memoryStats.data?.dueNow || 0} reviews due today</span>
                      <Button 
                        variant="ghost" 
                        className="p-0 h-auto text-purple-500 hover:text-purple-600 hover:bg-transparent"
                        onClick={handleStartReview}
                      >
                        <span className="mr-1">Start Review</span>
                        <RepeatIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 