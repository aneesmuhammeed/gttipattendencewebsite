import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { SearchInput } from '@/components/ui/Input';
import { CheckCircle, UserCheck, Users as UsersIcon, Search, Shield } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import type { Profile } from '@/types';

function useAllUsers() {
  return useQuery({
    queryKey: ['all-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('role', { ascending: true })
        .order('full_name', { ascending: true });
      if (error) throw error;
      return data as Profile[];
    },
  });
}

export default function Users() {
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useAllUsers();
  const [search, setSearch] = useState('');

  const promoteToProfessor = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'professor' })
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('User promoted to Professor');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) return <PageSpinner />;

  const filtered = (users || []).filter(
    (u) =>
      !search ||
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Manage all system users and roles</p>
        </div>
        <SearchInput
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-60"
        />
      </div>

      <Card hover={false}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-primary" />
            All Users
            {users && <span className="text-sm font-normal text-[#6B7280]">({filtered.length} users)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!filtered.length ? (
            <div className="text-center py-12 text-sm text-[#9CA3AF]">No users found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Name</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Email</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Role</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-btn bg-primary-50 flex items-center justify-center text-primary font-semibold text-sm">
                            {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="font-medium text-[#111827]">{user.full_name}</p>
                            {user.roll_number && (
                              <p className="text-xs text-[#9CA3AF]">{user.roll_number}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#6B7280]">{user.email}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={user.role === 'admin' ? 'info' : user.role === 'professor' ? 'info' : 'default'}
                        >
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {user.role === 'student' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => promoteToProfessor.mutate(user.id)}
                            isLoading={promoteToProfessor.isPending}
                          >
                            <UserCheck className="w-4 h-4" /> Promote
                          </Button>
                        )}
                        {user.role === 'admin' && (
                          <span className="inline-flex items-center gap-1 text-xs text-[#9CA3AF]">
                            <Shield className="w-3 h-3 text-primary" /> System Admin
                          </span>
                        )}
                        {user.role === 'professor' && (
                          <span className="text-xs text-[#9CA3AF]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
