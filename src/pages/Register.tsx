import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { Fingerprint } from 'lucide-react';

export default function Register() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <Fingerprint className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#111827]">Create Account</h1>
          <p className="text-sm text-[#6B7280] mt-1">Register as a new student</p>
        </div>
        <div className="bg-white rounded-card shadow-card p-6">
          <RegisterForm />
        </div>
        <p className="text-center text-sm mt-5 text-[#6B7280]">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary hover:text-primary-600">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
