import React from 'react';
import {
  LayoutDashboard,
  Wrench,
  Package,
  Ship,
  Building2,
  Users,
  Settings,
  History,
  FileText,
  Boxes,
  Fuel
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

interface NavItem {
  id: string;
  labelKey: string;
  icon: React.ElementType;
  roles: string[];
}

const navItems: NavItem[] = [
  { id: 'dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, roles: ['master_admin', 'customer_admin', 'standard_user'] },
  { id: 'customers', labelKey: 'nav.customers', icon: Building2, roles: ['master_admin'] },
  { id: 'users', labelKey: 'nav.users', icon: Users, roles: ['master_admin'] },
  { id: 'maintenance', labelKey: 'nav.maintenance', icon: Wrench, roles: ['customer_admin', 'standard_user'] },
  { id: 'inventory', labelKey: 'nav.inventory', icon: Package, roles: ['customer_admin', 'standard_user'] },
  { id: 'history', labelKey: 'nav.history', icon: History, roles: ['customer_admin', 'standard_user'] },
  { id: 'fuel', labelKey: 'nav.fuel', icon: Fuel, roles: ['customer_admin', 'standard_user'] },
  { id: 'equipment', labelKey: 'nav.equipment', icon: Boxes, roles: ['customer_admin', 'standard_user'] },
  { id: 'manuals', labelKey: 'nav.manuals', icon: FileText, roles: ['customer_admin', 'standard_user'] },
  { id: 'vessels', labelKey: 'nav.vessels', icon: Ship, roles: ['customer_admin'] },
  { id: 'users-customer', labelKey: 'nav.users', icon: Users, roles: ['customer_admin'] },
  { id: 'settings', labelKey: 'nav.settings', icon: Settings, roles: ['master_admin', 'customer_admin', 'standard_user'] }
];

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const { currentUser } = useAuth();
  const { t } = useLanguage();

  const filteredNavItems = navItems
    .filter(item => currentUser && item.roles.includes(currentUser.role))
    .reduce((acc, item) => {
      const existingItem = acc.find(i => i.labelKey === item.labelKey && i.id !== item.id);
      if (!existingItem) {
        acc.push(item);
      }
      return acc;
    }, [] as NavItem[]);

  const handleNavClick = (itemId: string) => {
    if (itemId === 'users-customer') {
      onNavigate('users');
    } else {
      onNavigate(itemId);
    }
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-sm">
            <Ship className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">YachtOps</h1>
            <p className="text-xs text-gray-500">Engineering Suite</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {filteredNavItems.map(item => {
            const Icon = item.icon;
            const pageToCheck = item.id === 'users-customer' ? 'users' : item.id;
            const isActive = currentPage === pageToCheck;
            const isMasterAdminOnly = item.id === 'customers' || item.id === 'users';
            const isMasterAdmin = currentUser?.role === 'master_admin';

            return (
              <li key={item.id}>
                <button
                  onClick={() => handleNavClick(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl
                    transition-all duration-200 text-left group
                    ${isActive
                      ? 'bg-blue-50 text-blue-700 font-medium shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'
                  }`} />
                  <span>{t(item.labelKey)}</span>
                  {isMasterAdminOnly && isMasterAdmin && (
                    <span className="ml-auto px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                      Admin
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4 border border-blue-200">
          <p className="text-sm font-medium text-blue-900">Need Help?</p>
          <p className="text-xs text-blue-700 mt-1">Contact support for assistance</p>
        </div>
      </div>
    </aside>
  );
};
