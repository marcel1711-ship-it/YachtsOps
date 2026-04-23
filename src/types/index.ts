export type UserRole = 'master_admin' | 'customer_admin' | 'standard_user';

export type SubscriptionStatus = 'active' | 'expired' | 'trial';

export type MaintenanceStatus = 'upcoming' | 'due_soon' | 'overdue' | 'completed';

export type MaintenanceFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | 'custom';

export type InventoryType = 'spare_part' | 'consumable';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Company {
  id: string;
  name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  subscription_status: SubscriptionStatus;
  subscription_renewal_date: string;
  notes: string;
  created_at: string;
}

export interface Vessel {
  id: string;
  company_id: string;
  name: string;
  type: string;
  manufacturer: string;
  model: string;
  year_built: number | null;
  flag: string;
  imo_number: string;
  mmsi: string;
  call_sign: string;
  registration_id: string;
  length_overall: number | null;
  beam: number | null;
  gross_tonnage: number | null;
  location: string;
  description: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  company_id: string;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  status: 'active' | 'inactive';
  vessel_ids: string[];
  created_at: string;
}

export interface Equipment {
  id: string;
  vessel_id: string;
  name: string;
  type: string;
  manufacturer: string;
  model: string;
  serial_number: string;
  description: string;
  location: string;
  created_at: string;
}

export interface MaintenanceTask {
  id: string;
  vessel_id: string;
  company_id: string;
  equipment_id: string;
  title: string;
  description: string;
  category: string;
  priority: TaskPriority;
  frequency: MaintenanceFrequency;
  custom_interval_days?: number;
  last_completed_date: string | null;
  next_due_date: string;
  reminder_days_before: number[];
  assigned_user_id: string;
  required_parts: { inventory_id: string; quantity: number }[];
  estimated_duration_hours: number;
  instructions: string;
  checklist_items: string[];
  notes: string;
  status: MaintenanceStatus;
  created_at: string;
}

export interface MaintenanceHistory {
  id: string;
  task_id: string;
  vessel_id: string;
  company_id: string;
  equipment_id: string;
  task_title: string;
  due_date: string;
  completion_date: string;
  completed_by_id: string;
  completed_by_name: string;
  completed_by_email: string;
  comments: string;
  photos: string[];
  parts_used: { inventory_id: string; quantity: number; name: string }[];
  issues_detected: string;
  created_at: string;
}

export interface InventoryItem {
  id: string;
  vessel_id: string;
  company_id: string;
  name: string;
  type: InventoryType;
  part_number: string;
  serial_number: string;
  description: string;
  category: string;
  equipment_id: string | null;
  supplier_name: string;
  supplier_email: string;
  supplier_phone: string;
  current_stock: number;
  minimum_stock: number;
  unit_of_measure: string;
  storage_location: string;
  notes: string;
  photo_url: string | null;
  created_at: string;
}

export interface StockMovement {
  id: string;
  inventory_id: string;
  vessel_id: string;
  movement_type: 'in' | 'out' | 'adjustment';
  quantity: number;
  reason: string;
  reference_id: string | null;
  performed_by_id: string;
  performed_by_name: string;
  created_at: string;
}

export type ResourceType =
  | 'diesel_main'
  | 'diesel_generator'
  | 'fresh_water'
  | 'engine_oil'
  | 'hydraulic_oil'
  | 'grey_water'
  | 'black_water'
  | 'other';

export interface FuelResource {
  id: string;
  vessel_id: string;
  company_id: string;
  name: string;
  resource_type: string;
  unit: string;
  capacity: number;
  current_level: number;
  low_level_alert: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface FuelLogEntry {
  id: string;
  resource_id: string;
  vessel_id: string;
  company_id: string;
  entry_type: 'refill' | 'consumption';
  quantity: number;
  price_per_unit: number | null;
  total_cost: number | null;
  currency: string;
  supplier: string;
  location: string;
  engine_hours: number | null;
  notes: string;
  logged_by_id: string | null;
  logged_by_name: string;
  log_date: string;
  created_at: string;
}

export interface MaintenanceManual {
  id: string;
  vessel_id: string;
  company_id: string;
  equipment_id: string | null;
  title: string;
  description: string;
  file_name: string;
  file_url: string;
  file_size: number;
  uploaded_by_id: string;
  uploaded_by_name: string;
  created_at: string;
}
