# YachtOps - Maintenance Management System

A premium multi-tenant SaaS platform for the mega yacht and yacht industry focused on preventive maintenance management and spare parts inventory control.

## Features

### Core Functionality
- **Multi-tenant vessel-based architecture** with strict data isolation
- **Role-based access control** (Master Admin, Customer Admin, Standard User)
- **Preventive maintenance scheduling** with customizable intervals
- **Inventory management** with automatic stock deduction
- **Maintenance history** and audit trail
- **Equipment management** and tracking
- **Maintenance manual** upload and management
- **Low stock alerts** and notifications
- **Task completion workflow** with photo uploads
- **Customer and vessel management**
- **User management** with vessel assignment

### Premium Design
- Modern, elegant SaaS interface
- Rounded corners throughout (12-20px radius)
- Soft shadows and generous spacing
- Professional blue/marine color scheme
- Fully responsive design
- Smooth transitions and interactions

## Business Model

The platform supports two revenue streams:

1. **Annual Subscription SaaS** - Customers pay annual fees for platform access
2. **Implementation Service** - Master Admin can offer paid setup/onboarding services where they:
   - Create customer accounts
   - Configure vessels
   - Set up users
   - Preload inventory
   - Configure maintenance schedules
   - Deliver ready-to-use system

## Architecture

### Multi-Tenant Structure
- Every company/customer can have multiple vessels
- Every vessel belongs to one company
- Users must be assigned to at least one vessel
- Data is strictly isolated by vessel_id
- Users only see data for their assigned vessel(s)

### User Roles

#### Master Admin / Platform Owner
- Full global access to all customers and vessels
- Can create and configure customer accounts
- Can create vessels and users for customers
- Can preload data and configure systems
- Offers implementation services

#### Customer Admin
- Access to their company's vessels and users
- Can manage maintenance tasks and inventory
- Can view all vessels in their company
- Cannot access other customers' data

#### Standard User / Technician
- Access only to assigned vessel(s)
- Can view and complete maintenance tasks
- Limited inventory access
- Cannot manage users or vessels

## Demo Data

The application includes realistic demo data:

### Demo Accounts (Password: demo123)

- **Master Admin**: admin@yachtmaintenance.pro
- **Customer Admin**: captain@oceanicluxury.com
- **Standard User**: chief.engineer@oceanicluxury.com

### Included Demo Data
- 3 companies/customers
- 5 vessels (motor yachts, sailing yacht, expedition yacht)
- 6 users with different roles
- 8+ equipment items (engines, generators, HVAC, watermakers, etc.)
- Multiple maintenance tasks (overdue, due soon, upcoming)
- Inventory items with low stock examples
- Maintenance history records
- Maintenance manuals

## Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Demo data system** (ready for Supabase integration)

## Database Schema (Ready for Implementation)

Key entities prepared for Supabase:
- companies / customers
- vessels
- users
- user_vessels
- equipment
- maintenance_tasks
- maintenance_checklists
- maintenance_history
- inventory_items
- stock_movements
- maintenance_manuals

## Key Workflows

### Maintenance Task Completion
1. User views task details
2. Clicks "Complete Task"
3. Fills completion form with:
   - Comments/observations
   - Parts used (with quantity)
   - Photos (optional)
   - Issues detected (optional)
4. Confirms completion
5. System automatically:
   - Deducts inventory stock
   - Creates history record
   - Updates task status
   - Logs stock movements

### Low Stock Management
- Automatic alerts when stock <= minimum threshold
- Dashboard warnings for low stock items
- Visual indicators throughout inventory
- Recommended reorder notifications

### Vessel Switching
- Users with multiple vessel access see a vessel switcher
- All data automatically filters to selected vessel
- Seamless switching between vessels
- Context preserved per vessel

## Installation

```bash
npm install
npm run dev
```

## Build for Production

```bash
npm run build
```

## Future Enhancements (When Connecting to Database)

1. Connect to Supabase backend
2. Implement real authentication
3. Add Stripe subscription billing
4. Enable real file uploads for photos and manuals
5. Add email notifications
6. Implement real-time updates
7. Add reporting and analytics
8. Export maintenance schedules to PDF
9. Mobile app companion

## Security Features (Ready for Implementation)

- Row Level Security (RLS) policies prepared
- Vessel-based data isolation
- Role-based access control
- Audit trail for all actions
- Secure file upload handling

## Notes

This is a demo version using client-side demo data. All database operations and authentication flows are structured and ready for Supabase integration. The data model follows best practices for multi-tenant SaaS applications with strict data isolation.
