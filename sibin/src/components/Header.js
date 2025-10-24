
import Link from 'next/link';
import { useAuth } from '@/auth/AuthProvider';
import Can from '@/auth/Can';

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const logoUrl = "";
  const appName = "unhappyapp";

  return (
    <header className="bg-white shadow-sm">
      <nav className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="w-full py-4 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2 text-xl font-bold text-gray-900">
              {logoUrl && <img src={logoUrl} alt={`${appName} logo`} className="h-8 w-auto" />}
              <span>{appName}</span>
            </Link>
            <div className="space-x-4">
              <Link href="/pricing" className="text-sm font-medium text-gray-700 hover:text-indigo-600">Pricing</Link>
              <Link href="/solutions" className="text-sm font-medium text-gray-700 hover:text-indigo-600">Solutions</Link>
            </div>
          </div>
          <div className="space-x-4 flex items-center">
            {isAuthenticated ? (
              <>
                <span className="text-sm text-gray-600 hidden sm:inline">Welcome, {user.name || user.email}</span>
                <Link href="/dashboard" className="text-sm font-medium text-gray-700 hover:text-indigo-600">Dashboard</Link>
                
                <Can permission="admin:dashboard:view">
                  <Link href="/admin" className="text-sm font-medium text-gray-700 hover:text-indigo-600">Admin</Link>
                </Can>
                
                <button onClick={logout} className="text-sm font-medium text-gray-700 hover:text-indigo-600">Logout</button>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-indigo-600">Login</Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
    