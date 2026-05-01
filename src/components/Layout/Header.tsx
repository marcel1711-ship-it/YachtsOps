import React, { useState, useEffect } from 'react';
import { Bell, User, LogOut, ChevronDown, Ship, Settings, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { demoVessels, demoUsers } from '../../data/demoData';
import { supabase } from '../../lib/supabase';

interface HeaderProps {
  onNavigate?: (page: string) => void;
  onMenuToggle?: () => void;
}

interface VesselOption { id: string; name: string; type: string; }

const isDemoUser = (email: string) => demoUsers.some(u => u.email === email);

export const Header: React.FC<HeaderProps> = ({ onNavigate, onMenuToggle }) => {
  const { currentUser, logout, selectedVesselId, setSelectedVesselId } = useAuth();
  const { t } = useLanguage();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showVesselMenu, setShowVesselMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [userVessels, setUserVessels] = useState<VesselOption[]>([]);

  useEffect(() => {
    loadVessels();
  }, [currentUser]);

  const loadVessels = async () => {
    if (!currentUser) return;

    if (isDemoUser(currentUser.email)) {
      const vessels = currentUser.role === 'master_admin'
        ? demoVessels
        : demoVessels.filter(v => currentUser.vessel_ids.includes(v.id));
      setUserVessels(vessels.map(v => ({ id: v.id, name: v.name, type: v.type })));
      return;
    }

    if (currentUser.role === 'master_admin') {
      setUserVessels([]);
      return;
    }

    let query = supabase.from('vessels').select('id, name, type');
    if (currentUser.vessel_ids.length > 0) {
      query = query.in('id', currentUser.vessel_ids);
    } else if (currentUser.company_id) {
      query = query.eq('company_id', currentUser.company_id);
    } else {
      setUserVessels([]);
      return;
    }

    const { data } = await query;
    if (data) setUserVessels(data);
  };

  if (!currentUser) return null;

  const currentVessel = userVessels.find(v => v.id === selectedVesselId);
  const showVesselSwitcher = currentUser.role !== 'master_admin' && userVessels.length > 1;
  const showVesselBadge = currentUser.role !== 'master_admin' && !showVesselSwitcher && currentVessel;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'master_admin': return 'Master Admin';
      case 'customer_admin': return 'Admin';
      case 'standard_user': return 'User';
      default: return role;
    }
  };

  const notifications = [
    { id: 1, message: 'Engine maintenance due in 3 days', time: '2h ago', unread: true },
    { id: 2, message: 'Inventory item below minimum stock', time: '5h ago', unread: true },
    { id: 3, message: 'New manual uploaded', time: '1d ago', unread: false },
  ];
  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <header className="bg-white border-b border-gray-200 h-16 fixed top-0 left-0 lg:left-64 right-0 z-30 shadow-sm">
      <div className="h-full px-4 lg:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3 lg:gap-4">
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-600 lg:hidden"
            aria-label="Toggle menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          {showVesselSwitcher && currentVessel && (
            <div className="relative">
              <button
                onClick={() => setShowVesselMenu(!showVesselMenu)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all border border-gray-200 hover:border-gray-300"
              >
                <Ship className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-gray-900">{currentVessel.name}</span>
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </button>

              {showVesselMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowVesselMenu(false)} />
                  <div className="absolute top-full mt-2 left-0 w-64 bg-white rounded-2xl shadow-lg border border-gray-200 py-2 z-20">
                    <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Switch Vessel
                    </div>
                    {userVessels.map(vessel => (
                      <button
                        key={vessel.id}
                        onClick={() => {
                          setSelectedVesselId(vessel.id);
                          setShowVesselMenu(false);
                        }}
                        className={`w-full px-4 py-2.5 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 ${vessel.id === selectedVesselId ? 'bg-blue-50' : ''}`}
                      >
                        <Ship className={`w-4 h-4 ${vessel.id === selectedVesselId ? 'text-blue-600' : 'text-gray-400'}`} />
                        <div>
                          <div className={`font-medium ${vessel.id === selectedVesselId ? 'text-blue-700' : 'text-gray-700'}`}>
                            {vessel.name}
                          </div>
                          <div className="text-xs text-gray-500">{vessel.type}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {showVesselBadge && (
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-2xl border border-gray-200">
              <Ship className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-gray-900">{currentVessel!.name}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
              )}
            </button>

            {showNotifications && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)} />
                <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-lg border border-gray-200 z-20">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900">{t('header.notifications')}</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map(notification => (
                      <div
                        key={notification.id}
                        className={`px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0 ${notification.unread ? 'bg-blue-50/50' : ''}`}
                      >
                        <p className="text-sm text-gray-900">{notification.message}</p>
                        <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="w-px h-6 bg-gray-200"></div>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 px-3 py-2 hover:bg-gray-100 rounded-2xl transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="text-left hidden lg:block">
                <p className="text-sm font-medium text-gray-900">{currentUser.full_name}</p>
                <p className="text-xs text-gray-500">{getRoleBadge(currentUser.role)}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-500" />
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl shadow-lg border border-gray-200 py-2 z-20">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{currentUser.full_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{currentUser.email}</p>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                      {getRoleBadge(currentUser.role)}
                    </div>
                  </div>

                  <button
                    onClick={() => { onNavigate?.('settings'); setShowUserMenu(false); }}
                    className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-gray-50 text-gray-700 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span className="text-sm">{t('nav.settings')}</span>
                  </button>

                  <div className="my-1 h-px bg-gray-100"></div>

                  <button
                    onClick={() => { logout(); setShowUserMenu(false); }}
                    className="w-full px-4 py-2.5 text-left flex items-center gap-3 hover:bg-red-50 text-red-600 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">{t('nav.logout')}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
