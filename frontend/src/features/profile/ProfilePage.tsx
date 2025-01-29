import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '../../components/ui/avatar';
import React from 'react';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  avatar: z.string().url('Must be a valid URL').optional(),
}).partial();

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user, token, setUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [previewAvatar, setPreviewAvatar] = useState(user?.avatar || '');

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      avatar: user?.avatar || '',
    },
  });

  // Watch for avatar changes
  const avatarUrl = watch('avatar');
  
  // Update preview when avatar URL changes
  React.useEffect(() => {
    setPreviewAvatar(avatarUrl || '');
  }, [avatarUrl]);

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);

      // Convert empty strings to null for all fields
      const cleanData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [
          key,
          value === '' ? null : value
        ])
      );

      console.log('Updating profile with:', cleanData);
      const response = await api.put('/profile/me', cleanData, token);
      console.log('Profile update response:', response);
      
      // Update the user state with the response data
      setUser(response);
      setSuccessMessage('Profile updated successfully');
    } catch (err: any) {
      console.error('Profile update error:', err);
      
      if (err?.message === 'Unauthorized') {
        setError('Your session has expired. Please log in again.');
        return;
      }
      
      if (err?.errors) {
        setError(err.errors.map((e: any) => e.message).join(', '));
      } else if (err?.error) {
        setError(Array.isArray(err.error) ? err.error.join(', ') : err.error);
      } else if (typeof err === 'string') {
        setError(err);
      } else {
        setError('Failed to update profile. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container max-w-2xl">
        <div className="space-y-6">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={previewAvatar} alt={user?.name || 'User'} />
              <AvatarFallback>{user?.name ? getInitials(user.name) : 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold">{user?.name || 'Profile Settings'}</h1>
              <p className="text-muted-foreground">
                Update your personal information and profile settings
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Name
                </label>
                <Input id="name" {...register('name')} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <label htmlFor="avatar" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Avatar URL
                </label>
                <Input id="avatar" type="url" {...register('avatar')} />
                {errors.avatar && <p className="text-sm text-destructive">{errors.avatar.message}</p>}
              </div>
            </div>

            {error && <div className="text-sm text-destructive text-center">{error}</div>}
            {successMessage && <div className="text-sm text-green-600 text-center">{successMessage}</div>}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
} 