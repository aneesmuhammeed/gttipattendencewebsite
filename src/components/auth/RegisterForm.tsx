import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Min 6 characters'),
  fullName: z.string().min(2, 'Name required'),
  rollNumber: z.string().min(1, 'Roll number required'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const { signUp } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const capitalizeName = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    target.value = target.value.toUpperCase();
  };

  const onSubmit = async (data: RegisterFormData) => {
    setError(null);
    const result = await signUp(data.email, data.password, data.fullName, data.rollNumber);
    if (result.error) setError(result.error);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-btn bg-red-50 text-sm text-danger">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      <Input id="fullName" label="Full Name" placeholder="John Doe" error={errors.fullName?.message} {...register('fullName', { onChange: capitalizeName })} />
      <Input id="email" label="Email" type="email" placeholder="you@college.edu" error={errors.email?.message} {...register('email')} />
      <div className="relative">
        <Input id="password" label="Password" type={showPassword ? 'text' : 'password'} placeholder="Create password" error={errors.password?.message} {...register('password')} />
        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-[34px] text-[#9CA3AF] hover:text-[#111827] transition-colors">
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      <Input id="rollNumber" label="Roll Number" placeholder="e.g., CS001" error={errors.rollNumber?.message} {...register('rollNumber')} />
      <Button type="submit" isLoading={isSubmitting} className="w-full">Create Account</Button>
      <p className="text-xs text-center text-[#9CA3AF]">Accounts are registered as Student. Professors are created by Admin.</p>
    </form>
  );
}
