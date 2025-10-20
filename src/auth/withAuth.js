import { useRouter } from 'next/router';
import { useAuth } from './useAuth';

const withAuth = (WrappedComponent) => {
  const Wrapper = (props) => {
    const { isAuthenticated, loading } = useAuth();
    const router = useRouter();

    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <p>Loading session...</p>
        </div>
      );
    }

    if (!isAuthenticated) {
      // In a real app, you might redirect to a login page.
      // For this demo, we'll show an access denied message.
      // The QR code flow is the "login page" in this architecture.
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
          <div className="max-w-md w-full bg-white shadow-md rounded-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
            <p className="text-gray-800">
              You must be authenticated to view this page.
            </p>
          </div>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
  return Wrapper;
};

export default withAuth;