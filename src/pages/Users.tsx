import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageSpinner } from '@/components/ui/Spinner';
import { CheckCircle, UserCheck } from 'lucide-react';
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-primary-600" />
            Manage Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!users?.length ? (
            <p className="text-gray-500 text-center py-4">No users found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.full_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{user.email}</td>
                      <td className="px-4 py-3">
                        <Badge variant={user.role === 'admin' ? 'info' : user.role === 'professor' ? 'warning' : 'default'}>
                          {user.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {user.role === 'student' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => promoteToProfessor.mutate(user.id)}
                            isLoading={promoteToProfessor.isPending}
                          >
                            <UserCheck className="w-4 h-4 mr-1" /> Promote to Professor
                          </Button>
                        )}
                        {user.role === 'admin' && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> System Admin
                          </span>
                        )}
                        {user.role === 'professor' && (
                          <span className="text-xs text-gray-400">Already Professor</span>
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
