# Plan - GitMoon Organization & Transfer Architecture

Implement organized pages for GitMoon including organizations management and repository transfer logic tied to pricing plans.

## User Review Required

> [!IMPORTANT]
> Repository transfer between organizations or accounts will be restricted to users on paid plans (Eclipse, Galaxy, Supernova). Free users (Orbit) can create organizations but cannot move existing repos into them.

- **Organization Management**: Users can create organizations to group repositories.
- **Repository Transfer**: Move repositories between accounts or organizations.
- **Plan Enforcement**: Validation logic to ensure transfers are only allowed for paid tiers.
- **UI Refresh**: Modern, organized dashboard for managing these entities.

## Technical Details

### Database Schema Updates (Supabase)
1. **`organizations`**: 
   - `id` UUID PRIMARY KEY
   - `name` TEXT NOT NULL
   - `slug` TEXT UNIQUE NOT NULL
   - `owner_id` UUID REFERENCES profiles(id)
   - `created_at` TIMESTAMPTZ
2. **`organization_members`**:
   - `org_id` UUID REFERENCES organizations(id)
   - `user_id` UUID REFERENCES profiles(id)
   - `role` app_role (admin, member)
3. **Update `repositories`**:
   - Add `organization_id` UUID NULL REFERENCES organizations(id)
   - Add RLS to allow access by org members.

### Business Logic (Server Functions)
1. **`createOrganization`**: Create new org and assign owner.
2. **`transferRepository`**: 
   - Check if source owner has a paid plan.
   - Update `owner_id` or `organization_id`.
   - Log the transfer in `audit_log`.

### UI Components
1. **`/admin/organizations`**: Dashboard for managing orgs.
2. **Transfer Modal**: Interface to select target owner/org.

## Implementation Steps
1. **Migration**: Create `organizations` and `organization_members` tables. Add `organization_id` to `repositories`.
2. **Auth & Roles**: Extend `has_role` or create `is_org_admin` for granular control.
3. **Server Functions**: Implement the transfer and creation logic with plan checks.
4. **UI Integration**: Add organization management to the dashboard.
