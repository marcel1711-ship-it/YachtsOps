import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

type Language = 'en' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: string) => string;
}

const translations = {
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.vessels': 'Vessels',
    'nav.equipment': 'Equipment',
    'nav.maintenance': 'Maintenance',
    'nav.inventory': 'Inventory',
    'nav.manuals': 'Manuals',
    'nav.history': 'History',
    'nav.customers': 'Customers',
    'nav.users': 'Users',
    'nav.fuel': 'Fuel & Consumables',
    'nav.settings': 'Settings',
    'nav.logout': 'Logout',

    // Header
    'header.notifications': 'Notifications',
    'header.profile': 'Profile',
    'header.welcome': 'Welcome',

    // Dashboard
    'dashboard.title': 'Dashboard',
    'dashboard.overview': 'Fleet Overview',
    'dashboard.totalVessels': 'Total Vessels',
    'dashboard.activeVessels': 'Active Vessels',
    'dashboard.underMaintenance': 'Under Maintenance',
    'dashboard.docked': 'Docked',
    'dashboard.recentActivity': 'Recent Activity',
    'dashboard.upcomingMaintenance': 'Upcoming Maintenance',
    'dashboard.viewAll': 'View All',
    'dashboard.dueDate': 'Due Date',
    'dashboard.status': 'Status',

    // Equipment
    'equipment.title': 'Equipment Management',
    'equipment.addNew': 'Add Equipment',
    'equipment.search': 'Search equipment...',
    'equipment.name': 'Name',
    'equipment.type': 'Type',
    'equipment.vessel': 'Vessel',
    'equipment.status': 'Status',
    'equipment.lastMaintenance': 'Last Maintenance',
    'equipment.actions': 'Actions',
    'equipment.edit': 'Edit',
    'equipment.delete': 'Delete',

    // Maintenance
    'maintenance.title': 'Maintenance Tasks',
    'maintenance.newTask': 'New Task',
    'maintenance.all': 'All',
    'maintenance.pending': 'Pending',
    'maintenance.inProgress': 'In Progress',
    'maintenance.completed': 'Completed',
    'maintenance.overdue': 'Overdue',
    'maintenance.task': 'Task',
    'maintenance.equipment': 'Equipment',
    'maintenance.priority': 'Priority',
    'maintenance.dueDate': 'Due Date',
    'maintenance.assignee': 'Assignee',
    'maintenance.high': 'High',
    'maintenance.medium': 'Medium',
    'maintenance.low': 'Low',

    // Inventory
    'inventory.title': 'Inventory Management',
    'inventory.addItem': 'Add Item',
    'inventory.search': 'Search inventory...',
    'inventory.item': 'Item',
    'inventory.category': 'Category',
    'inventory.quantity': 'Quantity',
    'inventory.location': 'Location',
    'inventory.minStock': 'Min Stock',
    'inventory.actions': 'Actions',

    // Vessels
    'vessels.title': 'Vessel Management',
    'vessels.addVessel': 'Add Vessel',
    'vessels.name': 'Name',
    'vessels.type': 'Type',
    'vessels.status': 'Status',
    'vessels.captain': 'Captain',
    'vessels.lastInspection': 'Last Inspection',

    // Settings
    'settings.title': 'Settings',
    'settings.profile': 'Profile Settings',
    'settings.language': 'Language',
    'settings.selectLanguage': 'Select Language',
    'settings.english': 'English',
    'settings.spanish': 'Spanish',
    'settings.notifications': 'Notifications',
    'settings.security': 'Security',
    'settings.save': 'Save Changes',

    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.view': 'View',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.search': 'Search...',
  },
  es: {
    // Navegación
    'nav.dashboard': 'Panel',
    'nav.vessels': 'Embarcaciones',
    'nav.equipment': 'Equipos',
    'nav.maintenance': 'Mantenimiento',
    'nav.inventory': 'Inventario',
    'nav.manuals': 'Manuales',
    'nav.history': 'Historial',
    'nav.customers': 'Clientes',
    'nav.users': 'Usuarios',
    'nav.fuel': 'Combustible',
    'nav.settings': 'Configuración',
    'nav.logout': 'Cerrar Sesión',

    // Encabezado
    'header.notifications': 'Notificaciones',
    'header.profile': 'Perfil',
    'header.welcome': 'Bienvenido',

    // Panel
    'dashboard.title': 'Panel de Control',
    'dashboard.overview': 'Resumen de Flota',
    'dashboard.totalVessels': 'Total Embarcaciones',
    'dashboard.activeVessels': 'Embarcaciones Activas',
    'dashboard.underMaintenance': 'En Mantenimiento',
    'dashboard.docked': 'Atracadas',
    'dashboard.recentActivity': 'Actividad Reciente',
    'dashboard.upcomingMaintenance': 'Mantenimiento Próximo',
    'dashboard.viewAll': 'Ver Todo',
    'dashboard.dueDate': 'Fecha Vencimiento',
    'dashboard.status': 'Estado',

    // Equipos
    'equipment.title': 'Gestión de Equipos',
    'equipment.addNew': 'Agregar Equipo',
    'equipment.search': 'Buscar equipos...',
    'equipment.name': 'Nombre',
    'equipment.type': 'Tipo',
    'equipment.vessel': 'Embarcación',
    'equipment.status': 'Estado',
    'equipment.lastMaintenance': 'Último Mantenimiento',
    'equipment.actions': 'Acciones',
    'equipment.edit': 'Editar',
    'equipment.delete': 'Eliminar',

    // Mantenimiento
    'maintenance.title': 'Tareas de Mantenimiento',
    'maintenance.newTask': 'Nueva Tarea',
    'maintenance.all': 'Todas',
    'maintenance.pending': 'Pendiente',
    'maintenance.inProgress': 'En Progreso',
    'maintenance.completed': 'Completada',
    'maintenance.overdue': 'Vencida',
    'maintenance.task': 'Tarea',
    'maintenance.equipment': 'Equipo',
    'maintenance.priority': 'Prioridad',
    'maintenance.dueDate': 'Fecha Vencimiento',
    'maintenance.assignee': 'Asignado',
    'maintenance.high': 'Alta',
    'maintenance.medium': 'Media',
    'maintenance.low': 'Baja',

    // Inventario
    'inventory.title': 'Gestión de Inventario',
    'inventory.addItem': 'Agregar Artículo',
    'inventory.search': 'Buscar inventario...',
    'inventory.item': 'Artículo',
    'inventory.category': 'Categoría',
    'inventory.quantity': 'Cantidad',
    'inventory.location': 'Ubicación',
    'inventory.minStock': 'Stock Mínimo',
    'inventory.actions': 'Acciones',

    // Embarcaciones
    'vessels.title': 'Gestión de Embarcaciones',
    'vessels.addVessel': 'Agregar Embarcación',
    'vessels.name': 'Nombre',
    'vessels.type': 'Tipo',
    'vessels.status': 'Estado',
    'vessels.captain': 'Capitán',
    'vessels.lastInspection': 'Última Inspección',

    // Configuración
    'settings.title': 'Configuración',
    'settings.profile': 'Configuración de Perfil',
    'settings.language': 'Idioma',
    'settings.selectLanguage': 'Seleccionar Idioma',
    'settings.english': 'Inglés',
    'settings.spanish': 'Español',
    'settings.notifications': 'Notificaciones',
    'settings.security': 'Seguridad',
    'settings.save': 'Guardar Cambios',

    // Común
    'common.save': 'Guardar',
    'common.cancel': 'Cancelar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.view': 'Ver',
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.success': 'Éxito',
    'common.search': 'Buscar...',
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadUserLanguage();
    }
  }, [user]);

  const loadUserLanguage = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('language')
      .eq('id', user.id)
      .maybeSingle();

    if (data && !error) {
      setLanguageState(data.language as Language);
    }
  };

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);

    if (user) {
      await supabase
        .from('user_profiles')
        .upsert({ id: user.id, language: lang, updated_at: new Date().toISOString() });
    }
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
