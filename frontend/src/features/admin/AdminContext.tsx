import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';

interface AdminContextType {
  isAdminView: boolean;
  toggleAdminView: () => void;
  canAccessAdmin: boolean;
}

const AdminContext = createContext<AdminContextType | null>(null);

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

interface AdminProviderProps {
  children: ReactNode;
}

export const AdminProvider = ({ children }: AdminProviderProps) => {
  const { user } = useAuth();
  const [isAdminView, setIsAdminView] = useState(false);
  
  // Check if user has admin access
  const canAccessAdmin = user?.role === 'ADMIN' || user?.role === 'DEVELOPER';

  const toggleAdminView = () => {
    if (canAccessAdmin) {
      setIsAdminView(prev => !prev);
    }
  };

  return (
    <AdminContext.Provider
      value={{
        isAdminView,
        toggleAdminView,
        canAccessAdmin,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}; 