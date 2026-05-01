import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Bell, Lock, Globe } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { demoCompanies, demoVessels, demoUsers } from '../data/demoData';
import { supabase } from '../lib/supabase';
import { formatDate } from '../utils/helpers';

interface SettingsProps {
  onNavigate: (page: string, params?: any) => void;
}

interface CompanyInfo {
  id: string;
  name: string;
  subscription_status: string;
  subscription_renewal_date: string;
}

interface VesselInfo { id: string; name: string; type: string; }

const isDemoUser = (email: string) => demoUsers.some(u => u.email === email);

export const Settings: React.FC<SettingsProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [userVessels, setUserVessels] = useState<VesselInfo[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    setFullName(currentUser.full_name);
    setPhone(currentUser.phone || '');
    loadCompanyAndVessels();
  }, [currentUser]);

  const loadCompanyAndVessels = async () => {
    if (!currentUser) return;

    if (isDemoUser(currentUser.email)) {
      const demoCompany = demoCompanies.find(c => c.id === currentUser.company_id);
      if (demoCompany) {
        setCompany({
          id: demoCompany.id,
          name: demoCompany.name,
          subscription_status: demoCompany.subscription_status,
          subscription_renewal_date: demoCompany.subscription_renewal_date,
        });
      }
      const vessels = demoVessels.filter(v => currentUser.vessel_ids.includes(v.id));
      setUserVessels(vessels.map(v => ({ id: v.id, name: v.name, type: v.type })));
      return;
    }

    if (currentUser.company_id) {
      const { data } = await supabase
        .from('companies')
        .select('id, name, subscription_status, subscription_renewal_date')
        .eq('id', currentUser.company_id)
        .maybeSingle();
      if (data) setCompany(data);
    }

    if (currentUser.vessel_ids.length > 0) {
      const { data } = await supabase
        .from('vessels')
        .select('id, name, type')
        .in('id', currentUser.vessel_ids);
      if (data) setUserVessels(data);
    } else if (currentUser.company_id && currentUser.role === 'customer_admin') {
      const { data } = await supabase
        .from('vessels')
        .select('id, name, type')
        .eq('company_id', currentUser.company_id);
      if (data) setUserVessels(data);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (isDemoUser(currentUser.email)) {
      setSaveMsg('Profile saved (demo mode)');
      setTimeout(() => setSaveMsg(''), 3000);
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName, phone },
    });

    if (!error) {
      setSaveMsg('Profile updated successfully');
    } else {
      setSaveMsg('Error updating profile');
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    if (newPassword !== confirmPassword) {
      setPwMsg('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setPwMsg('Password must be at least 6 characters');
      return;
    }

    if (isDemoUser(currentUser.email)) {
      setPwMsg('Password change not available in demo mode');
      setTimeout(() => setPwMsg(''), 3000);
      return;
    }

    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (!error) {
      setPwMsg('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setPwMsg('Error updating password');
    }
    setChangingPassword(false);
    setTimeout(() => setPwMsg(''), 3000);
  };

  if (!currentUser) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('settings.title')}</h1>
        <p className="text-gray-600 mt-1">Manage your account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-xl">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">{t('settings.profile')}</h2>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                <input
                  type="email"
                  value={currentUser.email}
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-gray-50 text-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                <input
                  type="text"
                  value={currentUser.role === 'master_admin' ? 'Master Admin' : currentUser.role === 'customer_admin' ? 'Admin' : 'User'}
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl bg-gray-50 text-gray-600"
                />
              </div>

              {saveMsg && (
                <p className={`text-sm font-medium ${saveMsg.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                  {saveMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : t('settings.save')}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-xl">
                <Globe className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">{t('settings.language')}</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">{t('settings.selectLanguage')}</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setLanguage('en')}
                  className={`px-4 py-3 rounded-xl border-2 transition-all text-left ${language === 'en' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🇺🇸</div>
                    <div>
                      <p className={`font-medium ${language === 'en' ? 'text-blue-900' : 'text-gray-900'}`}>{t('settings.english')}</p>
                      <p className={`text-xs ${language === 'en' ? 'text-blue-600' : 'text-gray-500'}`}>English</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setLanguage('es')}
                  className={`px-4 py-3 rounded-xl border-2 transition-all text-left ${language === 'es' ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🇪🇸</div>
                    <div>
                      <p className={`font-medium ${language === 'es' ? 'text-blue-900' : 'text-gray-900'}`}>{t('settings.spanish')}</p>
                      <p className={`text-xs ${language === 'es' ? 'text-blue-600' : 'text-gray-500'}`}>Español</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-xl">
                <Lock className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">{t('settings.security')}</h2>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {pwMsg && (
                <p className={`text-sm font-medium ${pwMsg.includes('Error') || pwMsg.includes('not') || pwMsg.includes('least') ? 'text-red-600' : 'text-green-600'}`}>
                  {pwMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={changingPassword}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {changingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-xl">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">{t('settings.notifications')}</h2>
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                <span className="text-gray-900">Email notifications for overdue tasks</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                <span className="text-gray-900">Email notifications for low stock items</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                <span className="text-gray-900">Daily maintenance summary</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                <span className="text-gray-900">Weekly inventory report</span>
              </label>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {company && currentUser.role !== 'master_admin' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Details</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Company Name</p>
                  <p className="font-medium text-gray-900">{company.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Subscription Status</p>
                  <span className={`inline-block mt-1 px-3 py-1 rounded-xl text-sm font-medium ${
                    company.subscription_status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {company.subscription_status.charAt(0).toUpperCase() + company.subscription_status.slice(1)}
                  </span>
                </div>
                {company.subscription_renewal_date && (
                  <div>
                    <p className="text-sm text-gray-600">Renewal Date</p>
                    <p className="font-medium text-gray-900">{formatDate(company.subscription_renewal_date)}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {userVessels.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Assigned Vessels</h2>
              <div className="space-y-2">
                {userVessels.map(vessel => (
                  <div key={vessel.id} className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="font-medium text-blue-900">{vessel.name}</p>
                    <p className="text-sm text-blue-700">{vessel.type}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <h3 className="font-semibold text-blue-900 mb-2">Need Help?</h3>
            <p className="text-sm text-blue-800 mb-4">
              Contact our support team for assistance with your account or platform features.
            </p>
            <button className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors">
              Contact Support
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
