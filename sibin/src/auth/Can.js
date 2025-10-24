
import { useAuth } from './AuthProvider';

const Can = ({ permission, children }) => {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) {
    return null;
  }
  return <>{children}</>;
};

export default Can;
    