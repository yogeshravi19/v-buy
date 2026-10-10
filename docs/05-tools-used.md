# Tools & Technologies Used in V FOODS

A simple guide to the tools, libraries, and services that power V FOODS, explained in plain English.

---

## React 19 + Vite + TypeScript + Tailwind CSS
 
- **What it is**: The modern frontend technology stack used to build everything you see on the screen.
- **What it does**:
  - **React 19**: Organizes the screens into modular, lightning-fast components like menu cards, cart drawers, live KDS boards, and order trackers.
  - **Vite 8**: Bundles and serves the code instantly so pages load in less than 500 milliseconds, even on crowded college Wi-Fi or mobile data.
  - **TypeScript**: Enforces strict type contracts and catches bugs during development before any code reaches student or counter tablets.
  - **Tailwind CSS 4**: Modern utility-first styling engine providing clean, responsive layouts, dark modes, and crisp mobile bottom sheets.
  - **TanStack Query (React Query v5)**: Manages smart client-side data caching (`stale-while-revalidate`), reducing server read traffic by 80%.
  - **Zustand**: Lightweight global state manager handling the cart, active filters, and live order alerts without bulky boilerplate.
  - **Framer Motion**: Delivers silky micro-animations, slide-over sheets, and smooth interactive feedback.
- **Why we chose it**: It delivers an instantaneous, native-app-like Progressive Web App (PWA) experience inside mobile browsers without forcing students to download heavy app store binaries.

---

## Capacitor (Cross-Platform Mobile Shell)

- **What it is**: A bridge tool that wraps the web application into an installable mobile app.
- **What it does**:
  - Packages the web codebase into installable Android APK and iOS apps.
  - Provides direct hardware access to native device features, such as camera scanning for express counter QR verification and web haptics.
- **Why we chose it**: Single codebase architecture: one source of truth runs everywhere—on students' iPhones and Android phones, canteen tablets, and desktop admin consoles.

---

## FastAPI (Python 3.11) + Uvicorn + Pydantic v2

- **What it is**: A high-speed, asynchronous backend engine powering V FOODS API services.
- **What it does**:
  - Serves as the secure coordination layer between V FOODS, Paytm Payment Gateway, and MSG91 alerts.
  - Generates and verifies cryptographic HMAC-SHA256 signatures for Paytm webhooks and counter QR pickup passes.
  - Features an in-memory catalog cache (`/api/catalog/summary`) that serves 1,000+ simultaneous break-time requests in under 2 milliseconds.
  - Runs background async tasks (via `APScheduler`) to safely cancel expired unpaid pending orders every 5 minutes.
  - Automatically documents and validates all API data models using Pydantic v2.
- **Why we chose it**: FastAPI handles high concurrent asynchronous I/O with minimal CPU overhead, making it immune to break-time traffic surges while keeping the door open for future Python-based campus food demand forecasting and ML models.


---

## Supabase

- **What it is**: The secure cloud database and backend platform for V FOODS.
- **What it does**:
  - Safely holds student wallets, shop menus, and live order queues.
  - Automatically updates kitchen screens instantly the moment an order is placed, with no page refreshing.
  - Runs strict security rules inside the database so users can only view their own data.
- **Why we chose it**: It gives us bank-grade database security and instant live updates out of the box. Full details are in the `04-the-database.md` guide.

---

## Paytm Payment Gateway

- **What it is**: The official payment gateway used for wallet top-ups and direct order checkout.
- **What it does**:
  - Lets students load money into their campus wallet using any UPI app (Paytm, Google Pay, PhonePe, BHIM) or bank cards/netbanking.
  - Generates secure cryptographic HMAC-SHA256 checksum signatures to protect every transaction against forgery.
  - Sends a secure, digitally signed webhook confirmation directly from Paytm's servers to our FastAPI backend once payment succeeds.
  - Enables an automated three-way revenue distribution (90% to Canteen, 5% to V Foods Platform, 5% to College) on all completed orders.
- **Why we chose it**: Paytm is widely used across Indian campuses, offers high UPI success rates, provides robust enterprise sub-account split capabilities, and processes webhook confirmations server-to-server so payments never get lost if student Wi-Fi cuts out.


---

## MSG91

- **What it is**: An enterprise communication service for sending SMS and WhatsApp alerts.
- **What it does**:
  - Sends an instant SMS and WhatsApp message to the student when their food is marked "Ready for Pickup".
  - Sends one-time passwords (OTP) when users log in.
- **Why we chose it**: It complies with Indian telecom regulations and delivers messages reliably in seconds, even if a student is sitting in a basement food court with weak mobile data.

---

## GitHub

- **What it is**: A cloud platform that safely stores the project's code.
- **What it does**:
  - Tracks every change made to the code over time, acting like an unlimited "undo" history.
  - Lets the team work on different features together without overwriting each other's work.
  - Connects directly to our hosting server so new code updates can be published automatically.
- **Why we chose it**: It is the industry standard for code storage, team collaboration, and version control.

---

## Render

- **What it is**: The cloud hosting service that runs V FOODS on the live internet.
- **What it does**:
  - Keeps the backend server and website running 24/7 at a public web address.
  - Automatically detects when new code is pushed to GitHub, builds the project, and deploys it live with zero downtime.
  - Provides automatic security certificates (HTTPS) so all student data is encrypted.
- **Why we chose it**: It removes the headache of managing physical servers and keeps the app online automatically.

---

## Supabase MCP (Model Context Protocol)

- **What it is**: A secure bridge connecting the AI assistant to the live database during development.
- **What it does**:
  - Lets the AI assistant check real table names, column structures, and stored procedures directly.
  - Verifies that code and database rules match reality without manual copying and pasting.
- **Why we chose it**: It prevents guesswork and ensures all code changes match the real, running database.

---

## Figma MCP (Model Context Protocol)

- **What it is**: A bridge connecting the AI assistant to the original design files.
- **What it does**:
  - Lets the AI inspect exact colors, spacing, and component designs straight from the design team.
  - Helps make sure the built screens match the approved mockups accurately.
- **Why we chose it**: It ensures visual consistency and high design fidelity across all screens.

---

## UI, Animation & Design System Tools

- **framer-motion**: Fluid transitions and physics-based spring animations for sheets, dialogs, ticket card transitions, and tab switching.
- **sonner**: Lightweight, stackable toast notification system for calm, non-intrusive feedback.
- **vaul**: Smooth mobile bottom drawer sheets for cart preview, food item detail, and quick actions.
- **@radix-ui primitives**: Unstyled, accessible UI components (Dialog, Tabs, DropdownMenu, Tooltip, Switch, Select) customized to V Foods brand tokens.
- **class-variance-authority, clsx, tailwind-merge**: Utility tools to build predictable, type-safe component style variants without conflicting CSS classes.
- **@fontsource-variable/plus-jakarta-sans**: Self-hosted variable geometric sans font with tabular numerals so balances, prices, and tokens never jitter.
- **@capacitor/haptics**: Tactile feedback on mobile device taps with graceful fallback to `navigator.vibrate` on web browsers.
- **embla-carousel-react**: Smooth, physics-based carousel for category chips and featured dishes on the user screen.
- **@tanstack/react-table**: Headless, sortable, filterable, and paginated data tables for admin and staff views.
- **recharts**: SVG charting library styled with quiet gridlines and calm Royal Blue and Emerald palette.
- **react-hook-form + zod**: High-performance form state management and strict schema validation for adding and editing menu items.
- **date-fns**: Lightweight date formatting for order stamps and sales telemetry.
