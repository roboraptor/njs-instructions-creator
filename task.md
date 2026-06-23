# InstructionCreator Checklist - Dark Mode Stabilization

- [x] **1. Enable Bootstrap Global Dark Theme**
  - [x] Add `data-bs-theme="dark"` to `<html>` tag in [layout.tsx](file:///c:/projects/njs-instructions-creator/src/app/layout.tsx)
  - [x] Remove conflicting background/foreground color declarations in [globals.css](file:///c:/projects/njs-instructions-creator/src/app/globals.css)
- [x] **2. Fix Text & Component Contrast**
  - [x] Remove/replace `text-dark` visibility overrides in homepage [page.tsx](file:///c:/projects/njs-instructions-creator/src/app/page.tsx)
  - [x] Remove/replace `text-dark` visibility overrides in settings [page.tsx](file:///c:/projects/njs-instructions-creator/src/app/settings/page.tsx)
  - [x] Refine tables and input select styles for optimal visibility in dark mode in [page.tsx](file:///c:/projects/njs-instructions-creator/src/app/settings/page.tsx)
- [x] **3. Quality Assurance**
  - [x] Verify TypeScript types using `npx tsc --noEmit`
  - [x] Verify page visibility and colors manually
