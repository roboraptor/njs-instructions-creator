# SQLite Database Inspection

## Table: `snippets`

### Schema

| Column | Type | Not Null | Default | PK |
|---|---|---|---|---|
| id | INTEGER | 0 | null | 1 |
| title | TEXT | 1 | null | 0 |
| content | TEXT | 1 | null | 0 |
| order_index | INTEGER | 0 | 0 | 0 |
| category_id | INTEGER | 0 | null | 0 |

### Data

| id | title | content | order_index | category_id |
| --- | --- | --- | --- | --- |
| 5 | Dev Next TS BS | You are an expert full-stack developer specializing in Next.js, TypeScript, Bootstrap and SQLite. | 1 | 4 |
| 6 | FW - Next.js | - **Framework:** Next.js (App Router, API Routes for server-side operations) | 2 | 5 |
| 7 | Lang - TypeScript | - **Language:** TypeScript (strict type safety required) | 3 | 5 |
| 8 | UI - Bootstrap | - **UI Framework:** Bootstrap 5 (via standard CSS/JS or react-bootstrap, optimized for simple, clean responsive layout) | 4 | 5 |
| 9 | DB - BetterSqlite3 | - **Database:** better-sqlite3 (local file-based persistent storage) | 5 | 5 |
| 10 | Util - Excel | - **Utilities:** `xlsx` (for Excel import/export). | 6 | 5 |
| 11 | DB - Main | Keep the schema normalized but simple. Store config and logs efficiently.<br>Ensure all database operations are executed strictly in Server Components... | 7 | 7 |
| 12 | DB - conf sungleton | - **App Config:** Singleton table holding global application settings. | 8 | 7 |
| 13 | Navbar | - **Navbar:** A simple global top navigation bar containing links to all main views (Dashboard, Reports, Admin). | 9 | 10 |
| 14 | Theme management | - **Theme Management:** <br>  - Must use standard Bootstrap 5.3+ native dark mode (by toggling the `data-bs-theme` attribute on the `<html>` or `<body... | 10 | 10 |
| 15 | No Bootstrap JS | - **No Bootstrap JS:** All JS interactivity (collapses, modals) is handled by React useState. | 1 | 11 |
| 16 | Theme | - **Theme:** Use Bootstrap native data-bs-theme attribute on \<body\> (Dark/Light mode). | 2 | 11 |
| 17 | Ressilient DB actions | - **Resilience:** All DB actions are strictly inside Server Actions (src/lib/actions.ts), using parameterized queries to prevent SQL injection. | 3 | 11 |
| 18 | No Over-Engineering | - **No Over-Engineering:** Do not install external state management libraries (Redux, Zustand) or heavy visualization tools unless explicitly asked. U... | 1 | 13 |
| 19 | Database Execution | - **Database Execution:** Initialize the database connection as a single shared module (`src/lib/db.ts`). Use prepared statements for execution to ens... | 2 | 13 |
| 20 | No Placeholders | - **No Placeholders:** When generating code, write complete API endpoints and components. Do not leave `// TODO: implement later` comments, as re-aski... | 3 | 13 |
| 21 | CSS Styling | - **CSS Styling:** Rely purely on Bootstrap 5 utility classes (`d-flex`, `gap-3`, `btn-success`, `table-striped`) to keep custom CSS files at low or b... | 1 | 13 |
| 22 | DB-Types | - **Types:** Define explicit interfaces for Database rows and API responses in a shared `src/types/index.ts` file. | 4 | 13 |
| 23 | Agent Tool Protocol | You have shell command execution capabilities. Proactively execute compiler builds (e.g., `npx tsc --noEmit`) and review dev logs to verify code chang... | 2 | 4 |
| 24 | API Router Standard | - **API Route Standard:** Place server-only processing logic in Next.js Route Handlers (`src/app/api/...`). Keep payloads small and return standardize... | 7 | 5 |
| 25 | Dictionary Strategy | - **Localization Dictionary:** Store locales in `src/locales/` as static JSON schema files. Access keys using a custom React Context Provider or wrapp... | 1 | 8 |
| 26 | Clean Logs & Debugging | - **Console Logging:** Clean up all debugging `console.log` statements before submitting your work. Server logs must remain clean and readable, loggin... | 4 | 11 |
| 27 | Pagination and Filtering | - **Pagination & Filtering:** Provide paginated tables or lazy-loading lists with query param filter controls to handle database records efficiently w... | 1 | 12 |
| 28 | Brief Explanations | - **Brief Explanations:** Answer questions concisely. Focus on demonstrating output via file contents rather than describing changes in paragraphs. | 5 | 13 |

## Table: `categories`

### Schema

| Column | Type | Not Null | Default | PK |
|---|---|---|---|---|
| id | INTEGER | 0 | null | 1 |
| name | TEXT | 1 | null | 0 |
| header_text | TEXT | 1 | null | 0 |
| order_index | INTEGER | 0 | 0 | 0 |
| parent_id | INTEGER | 0 | null | 0 |

### Data

| id | name | header_text | order_index | parent_id |
| --- | --- | --- | --- | --- |
| 4 | Role & Project Overview | # Role & Project Overview | 0 | NULL |
| 5 | Tech Stack | ## Tech Stack | 1 | 4 |
| 6 | Core System Architecture & Rules | ## Core System Architecture & Rules | 2 | 4 |
| 7 | DB schema  | ### Database Schema (better-sqlite3) | 3 | 6 |
| 8 | Localisation strategy | ### Localization Strategy | 4 | 6 |
| 9 | Features & Views | ## Application Features & Views | 5 | 4 |
| 10 | Globals Layout darkmode | ### Global Layout & Theme (Dark Mode) | 6 | 9 |
| 11 | Development Standards | ## **Development Standards** | 7 | 4 |
| 12 | Key Features | ## **Key Features** | 8 | 11 |
| 13 | Token-Saving | ## Token-Saving & Implementation Rules (Strict) | 8 | 4 |

## Table: `presets`

### Schema

| Column | Type | Not Null | Default | PK |
|---|---|---|---|---|
| id | INTEGER | 0 | null | 1 |
| name | TEXT | 1 | null | 0 |
| snippet_ids | TEXT | 1 | null | 0 |

### Data

| id | name | snippet_ids |
| --- | --- | --- |
| 1 | Default | [5,6,7,8,9,11,12,13,14,15,16,17,18,21,19,20,22] |

