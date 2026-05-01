import React, { useState, useEffect } from 'react';
import { Users as UsersIcon, Search, Plus, Building2, Mail, AlertCircle, Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { AddUserModal } from '../components/Users/AddUserModal';
import { EditUserModal } from '../components/Users/EditUserModal';

interface UsersProps {
  onNavigate: (page: string, params?: any) => void;
  companyId?: string;
  openAddUser?: boolean;
}

interface AuthUser {
  id: string;
  email: string;
  user_metadata: {
    role?: string;
    company_id?: string;
    company_name?: string;
    full_name?: string;
  };
  created_at: string;
}

export const Users: React.FC<UsersProps> = ({ onNavigate, companyId, openAddUser }) => {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<AuthUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);

  const canManageUsers = currentUser?.role === 'master_admin' || currentUser?.role === 'customer_admin';
  const isMasterAdmin = currentUser?.role === 'master_admin';
  const isFilteredByCompany = !!companyId && isMasterAdmin;

  useEffect(() => {
    if (canManageUsers) {
      fetchUsers();
    }
  }, [canManageUsers, companyId]);

  useEffect(() => {
    if (openAddUser && canManageUsers) {
      setIsAddUserModalOpen(true);
    }
  }, [openAddUser, canManageUsers]);

  useEffect(() => {
    if (isFilteredByCompany) {
      fetchCompanyName();
    } else {
      setCompanyName(null);
    }
  }, [companyId, isFilteredByCompany]);

  const fetchCompanyName = async () => {
    const { data } = await supabase
      .from('companies')
      .select('name, yacht_name, customer_type')
      .eq('id', companyId!)
      .maybeSingle();
    if (data) {
      setCompanyName(data.customer_type === 'yacht_owner' ? data.yacht_name : data.name);
    }
  };

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-users`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ company_id: companyId || null }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to fetch users');
      setUsers(result.users || []);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/manage-user`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ action: 'delete', user_id: deletingUser.id }),
      });

      const result = await response.json();
      console.error('Delete response:', response.status, JSON.stringify(result));
      if (!response.ok) throw new Error(result.error || `Server error ${response.status}: ${JSON.stringify(result)}`);

      setDeletingUser(null);
      fetchUsers();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete user');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!canManageUsers) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <UsersIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">Access Denied</p>
          <p className="text-gray-600">This page is only accessible to Administrators</p>
        </div>
      </div>
    );
  }

  const getFilteredUsers = () => {
    let filtered = users;
    if (searchTerm) {
      filtered = filtered.filter(u =>
        u.user_metadata.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterRole !== 'all') {
      filtered = filtered.filter(u => u.user_metadata.role === filterRole);
    }
    return filtered;
  };

  const filteredUsers = getFilteredUsers();

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'master_admin': return 'Master Admin';
      case 'customer_admin': return 'Admin';
      case 'standard_user': return 'User';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'master_admin': return 'bg-blue-100 text-blue-700';
      case 'customer_admin': return 'bg-blue-100 text-blue-700';
      case 'standard_user': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      {isFilteredByCompany && (
        <button
          onClick={() => onNavigate('customers')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Customers
        </button>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {isFilteredByCompany ? (
            <>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-sm font-medium text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                  {companyName || 'Loading...'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Manage Users</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">Users belonging to this customer account</p>
            </>
          ) : (
            <>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">User Management</h1>
              <p className="text-gray-600 mt-1">Manage users and access permissions</p>
              {isMasterAdmin && (
                <div className="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium inline-block">
                  Master Admin Access
                </div>
              )}
            </>
          )}
        </div>
        <button
          onClick={() => setIsAddUserModalOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium transition-all shadow-lg shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          Add User
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Roles</option>
            <option value="customer_admin">Admin</option>
            <option value="standard_user">User</option>
          </select>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-600">Loading users...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
              <p className="text-red-600 font-medium mb-2">Error Loading Users</p>
              <p className="text-gray-600">{error}</p>
              <button onClick={fetchUsers} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Try Again
              </button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <UsersIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No users found</p>
            </div>
          ) : (
            filteredUsers.map(user => {
              const userName = user.user_metadata.full_name || user.email;
              const userRole = user.user_metadata.role || 'standard_user';
              const companyName = user.user_metadata.company_name;
              const initials = userName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
              const isCurrentUser = user.id === currentUser?.id;

              return (
                <div
                  key={user.id}
                  className="p-5 border border-gray-200 rounded-2xl hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-semibold text-lg">{initials}</span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-gray-900">{userName}</h3>
                          <span className={`px-3 py-1 rounded-lg text-xs font-medium ${getRoleColor(userRole)}`}>
                            {getRoleLabel(userRole)}
                          </span>
                          <span className="px-3 py-1 rounded-lg text-xs font-medium bg-green-100 text-green-700">
                            Active
                          </span>
                          {isCurrentUser && (
                            <span className="px-3 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600">
                              You
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-2">
                          <div className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            <span>{user.email}</span>
                          </div>
                        </div>

                        {companyName && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Building2 className="w-4 h-4" />
                            <span>{companyName}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit user"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {!isCurrentUser && (
                        <button
                          onClick={() => { setDeletingUser(user); setDeleteError(null); }}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <AddUserModal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        onSuccess={() => { fetchUsers(); setIsAddUserModalOpen(false); }}
        companyId={companyId}
      />

      <EditUserModal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        onSuccess={() => { fetchUsers(); setEditingUser(null); }}
        user={editingUser}
        isMasterAdmin={isMasterAdmin}
      />

      {deletingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-7 h-7 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Delete User</h3>
              <p className="text-gray-600">
                Are you sure you want to delete{' '}
                <span className="font-semibold text-gray-900">
                  {deletingUser.user_metadata.full_name || deletingUser.email}
                </span>
                ? This action cannot be undone.
              </p>
            </div>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-700">{deleteError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setDeletingUser(null); setDeleteError(null); }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
