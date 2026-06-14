import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Home } from 'lucide-react';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="text-center max-w-sm animate-fade-in-up">
        <div className="w-20 h-20 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl font-bold text-primary">404</span>
        </div>
        <h1 className="text-xl font-bold text-[#111827] mb-2">Page Not Found</h1>
        <p className="text-sm text-[#6B7280] mb-6">The page you're looking for doesn't exist or has been moved.</p>
        <Button onClick={() => navigate('/dashboard')}>
          <Home className="w-4 h-4" /> Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
