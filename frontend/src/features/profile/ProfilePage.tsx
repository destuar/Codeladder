import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useProfile } from './ProfileContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Pencil, X, Check } from 'lucide-react';
import { api } from '@/lib/api';

export default function ProfilePage() {
  const { user, setUser, token } = useAuth();
  const { profile, updateProfile } = useProfile();
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [isLoading, setIsLoading] = useState(false);

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
    <div className="h-[calc(100vh-4rem)] bg-background py-8">
      <div className="container max-w-2xl">
        <div className="space-y-6">
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
        </div>
      </div>
    </div>
  );
} 