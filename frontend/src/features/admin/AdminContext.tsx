import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

interface AdminContextType {
  isAdminView: boolean;
  setIsAdminView: (value: boolean) => void;
  canAccessAdmin: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const canAccessAdmin = user?.role === 'ADMIN' || user?.role === 'DEVELOPER';
  
  // Initialize state from localStorage if available, otherwise false
  const [isAdminView, setIsAdminView] = useState(() => {
    if (!canAccessAdmin) return false;
    const saved = localStorage.getItem('adminMode');
    return saved ? JSON.parse(saved) : false;
  });

  // Update localStorage when admin mode changes
  useEffect(() => {
    if (canAccessAdmin) {
      localStorage.setItem('adminMode', JSON.stringify(isAdminView));
    } else {
      localStorage.removeItem('adminMode');
      setIsAdminView(false);
    }
  }, [isAdminView, canAccessAdmin]);

  // Reset admin mode when user changes or logs out
  useEffect(() => {
    if (!canAccessAdmin) {
      setIsAdminView(false);
      localStorage.removeItem('adminMode');
    }
  }, [canAccessAdmin]);

  const toggleAdminView = () => {
    if (canAccessAdmin) {
      setIsAdminView((prev: boolean) => !prev);
    }
  };

  return (
    <AdminContext.Provider
      value={{
        isAdminView,
        setIsAdminView,
        canAccessAdmin,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
} 