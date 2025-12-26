# Plan: Custom "Vonix Studio" Database Manager

This document outlines the implementation plan for a built-in, custom database management interface for the Vonix Network Site. This interface will serve as a native replacement for Drizzle Studio, fully integrated with the site's aesthetics and authentication system.

## 🔒 Security & Privacy

*   **Route Path**: `/rseci/database` 
    *   *Note: This is an obscured "random" route name to prevent guessing.*
*   **Authentication**: 
    *   **Strict requirement**: `session.user.role` must equal `'admin'`.
    *   **Double Layer Protection**: 
        1.  `middleware.ts` protection for the route.
        2.  Per-page/layout server-side check.

## 🎨 Design Philosophy

*   **Aesthetics**: Must match the "Vonix Premium" look. 
    *   Glassmorphism cards (`variant="glass"`).
    *   Neon accents (Cyan/Purple/Pink) for active states.
    *   Smooth transitions and hover effects.
*   **UX**:
    *   Dashboard-like interface.
    *   Sidebar for Table selection.
    *   Main area for the Data Grid.
    *   Slide-over or Modal for Record Editing.

## 🛠 Technical Architecture

### 1. Data Access Layer (Server Actions)
Since Drizzle is type-safe, building a "generic" table viewer requires some dynamic handling.

*   **`src/app/rseci/database/actions.ts`**:
    *   `getSchemaInfo()`: reads the `schema` object from `src/db/schema.ts` to list all tables and their columns/types.
    *   `getTableData(tableName, page, limit, sort)`: dynamic query executor.
    *   `updateRow(tableName, id, data)`: dynamic update.
    *   `deleteRow(tableName, id)`: dynamic delete.

### 2. Frontend Components (`src/components/studio/`)
*   **`TableSidebar`**: Lists all tables (e.g., `users`, `posts`, `tickets`). Uses `schema` keys.
*   **`DataGrid`**:
    *   Dynamic headers based on column names.
    *   Cell renderers for special types (Dates, Booleans, Foreign Keys).
    *   Pagination controls.
*   **`QueryConsole`** (Optional): A raw SQL input field for power users using `db.execute(sql)`.

## 📋 Implementation Steps

### Phase 1: Setup & Security
1.  Create the route directory: `src/app/rseci/database`.
2.  Create `layout.tsx`: Implement the Admin Role Gate.
3.  Add the route to `middleware.ts` (if applicable) for extra safety.

### Phase 2: Schema Introspection
1.  Create a utility to parse the Drizzle schema object.
    *   *Challenge*: Drizzle schema is code, not JSON.
    *   *Solution*: Import `* as schema` from `@/db/schema` and iterate over `Object.entries(schema)`. Filter for Drizzle Table instances.

### Phase 3: The Data Grid
1.  Build the `page.tsx` to accept a `?table=` search param.
2.  Fetch data for the selected table dynamically:
    ```typescript
    // Pseudo-code concept
    import * as schema from '@/db/schema';
    const table = schema[tableName];
    const data = await db.select().from(table).limit(50);
    ```
3.  Render a semantic HTML table styled with Tailwind.

### Phase 4: Editing Capabilities
1.  Implement "Double-click to edit" or an "Edit" button per row.
2.  Create a generic Form component that maps column types to inputs:
    *   `varchar` -> `<Input type="text" />`
    *   `timestamp` -> `<DatePicker />`
    *   `boolean` -> `<Switch />`
    *   `integer` -> `<Input type="number" />`

## 📂 File Structure

```text
src/app/rseci/database/
├── layout.tsx         # Admin auth check + Global layout
├── page.tsx           # Main data grid view
├── actions.ts         # Server actions for dynamic DB ops
└── components/
    ├── Sidebar.tsx    # Table navigation
    ├── DataGrid.tsx   # The table view
    └── EditModal.tsx  # Row editor
```

## 🚀 Future Enhancements
*   **Relationship Navigation**: Click a User ID to jump to that User record.
*   **Stats Dashboard**: Row counts and table sizes on the main landing page.
*   **SQL Runner**: Execute raw SQL safely.
