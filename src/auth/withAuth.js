import { useRouter } from 'next/router';
import { useAuth } from './useAuth';
import { useEffect } from 'react';

const withAuth = (WrappedComponent) => {
  const Wrapper = (props) => {
    const { isAuthenticated, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading && !isAuthenticated) {
        // Using window.location.href to ensure a full page reload 
        // which can help in clearing any inconsistent state.
        window.location.href = '/';
      }
    }, [loading, isAuthenticated]);

    if (loading || !isAuthenticated) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <p>Loading session...</p>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
  return Wrapper;
};

export default withAuth;