import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

interface Profile {
  avatarUrl: string;
  // Add other profile fields as needed
}

interface ProfileContextType {
  profile: Profile | null;
  updateProfile: (profile: Profile) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    // Load profile data when user changes
    if (user) {
      // For now, we'll just set a default avatar
      setProfile({
        avatarUrl: `/avatars/${user.id}.png`,
      });
    } else {
      setProfile(null);
    }
  }, [user]);

  const updateProfile = (newProfile: Profile) => {
    setProfile(newProfile);
  };

  return (
    <ProfileContext.Provider value={{ profile, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
} 