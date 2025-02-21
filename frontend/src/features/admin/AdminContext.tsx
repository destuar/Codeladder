import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';

interface AdminContextType {
  isAdminView: boolean;
  setIsAdminView: (value: boolean) => void;
  canAccessAdmin: boolean;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  // Move the useAuth hook inside a useEffect
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);
  const [isAdminView, setIsAdminView] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const hasAdminAccess = user?.role === 'ADMIN' || user?.role === 'DEVELOPER';
    setCanAccessAdmin(hasAdminAccess);
    
    // Reset admin view if user loses admin access
    if (!hasAdminAccess) {
      setIsAdminView(false);
      localStorage.removeItem('adminMode');
    }
  }, [user]);

  // Initialize admin view from localStorage if user has access
  useEffect(() => {
    if (canAccessAdmin) {
      const saved = localStorage.getItem('adminMode');
      if (saved) {
        setIsAdminView(JSON.parse(saved));
      }
    }
  }, [canAccessAdmin]);

  // Update localStorage when admin mode changes
  useEffect(() => {
    if (canAccessAdmin) {
      localStorage.setItem('adminMode', JSON.stringify(isAdminView));
    }
  }, [isAdminView, canAccessAdmin]);

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
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
} 