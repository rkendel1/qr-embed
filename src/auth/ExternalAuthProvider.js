import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

// --- IMPORTANT ---
// In your external app, make sure this URL points to your QR-Embed instance.
// You should set this in your external app's .env file.
const API_HOST = process.env.NEXT_PUBLIC_QR_EMBED_URL || 'http://localhost:3000';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_HOST}/api/auth/me`, {
        // 'include' is crucial for sending the httpOnly auth cookie
        credentials: 'include',
      });
      
      if (res.ok) {
        const { user: userData, permissions: userPermissions } = await res.json();
        setUser(userData);
        setPermissions(userPermissions);
      } else {
        setUser(null);
        setPermissions([]);
      }
    } catch (error) {
      console.error("Failed to fetch user session:", error);
      setUser(null);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const logout = async () => {
    await fetch(`${API_HOST}/api/auth/logout`, { 
      method: 'POST', 
      credentials: 'include' 
    });
    setUser(null);
    setPermissions([]);
    // You might want to redirect the user to a login page here
    // window.location.href = '/login';
  };

  const hasPermission = (requiredPermission) => {
    return permissions.includes(requiredPermission);
  };

  const value = {
    user,
    permissions,
    isAuthenticated: !!user,
    loading,
    logout,
    hasPermission,
    fetchSession, // Expose refetch function
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};