import JSZip from 'jszip';

const getAuthProviderContent = (apiUrl) => `
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';

// This URL should point to your QR-Embed instance.
const API_HOST = process.env.NEXT_PUBLIC_QR_EMBED_URL || '${apiUrl}';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(\`\${API_HOST}/api/auth/me\`, {
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
    await fetch(\`\${API_HOST}/api/auth/logout\`, { 
      method: 'POST', 
      credentials: 'include' 
    });
    setUser(null);
    setPermissions([]);
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
    fetchSession,
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
`;

const getCanComponentContent = () => `
import { useAuth } from './AuthProvider'; // Assuming it's in the same directory

/**
 * A component that renders its children only if the current user
 * has the required permission.
 *
 * @param {{
 *   permission: string;
 *   children: React.ReactNode;
 * }} props
 */
const Can = ({ permission, children }) => {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    return null;
  }

  return <>{children}</>;
};

export default Can;
`;

const getReadmeContent = (apiUrl) => `
# QR-Embed Auth Kit

This kit provides everything you need to integrate the role-based access control (RBAC) from your QR-Embed instance into any React application.

## 1. Setup

1.  **Place Files:** Unzip this kit and place the \`auth\` folder inside your application's \`src\` directory. Your structure should look like:
    \`\`\`
    src/
    └── auth/
        ├── AuthProvider.js
        └── Can.js
    \`\`\`

2.  **Set Environment Variable:** In your application's \`.env.local\` file, add the following line. This tells the AuthProvider where to find your QR-Embed API.

    \`\`\`
    NEXT_PUBLIC_QR_EMBED_URL=${apiUrl}
    \`\`\`

## 2. Wrap Your Application

In your app's main entry point (e.g., \`pages/_app.js\` for Next.js, or \`main.jsx\` for Vite), import and wrap your entire application with the \`AuthProvider\`.

**Example for Next.js (\`pages/_app.js\`):**
\`\`\`jsx
import { AuthProvider } from '@/auth/AuthProvider'; // Adjust path if needed
import '@/styles/globals.css'; // Your global styles

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}

export default MyApp;
\`\`\`

## 3. Usage

You can now use the \`useAuth\` hook and the \`<Can>\` component anywhere in your application.

### Checking Authentication

\`\`\`jsx
import { useAuth } from '@/auth/AuthProvider';

function UserProfile() {
  const { isAuthenticated, user, loading, logout } = useAuth();

  if (loading) {
    return <div>Loading session...</div>;
  }

  if (!isAuthenticated) {
    return <div>Please log in.</div>;
  }

  return (
    <div>
      <p>Welcome, {user.email}!</p>
      <button onClick={logout}>Log Out</button>
    </div>
  );
}
\`\`\`

### Protecting UI Elements with Permissions

Use the \`<Can>\` component to conditionally render parts of your UI based on the permissions configured in your QR-Embed dashboard.

\`\`\`jsx
import Can from '@/auth/Can';

function AdminDashboard() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      
      {/* This button is only visible to users with the 'user:manage' permission */}
      <Can permission="user:manage">
        <button>Manage Users</button>
      </Can>

      {/* This link is only visible to users with the 'project:create' permission */}
      <Can permission="project:create">
        <a href="/projects/new">Create New Project</a>
      </Can>
    </div>
  );
}
\`\`\`
`;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).end();
  }

  try {
    const origin = process.env.NEXT_PUBLIC_APP_URL || `http://${req.headers.host}`;
    const zip = new JSZip();
    const authFolder = zip.folder('auth');

    authFolder.file('AuthProvider.js', getAuthProviderContent(origin));
    authFolder.file('Can.js', getCanComponentContent());
    zip.file('README.md', getReadmeContent(origin));

    const content = await zip.generateAsync({ type: 'nodebuffer' });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename=qr-embed-auth-kit.zip');
    res.send(content);

  } catch (error) {
    console.error('Failed to generate developer kit:', error);
    res.status(500).json({ error: 'Could not generate the developer kit.' });
  }
}