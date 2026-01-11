// components/RoleGuard.tsx

import { useAuth } from '@/hooks/useAuth';
import React from 'react';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: ('guest' | 'host')[];
  fallback?: React.ReactNode;
}

export function RoleGuard({ children, allowedRoles, fallback = null }: RoleGuardProps) {
  const { profile, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!profile) {
    return <>{fallback}</>;
  }

  if (!allowedRoles.includes(profile.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
