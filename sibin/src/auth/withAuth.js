
import { useRouter } from 'next/router';
import { useAuth } from './AuthProvider';
import { useEffect } from 'react';

const withAuth = (WrappedComponent) => {
  const Wrapper = (props) => {
    const { isAuthenticated, loading, user } = useAuth();
    const router = useRouter();
    const onboardingEnabled = true;

    useEffect(() => {
      if (loading) return;

      if (!isAuthenticated) {
        router.push('/login');
        return;
      }
      
      if (onboardingEnabled && !user.onboardingCompletedAt && !router.pathname.startsWith('/onboarding')) {
        router.push('/onboarding/step-1');
      }

    }, [isAuthenticated, loading, user, router, onboardingEnabled]);

    if (loading || !isAuthenticated) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <p>Loading...</p>
        </div>
      );
    }

    if (onboardingEnabled && !user.onboardingCompletedAt && !router.pathname.startsWith('/onboarding')) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <p>Redirecting to onboarding...</p>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
  return Wrapper;
};

export default withAuth;
    