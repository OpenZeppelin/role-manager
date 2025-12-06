# Research: Roles Page Layout Skeleton

**Feature**: 008-roles-page-layout  
**Date**: 2025-12-05

## Summary

This research documents the technical decisions for building the Roles page layout skeleton with mock data. Given the feature scope (static UI skeleton), research focused on component reuse patterns and design system alignment.

## Research Tasks

### 1. UI Builder Component Availability

**Task**: Identify which UI Builder components can be reused for this feature.

**Findings**:

| Required UI Element | UI Builder Component                      | Available?                                 |
| ------------------- | ----------------------------------------- | ------------------------------------------ |
| Role card container | `Card`, `CardHeader`, `CardContent`       | ✅ Yes                                     |
| Address with copy   | `AddressDisplay`                          | ✅ Yes                                     |
| Warning banner      | `Alert`, `AlertTitle`, `AlertDescription` | ✅ Yes                                     |
| Action buttons      | `Button`                                  | ✅ Yes                                     |
| Table component     | N/A                                       | ❌ No - use plain HTML table with Tailwind |
| Badge component     | N/A                                       | ❌ No - use Tailwind classes               |

**Decision**: Use UI Builder components for Card, AddressDisplay, Alert, and Button. Create custom table and badge styling with Tailwind.

**Rationale**: Maximizes code reuse while allowing flexibility for feature-specific styling.

### 2. Existing Project Patterns

**Task**: Analyze existing components to establish consistent patterns.

**Findings**:

- **Component Organization**: Feature-based folders (`components/Dashboard/`, `components/Contracts/`)
- **Styling**: Tailwind CSS v4 with `cn` utility for class composition
- **Icons**: lucide-react (already used in `DashboardStatsCard`, `PageEmptyState`)
- **State Management**: Local `useState` for simple UI state (see `DashboardStatsCard`)
- **Props Pattern**: Explicit interfaces, not `React.FC` (see existing components)

**Decision**: Follow existing patterns—create `components/Roles/` folder, use explicit prop interfaces, use lucide-react for icons.

**Rationale**: Consistency with existing codebase reduces cognitive load and maintenance burden.

### 3. AddressDisplay Component Capabilities

**Task**: Verify AddressDisplay meets requirements for account rows.

**Findings**:

```typescript
interface AddressDisplayProps {
  address: string;
  truncate?: boolean; // ✅ FR-016: truncated address
  startChars?: number; // Default 6
  endChars?: number; // Default 4
  showCopyButton?: boolean; // ✅ FR-017: copy button
  showCopyButtonOnHover?: boolean;
  explorerUrl?: string;
  className?: string;
}
```

**Decision**: Use `AddressDisplay` with `showCopyButton={true}`. The component handles:

- Address truncation (FR-016)
- Copy to clipboard with visual feedback (FR-017)
- Accessible button with aria-label

**Rationale**: Eliminates need to implement copy functionality—reuse existing tested component.

### 4. Role Icons Approach

**Task**: Determine approach for role-specific icons (crown for Owner).

**Findings**:

- lucide-react provides `Crown` icon (used in design)
- Other roles can use generic icons: `Users` (Operator), `Coins` (Minter), `Eye` (Viewer), `Flame` (Burner), `Pause` (Pauser), `ArrowRightLeft` (Transfer), `Check` (Approver)

**Decision**: Use lucide-react icons. Only Owner role (from Ownable interface) gets a specific icon (Crown). All other roles use a generic Shield icon since roles are developer-defined and we cannot assume their meanings.

**Rationale**: lucide-react is already a project dependency; consistent icon style.

### 5. Mock Data Structure

**Task**: Define mock data structure for development.

**Decision**: Create `mockData.ts` in components folder with:

- 8 mock roles matching the design (Owner, Operator, Minter, Viewer, Burner, Pauser, Transfer, Approver)
- 0-3 mock accounts per role
- Mock current user address for "You" badge testing

**Rationale**: Co-locating mock data with components allows easy replacement with real data later. Separate file keeps components clean.

## Alternatives Considered

### Table Component

| Alternative                   | Rejected Because                                              |
| ----------------------------- | ------------------------------------------------------------- |
| Import table from shadcn/ui   | Not in UI Builder packages; adds dependency                   |
| Create shared Table component | Over-engineering for single use case                          |
| **Use styled HTML table**     | ✅ Selected - Simple, sufficient for read-only reference data |

### State Management

| Alternative        | Rejected Because                                         |
| ------------------ | -------------------------------------------------------- |
| React Query        | No async data fetching needed                            |
| Context API        | Overkill for single page with simple selection           |
| **Local useState** | ✅ Selected - Simplest solution for role selection state |

## Open Questions

None—all technical decisions resolved.

## References

- UI Builder UI package: `packages/ui/src/components/ui/`
- Existing component patterns: `apps/role-manager/src/components/Dashboard/`
- Design screenshots: Provided in feature specification
