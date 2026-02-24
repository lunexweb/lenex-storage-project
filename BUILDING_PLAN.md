# Building plan: Fyla-style product in Lunex Storage Project

**Goal:** Build a real product inside `Lunex-storage-project` that looks and behaves like the `fyla-secure-files` demo (fonts, spacing, colours, and edge cases). Supabase is integrated last.

**Reference:** Demo lives at `fyla-secure-files` (same workspace). Use it as the single source of truth for UI and behaviour.

**Content policy:** Real content only — no placeholder or demo content. When there is no data (e.g. no subscription, no payment method), show the actual empty state as it would appear in production (e.g. "No plan", "Add payment method"). Do not show fake data (e.g. "Pro — R 299/month", "•••• 4242") anywhere.

**Post-login experience (where to start):** From the first screen after login, users must never see blanks or developer-only copy. Every route must offer a clear "where to start" — e.g. a primary action ("Create your first file"), a greeting and summary (e.g. stats, recent items), or a guided empty state. No "Phase X complete" or builder/placeholder text in the UI. Apply this from Phase 0 onward so every deliverable is user-ready.

---

## Phase 0: Project foundation

**Objective:** Same tooling, structure, and paths as the demo so the rest can be copied faithfully. From the start, any screen a user can reach must be user-facing (no dev copy, clear next step where applicable).

| Step | Task | Reference / Spec |
|------|------|-------------------|
| 0.1 | **Initialize Vite + React + TypeScript** (or align existing project) with `@/` path alias pointing to `./src/*`. | Demo: `vite.config.ts` (react, path alias), `tsconfig` paths. |
| 0.2 | **Install core dependencies** (exact versions from demo where it matters): `react`, `react-dom`, `react-router-dom`, `@tanstack/react-query`, `lucide-react`, `clsx`, `tailwind-merge`, `class-variance-authority`, `date-fns`, `zod`, `react-hook-form`, `@hookform/resolvers`, `sonner`. | Demo: `package.json`. |
| 0.3 | **Config files:** `vite.config.ts` (alias, port optional), `tsconfig.json` / `tsconfig.app.json` with `"@/*": ["./src/*"]`, `postcss.config.js` (tailwind + autoprefixer). | Demo: `vite.config.ts`, `tsconfig.json`, `postcss.config.js`. |
| 0.4 | **Entry:** `index.html` with same meta, viewport, and **DM Sans font** link; `src/main.tsx` rendering `App` and importing `src/index.css`. | Demo: `index.html` (including Google Fonts DM Sans link), `main.tsx`. |
| 0.5 | **User-facing from day one** – Any page or view that a logged-in user can see must have user-facing copy and a clear "where to start" (primary action or empty state). Do not ship screens that say "Phase X complete" or similar; replace with greeting + primary CTA (e.g. "Create file") or real content. | Post-login experience (top of plan). |

**Done when:** `npm run dev` runs and a blank app loads with DM Sans applied; any post-login screens added in later phases follow the "where to start" rule.

---

## Phase 1: Design system (fonts, colours, spacing, components)

**Objective:** Pixel-level match on typography, colours, radius, and animations so every screen matches the demo.

| Step | Task | Reference / Spec |
|------|------|-------------------|
| 1.1 | **Tailwind config** – Copy theme from demo: `fontFamily.sans` = `['"DM Sans"', 'system-ui', 'sans-serif']`, `container` (center, padding `2rem`, `2xl: 1400px`), **custom colours**: `border`, `input`, `ring`, `background`, `foreground`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `card`, `popover`, plus **gold**, **success**, **warning**, **completed**, **navy** (with `navy-light`), and full **sidebar** palette. Copy `borderRadius` (lg/md/sm from `--radius`). Copy **keyframes**: `accordion-down/up`, `fade-in`, `fade-out`, `scale-in`, `slide-in-right`, `slide-out-right`, `highlight`, `pop`. Copy **animation** names. `content` paths: `./src/**/*.{ts,tsx}` (and pages/components/app if present). Plugin: `tailwindcss-animate`. | Demo: `tailwind.config.ts`. |
| 1.2 | **Global CSS** – Copy `src/index.css`: `@tailwind base/components/utilities`; `:root` with all CSS variables (background, foreground, primary, gold, success, warning, completed, navy, navy-light, sidebar-*, radius). Base layer: `* { @apply border-border }`, `body { @apply bg-background text-foreground; font-family: "DM Sans", system-ui, sans-serif; }`. Utilities: `.text-gold`, `.bg-gold`, `.text-success`, `.bg-success`, `.text-warning`, `.bg-warning`, `.text-completed`, `.bg-completed`, `.bg-navy`, `.text-navy`, `.bg-navy-light`. | Demo: `src/index.css`. |
| 1.3 | **shadcn/ui** – Use same style as demo: `components.json` with `style: default`, `baseColor: slate`, `cssVariables: true`, `prefix: ""`, aliases `@/components`, `@/lib/utils`, `@/components/ui`, `@/lib`, `@/hooks`. Install only the components the demo uses (see 1.4). | Demo: `components.json`. |
| 1.4 | **UI components to install (and then customise):** `button`, `badge`, `input`, `label`, `switch`, `dialog` (with DialogHeader, DialogTitle, DialogFooter, DialogContent), `toaster`, `toast`, `sonner`, `tooltip`. In **button**: add variant `gold`: `"bg-gold text-gold-foreground hover:bg-gold/90 shadow-sm font-semibold"`. In **badge**: add variants `business`, `individual`, `live`, `pending`, `completed` (same classes as demo). Copy `button.tsx` and `badge.tsx` from demo so spacing and variants match. | Demo: `src/components/ui/button.tsx`, `badge.tsx`. |
| 1.5 | **Shared lib:** `src/lib/utils.ts` – `cn()` using `clsx` + `tailwind-merge`. | Demo: `src/lib/utils.ts`. |

**Done when:** Design tokens and core UI (Button with gold, Badge with all variants) match the demo; no new colours or fonts introduced.

---

## Phase 2: Layout and shell

**Objective:** Same shell (sidebar, main area, responsive behaviour) and navigation so every route feels identical to the demo.

| Step | Task | Reference / Spec |
|------|------|-------------------|
| 2.1 | **NavLink** – Custom `NavLink` wrapping React Router’s `NavLink`, with `className`, `activeClassName`, `pendingClassName` (function receiving `{ isActive, isPending }`). | Demo: `src/components/NavLink.tsx`. |
| 2.2 | **AppLayout** – Fixed left sidebar: width `240px` expanded / `64px` collapsed; `bg-navy`; border `border-navy-light`; logo “Fyla” (or your product name) `text-gold`; collapse toggle (ChevronLeft/ChevronRight); nav items with same classes (active: `bg-navy-light text-gold`, inactive: `text-navy-foreground hover:bg-navy-light hover:text-white`); profile block at bottom with avatar initial, display name, “Log out” button. Persist collapse state in `localStorage` (e.g. key `fyla-sidebar` or project-specific). Main content area `marginLeft` = sidebar width, `min-h-screen`. | Demo: `src/components/layout/AppLayout.tsx`. |
| 2.3 | **Route guard layout** – Wrapper that checks auth + onboarding; redirects to `/login` or `/onboarding` when needed; otherwise renders `AppLayout` + children. | Demo: `App.tsx` (`AppRoute`, `LoginRoute`, `OnboardingRoute`). |

**Done when:** Sidebar and main area match demo; collapse state persists; redirects work. Every route rendered inside the shell must have user-facing content and a clear next step (see Phase 0.5, Phase 7).

---

## Phase 3: Auth and onboarding (no backend)

**Objective:** Same login and onboarding flows and copy; auth state in memory + localStorage only.

| Step | Task | Reference / Spec |
|------|------|-------------------|
| 3.1 | **AuthContext** – State: `user` (email, name), `onboardingComplete`. Methods: `login(email, name?)`, `logout()`, `completeOnboarding()`. Persist in localStorage (e.g. key `fyla-demo-auth` or project-specific). Load once on init. | Demo: `src/context/AuthContext.tsx`. |
| 3.2 | **Login page** – Split layout: left panel **42%** width on `lg`, `bg-navy`, logo + “Fyla” + tagline; right panel form “Welcome back”, email + password inputs, submit button. Same spacing (`space-y-5`, `space-y-2`), label/input styles. Submit: call `login(email, name?)` then navigate to `/onboarding`. | Demo: `src/pages/LoginPage.tsx`. |
| 3.3 | **Onboarding page** – Same fields as demo: account type (business/individual), name, role (with “Other” + text), industry, **reference format example**, **project number format example**. Use `SettingsContext` (see Phase 4) to store profile; on submit call `completeOnboarding()` and navigate to `/`. Match layout and spacing exactly. | Demo: `src/pages/OnboardingPage.tsx`. |

**Done when:** Login and onboarding match the demo; state persists across refresh. After onboarding, user lands on Dashboard (or first app screen), which must offer "where to start" (Phase 7).

---

## Phase 4: Settings and profile

**Objective:** Profile and format examples stored locally and used everywhere (e.g. reference/project number generation).

| Step | Task | Reference / Spec |
|------|------|-------------------|
| 4.1 | **SettingsContext** – Profile type: `accountType`, `businessNameOrUserName`, `role`, `roleOther`, `industry`, `referenceFormatExample`, `projectNumberFormatExample`. Persist in localStorage. `updateProfile(updates)`. Export `ROLE_LABELS` and types. | Demo: `src/context/SettingsContext.tsx`. |
| 4.2 | **Settings page** – Display profile card(s) with same icons and layout; “Edit profile” opens dialog. Edit form: same fields as onboarding. Format examples shown (reference + project number). Match spacing and typography. **Billing (if present):** Show only real data or the real empty state (e.g. "No plan", "Add payment method"); no fake plan/card/date placeholders. | Demo: `src/pages/SettingsPage.tsx`. |

**Done when:** Profile and format examples match demo behaviour and UI; no placeholder content (billing or elsewhere).

---

## Phase 5: Data model and mock data

**Objective:** Same domain types and mock data so all pages can be built against a stable contract; later swap to Supabase without changing UI.

| Step | Task | Reference / Spec |
|------|------|-------------------|
| 5.1 | **Types and mock data** – Copy from demo: `FolderFile`, `Folder`, `Field`, `NoteEntry`, `Project`, `ClientFile`, `Template`, `TemplateFolderDef`. Export `initialFiles`, `initialTemplates`. Implement **getFileStats(files)**, **getProjectStats(project)**, **getFileDocCounts(file)** with same logic (counts by type, etc.). | Demo: `src/data/mockData.ts`. |
| 5.2 | **Reference utils** – Copy `parseReferenceFormat`, `getNextReference`, `findDuplicateReference`, `getNextProjectNumber`. Same behaviour for “REF-001” / “PRJ-0001” style formats. | Demo: `src/lib/referenceUtils.ts`. |
| 5.3 | **DataContext** – Same API: `files`, `templates`, `addFile`, `updateFile`, `addProject`, `updateProject`, `addField`, `updateField`, `deleteField`, `addFolder`, `addFileToFolder`, `updateNotes`, `setNoteEntries`, `addNoteEntry`, `updateNoteEntry`, `deleteNoteEntry`, `addTemplate`, `updateTemplate`, `deleteTemplate`, `nextProjectId`. Initial state from `initialFiles` and `initialTemplates`. No persistence yet (in-memory only). | Demo: `src/context/DataContext.tsx`. |

**Done when:** All domain operations and helpers work; UI can use `useData()` and reference utils.

---

## Phase 6: App routing and providers

**Objective:** Same URL structure and provider tree as the demo.

| Step | Task | Reference / Spec |
|------|------|-------------------|
| 6.1 | **App.tsx** – Provider order: `QueryClientProvider` → `TooltipProvider` → `Toaster` + `Sonner` → `AuthProvider` → `SettingsProvider` → `DataProvider` → `BrowserRouter`. Routes: `/portal` → ClientPortal; `/login` → LoginRoute; `/onboarding` → OnboardingRoute; `/*` → AppRoute (layout + nested routes). Nested: `/` Dashboard, `/files` Files, `/file/:fileId` File, `/file/:fileId/project/:projectId` Project, `/templates` Templates, `/settings` Settings, `*` NotFound. Every nested route must show user-facing content and a clear "where to start" (no blank or dev-only pages). | Demo: `src/App.tsx`. Post-login experience (top of plan). |
| 6.2 | **NotFound page** – Same copy and layout (e.g. 404 message, link back). | Demo: `src/pages/NotFound.tsx`. |

**Done when:** All routes resolve and redirects behave like the demo; no route shows blank or builder placeholder content.

---

## Phase 7: Dashboard page

**Objective:** Same dashboard content, stats, and spacing. This is the first screen after login — must give a clear "where to start" (no blanks, no dev copy).

| Step | Task | Reference / Spec |
|------|------|-------------------|
| 7.1 | **Dashboard** – Greeting (Good morning/afternoon/evening), date string (e.g. `en-ZA` long format). Stat cards: same labels and values (from `getFileStats`, storage calc, etc.). “Create file” + optional secondary action; file list/grid with same columns and badges (type, reference, last updated, actions: Open, Share). Recent activity list: same structure (action, target, file link, user, time). Use same padding, gaps, and section spacing. **Where to start:** If no files yet, show a clear empty state with one primary action (e.g. "Create your first file"); never show "Phase X" or placeholder builder text. | Demo: `src/pages/DashboardPage.tsx`. Post-login experience (top of plan). |

**Done when:** Dashboard matches demo layout and data; users always see a clear next step (create file or browse existing).

---

## Phase 8: Files list and file detail

**Objective:** Same files list and file header/detail view.

| Step | Task | Reference / Spec |
|------|------|-------------------|
| 8.1 | **Files page** – Same toolbar (search placeholder, “Create file” primary button). Table/cards: name, type badge, reference, last updated, actions. **Empty state:** When no files, show a real empty state with one clear CTA (e.g. "Create your first file"); no dev or placeholder text. | Demo: `src/pages/FilesPage.tsx`. Post-login experience, Content policy. |
| 8.2 | **Create file modal** – Same fields (name, type, phone, email, reference, etc.), validation, duplicate reference check via `findDuplicateReference`, next reference from `getNextReference` + settings. Use toast on success. | Demo: `src/components/modals/CreateFileModal.tsx`. |
| 8.3 | **File page** – Header: file name, type badge, key details (e.g. phone, email, reference); “Edit File Details” and “Share File” buttons. Projects list: same card/row layout, status badge, link to project. “Add project” button opening AddProject modal. | Demo: `src/pages/FilePage.tsx`. |
| 8.4 | **Share modal** – Same UI (e.g. copy link, optional email); can stay mock for now. | Demo: `src/components/modals/ShareModal.tsx`. |

**Done when:** Files list and file detail match demo; create file and share modals behave the same.

---

## Phase 9: Projects and project detail

**Objective:** Same project creation and project detail (fields, folders, notes).

| Step | Task | Reference / Spec |
|------|------|-------------------|
| 9.1 | **Add project modal** – Name, status, description; next project number from `getNextProjectNumber` + settings. | Demo: `src/components/modals/AddProjectModal.tsx`. |
| 9.2 | **Project page** – Same header (name, status badge, Share). Sections: **Fields** (name/value rows, add/edit/delete), **Folders** (type, name, file list with type/size/date), **Notes** (optional plain text + **structured note entries**). Note entries: date, heading, subheading, content (with simple rich text e.g. bold); add/edit/delete; same card layout and spacing. Auto-save toggle and “Add daily note” if present. Match all padding and typography. Empty sections use real empty states (e.g. "Add field", "Add folder") with clear primary action; no dev copy. | Demo: `src/pages/ProjectPage.tsx`. Content policy. |

**Done when:** Project creation and project detail (fields, folders, notes, note entries) match the demo.

---

## Phase 10: Templates and client portal

**Objective:** Same templates management and portal entry.

| Step | Task | Reference / Spec |
|------|------|-------------------|
| 10.1 | **Templates page** – List templates; “New template”; add/edit (name, fields, folder definitions); delete with confirmation toast. Same layout and buttons. **Empty state:** When no templates, show a real empty state with one clear CTA (e.g. "Create your first template"); no dev or placeholder text. | Demo: `src/pages/TemplatesPage.tsx`. Post-login experience, Content policy. |
| 10.2 | **Client portal** – Same entry UI (e.g. code/reference input); submit behaviour (look up file/project and navigate or show message). Can stay mock (e.g. match first file or show message). | Demo: `src/pages/ClientPortal.tsx`. |

**Done when:** Templates and portal match the demo.

---

## Phase 11: Polish and edge cases

**Objective:** Match fonts, spacing, and edge behaviour so the product feels identical to the demo.

| Step | Task | Reference / Spec |
|------|------|-------------------|
| 11.1 | **Fonts** – Ensure DM Sans is loaded in `index.html` and applied to `body`; no other font overrides unless from the demo. | Demo: `index.html`, `index.css`. |
| 11.2 | **Spacing** – Audit containers: same `padding`, `gap`, `space-y`/`space-x` on sections, cards, forms. Use demo class names (e.g. `px-4`, `py-3`, `gap-3`, `space-y-2`). | Demo: each page and modal. |
| 11.3 | **Responsive** – Same breakpoints and visibility (e.g. login left panel `hidden lg:flex lg:w-[42%]`). Sidebar collapse behaviour and main margin. | Demo: `AppLayout`, `LoginPage`. |
| 11.4 | **Toasts** – Use same toaster (e.g. Sonner) and same success/error messages for create, update, delete. | Demo: modals and pages using `useToast`. |
| 11.5 | **Empty/loading** – If the demo has skeleton or empty states, replicate them. All empty states must be real (no placeholder data). | Demo: relevant pages. |
| 11.6 | **No placeholders** – Audit the app for any remaining fake/demo content (billing, sample cards, dummy copy). Replace with real empty states or remove until real data exists. | Content policy (top of plan). |
| 11.7 | **Accessibility** – Same focus and labels (e.g. `Label` with `htmlFor`, button types). No new interactive elements without keyboard/sr support. | Demo: forms and buttons. |

**Done when:** Visual and behavioural parity with the demo; no obvious spacing or font mismatches; no placeholder content anywhere.

---

## Phase 12: Supabase (last)

**Objective:** Replace in-memory and localStorage with Supabase; keep UI and behaviour unchanged.

| Step | Task | Reference / Spec |
|------|------|-------------------|
| 12.1 | **Supabase project** – Create project; get URL and anon key. Add env vars (e.g. `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). | — |
| 12.2 | **Schema** – Tables for: users (or use Supabase Auth), profiles/settings, client_files, projects, fields, folders, folder_files, note_entries, templates, template_folders. Match `ClientFile`, `Project`, `Field`, `Folder`, `NoteEntry`, `Template` shapes; add RLS. | Demo: `src/data/mockData.ts` types. |
| 12.3 | **Auth** – Replace AuthContext persistence with Supabase Auth (sign in, sign out, session). Keep same login/onboarding UI; optionally store onboarding flag in profile. | Demo: `AuthContext`, login/onboarding flow. |
| 12.4 | **Settings** – Store profile in Supabase (e.g. `profiles` or `settings`); load/save in SettingsProvider. | Demo: `SettingsContext`. |
| 12.5 | **Data** – Replace DataContext in-memory state with Supabase queries/mutations (files, projects, fields, folders, notes, templates). Use same operations (add/update/delete) and keep reference/project number helpers; generate IDs or use DB defaults. | Demo: `DataContext`, `referenceUtils`. |
| 12.6 | **Real-time (optional)** – If you want live updates, subscribe to relevant table changes. | — |

**Done when:** App works with Supabase; UI and flows unchanged from Phase 11.

---

## Checklist summary

- [ ] **Phase 0** – Vite, deps, config, entry, DM Sans; user-facing from day one (0.5).
- [ ] **Phase 1** – Tailwind theme, CSS variables, Button/Badge variants, utils.
- [ ] **Phase 2** – NavLink, AppLayout, route guards; shell ready for user-facing content.
- [ ] **Phase 3** – AuthContext, Login, Onboarding; post-login lands on Dashboard with "where to start".
- [ ] **Phase 4** – SettingsContext, Settings page; no placeholder billing.
- [ ] **Phase 5** – mockData, referenceUtils, DataContext.
- [ ] **Phase 6** – App routes and providers, NotFound; no blank/dev-only routes.
- [ ] **Phase 7** – Dashboard; greeting, stats, "Create file", empty state with clear CTA.
- [ ] **Phase 8** – Files list (empty state), Create file, File page, Share modal.
- [ ] **Phase 9** – Add project, Project page (fields, folders, notes; real empty states).
- [ ] **Phase 10** – Templates (empty state), Client portal.
- [ ] **Phase 11** – Fonts, spacing, responsive, toasts, empty/loading states, no placeholders, a11y.
- [ ] **Phase 12** – Supabase schema, auth, settings, data.

---

## Reference: demo file map

| Area | Demo path |
|------|-----------|
| Entry | `index.html`, `src/main.tsx`, `src/index.css` |
| Config | `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `tsconfig.json`, `components.json` |
| Layout | `src/components/layout/AppLayout.tsx`, `src/components/NavLink.tsx` |
| Context | `src/context/AuthContext.tsx`, `src/context/SettingsContext.tsx`, `src/context/DataContext.tsx` |
| Data | `src/data/mockData.ts`, `src/lib/referenceUtils.ts` |
| UI | `src/components/ui/button.tsx`, `badge.tsx`, plus dialog, input, label, switch, toaster, toast, sonner, tooltip |
| Modals | `src/components/modals/CreateFileModal.tsx`, `AddProjectModal.tsx`, `ShareModal.tsx` |
| Pages | `src/pages/DashboardPage.tsx`, `FilesPage.tsx`, `FilePage.tsx`, `ProjectPage.tsx`, `TemplatesPage.tsx`, `SettingsPage.tsx`, `LoginPage.tsx`, `OnboardingPage.tsx`, `ClientPortal.tsx`, `NotFound.tsx` |
| App | `src/App.tsx` |
| Hooks | `src/hooks/use-toast.ts` (if used) |

Use this plan as the single checklist; implement in order so that fonts, spacing, and edge cases stay aligned with the demo, and Supabase is the last step. From Phase 0 onward: every screen a user can see is user-facing, with a clear "where to start" and no placeholder or dev-only copy (see Content policy and Post-login experience at the top).
