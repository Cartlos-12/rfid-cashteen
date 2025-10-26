'use client';

import { useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import ParentSidebarLayout from './components/ParentSidebarLayout';

type Student = {
  id: string | number;
  rfid: string;
  name: string;
  balance: number | string;
};

interface Props {
  children: ReactNode;
}

export default function ParentLayout({ children }: Props) {
  const [student, setStudent] = useState<Student | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Fetch auth and student info
  const fetchStudent = async () => {
    try {
      const res = await fetch('/parent/api/dashboard', { credentials: 'include' });
      if (!res.ok) {
        setIsAuthenticated(false);
        setStudent(null);
        return;
      }

      const data = await res.json();
      if (data.success && data.data?.student) {
        setStudent(data.data.student);
        setIsAuthenticated(true);
      } else {
        setStudent(null);
        setIsAuthenticated(false);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      setStudent(null);
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    // Skip auth check on login page
    if (!pathname.includes('/parent/login')) {
      fetchStudent();
    } else {
      setStudent(null);
      setIsAuthenticated(false);
    }
  }, [pathname]);

  // Show login page normally
  if (pathname.includes('/parent/login')) return <>{children}</>;

  // Render sidebar immediately, show loader in main content until authenticated
  return (
    <ParentSidebarLayout student={student}>
      {isAuthenticated === null ? (
        <div className="text-center py-5 text-muted">
          <div className="spinner-border text-primary me-2" role="status"></div>
          Loading student info...
        </div>
      ) : isAuthenticated ? (
        children
      ) : (
        <div className="text-center py-5 text-danger">
          Please <a href="/parent/login">login</a>.
        </div>
      )}
    </ParentSidebarLayout>
  );
}
