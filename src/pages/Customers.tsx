import React, { useState, useEffect } from 'react';
import { Building2, Search, Plus, AlertCircle, Mail, Phone, Pencil, Trash2, Ruler, Weight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatDate } from '../utils/helpers';
import { AddCustomerModal } from '../components/Customers/AddCustomerModal';
import { EditCustomerModal } from '../components/Customers/EditCustomerModal';

interface Company {
  id: string;
  name: string;
  customer_type: 'yacht_owner' | 'agency';
  yacht_name: string;
  vessel_limit: number;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  subscription_status: 'active' | 'trial' | 'inactive';
  subscription_renewal_date: string;
  notes: string;
  created_at: string;
  vessels?: { gross_tonnage: number | null; length_overall: number | null; photo_url: string | null }[];
}

interface CustomersProps {
  onNavigate: (page: string, params?: any) => void;
}

export const Customers: React.FC<CustomersProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Company | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser?.role === 'master_admin') {
      fetchCompanies();
    }
  }, [currentUser]);

  const fetchCompanies = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('companies')
        .select('*, vessels(gross_tonnage, length_overall, photo_url)')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setCompanies(data || []);
    } catch (err: any) {
      console.error('Error fetching companies:', err);
      setError(err.message || 'Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer? This action cannot be undone.')) return;

    setDeletingId(id);
    try {
      const { error: deleteError } = await supabase
        .from('companies')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      setCompanies(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      console.error('Error deleting customer:', err);
      alert('Failed to delete customer: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditCustomer = (customer: Company) => {
    setEditingCustomer(customer);
    setIsEditModalOpen(true);
  };

  if (currentUser?.role !== 'master_admin') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">Access Denied</p>
          <p className="text-gray-600">This page is only accessible to Master Administrators</p>
        </div>
      </div>
    );
  }

  const getFilteredCustomers = () => {
    let filtered = companies;

    if (filterStatus !== 'all') {
      filtered = filtered.filter(c => c.subscription_status === filterStatus);
    }

    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.contact_email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  };

  const customers = getFilteredCustomers();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Customer Management</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage customer accounts and subscriptions</p>
          <div className="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium inline-block">
            Master Admin Only
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          Add Customer
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <p className="text-sm font-medium text-gray-600">Total Customers</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{companies.length}</p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <p className="text-sm font-medium text-gray-600">Active Subscriptions</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {companies.filter(c => c.subscription_status === 'active').length}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <p className="text-sm font-medium text-gray-600">Trial Accounts</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">
            {companies.filter(c => c.subscription_status === 'trial').length}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <p className="text-sm font-medium text-gray-600">Inactive Accounts</p>
          <p className="text-3xl font-bold text-red-600 mt-2">
            {companies.filter(c => c.subscription_status === 'inactive').length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search customers..."
              className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading customers...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
              <p className="text-red-600 font-medium mb-2">Error Loading Customers</p>
              <p className="text-gray-600">{error}</p>
              <button
                onClick={fetchCompanies}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          ) : customers.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No customers found</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Your First Customer
              </button>
            </div>
          ) : (
            customers.map(customer => {
              const displayName = customer.customer_type === 'yacht_owner'
                ? customer.yacht_name
                : customer.name;

              const vessel = customer.vessels?.[0];

              return (
                <div
                  key={customer.id}
                  className="border border-gray-200 rounded-2xl hover:border-blue-300 hover:shadow-lg transition-all overflow-hidden flex"
                >
                  {vessel?.photo_url ? (
                    <div className="w-48 flex-shrink-0 relative">
                      <img
                        src={vessel.photo_url}
                        alt={displayName}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/10" />
                    </div>
                  ) : (
                    <div className="w-48 flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                      <Building2 className="w-12 h-12 text-white/60" />
                    </div>
                  )}

                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{displayName}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {customer.contact_email}
                          </div>
                          {customer.contact_phone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-4 h-4" />
                              {customer.contact_phone}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-lg text-sm font-medium ${
                            customer.subscription_status === 'active'
                              ? 'bg-green-100 text-green-700'
                              : customer.subscription_status === 'trial'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {customer.subscription_status.charAt(0).toUpperCase() + customer.subscription_status.slice(1)}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditCustomer(customer); }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit customer"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteCustomer(customer.id); }}
                          disabled={deletingId === customer.id}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Delete customer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Contact Person</p>
                        <p className="font-semibold text-gray-900">{customer.contact_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Renewal Date</p>
                        <p className="font-semibold text-gray-900">{formatDate(customer.subscription_renewal_date)}</p>
                      </div>
                      {customer.customer_type === 'yacht_owner' ? (
                        <>
                          <div>
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <Ruler className="w-3.5 h-3.5" />
                              LOA
                            </p>
                            <p className="font-semibold text-gray-900">
                              {vessel?.length_overall != null ? `${vessel.length_overall} m` : '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <Weight className="w-3.5 h-3.5" />
                              Gross Tonnage
                            </p>
                            <p className="font-semibold text-gray-900">
                              {vessel?.gross_tonnage != null ? `${vessel.gross_tonnage} GT` : '—'}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <p className="text-sm text-gray-600">Vessels</p>
                            <p className="font-semibold text-blue-700">{customer.vessel_limit}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Users</p>
                            <p className="font-semibold text-blue-700">0</p>
                          </div>
                        </>
                      )}
                    </div>

                    {customer.notes && (
                      <div className="bg-gray-50 rounded-xl p-3 mb-4">
                        <p className="text-sm text-gray-700">{customer.notes}</p>
                      </div>
                    )}

                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('vessels', { companyId: customer.id });
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        View Vessels
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('users', { companyId: customer.id });
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors"
                      >
                        Manage Users
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('users', { companyId: customer.id, openAddUser: true });
                        }}
                        className="px-4 py-2 bg-green-50 text-green-700 rounded-xl text-sm font-medium hover:bg-green-100 transition-colors"
                      >
                        Setup Service
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <AddCustomerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          fetchCompanies();
          setIsModalOpen(false);
        }}
      />

      <EditCustomerModal
        isOpen={isEditModalOpen}
        onClose={() => { setIsEditModalOpen(false); setEditingCustomer(null); }}
        onSuccess={() => {
          fetchCompanies();
          setIsEditModalOpen(false);
          setEditingCustomer(null);
        }}
        customer={editingCustomer}
      />
    </div>
  );
};
