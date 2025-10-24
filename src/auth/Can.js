import { useAuth } from './ExternalAuthProvider';

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