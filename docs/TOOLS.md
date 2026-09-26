# Technology Stack & Tooling

## React + Vite + TypeScript + Tailwind CSS
- **Usage**: Web application interface for students, shop staff, shop admins, and super admins.
- **Why Chosen**:
  - Vite provides sub-second HMR and optimized asset bundling for fast campus mobile networks.
  - React component hierarchy cleanly models live-updating order steppers, cart docks, and real-time counter KDS queues.
  - TypeScript ensures strict contract validation across order structures and wallet transaction states.
  - Tailwind / utility styling delivers a consistent, zero-runtime UI system tailored to mobile viewports.
  - Chosen over Next.js/SSR because V-BUY runs as an authenticated single-page PWA and Capacitor mobile shell where server-side rendering adds unnecessary deployment overhead.

## Capacitor
- **Usage**: Native runtime wrapper packaging the web frontend into Android/iOS APK and IPA binaries.
- **Why Chosen**:
  - Allows single-codebase maintenance across web browsers, campus kiosks, and mobile app stores.
  - Direct hardware access for camera (QR scanning for order collection) and native push notification bridges.
  - Chosen over React Native or Flutter because existing web components, PWA service workers, and responsive layouts deploy directly without rewriting the UI layer.

## FastAPI (Python)
- **Usage**: Backend API handling secure payment gateway callbacks, webhook signature verification, and external integrations (PhonePe, MSG91).
- **Why Chosen**:
  - High-throughput asynchronous request handling (`async`/`await`) essential for high-concurrency payment callback verification during peak lunch/break rushes.
  - Native Pydantic data validation ensures payload integrity for monetary calculations and cryptographic SHA-256 signature verifications.
  - Chosen over Django because Django's heavy ORM and synchronous default architecture add unnecessary latency and footprint for a microservice where Supabase handles database-level operations.

## Supabase & PostgreSQL
- **Usage**: Primary relational database, Row-Level Security (RLS) enforcement, user authentication, and WebSockets (Realtime) order event streaming.
- **Why Chosen**:
  - PostgreSQL stored procedures and ACID transactions guarantee atomic wallet debits (`credit_wallet`, `place_order_wallet`) preventing double-spending and negative balances under high concurrency.
  - Supabase Realtime delivers instant order ticket dispatch to kitchen KDS screens via WebSockets without polling.
  - Chosen over Firebase Firestore because NoSQL document stores lack native ACID transactional integrity for financial ledgers, require complex client-side security rules, and do not offer atomic SQL row locks (`FOR UPDATE`).

## PhonePe
- **Usage**: Primary payment gateway for student wallet top-ups via UPI.
- **Why Chosen**:
  - Offers a 0% MDR tier for peer-to-merchant UPI transactions, avoiding standard 2% payment gateway deductions on student food purchases.
  - Deep penetration among college students with instant intent-flow launches on Android and iOS.
  - Chosen over standard Razorpay/Paytm payment gateways due to lower transaction overhead and faster direct UPI settlement rails.

## MSG91
- **Usage**: Transactional SMS and OTP communications (order status alerts, ready-for-pickup notifications, mobile login OTP verification).
- **Why Chosen**:
  - Reliable high-throughput DLT-compliant SMS routing across Indian telecom networks with minimal delivery latency.
  - Dedicated campus transactional routing ensures students receive "Order Ready" alerts even when mobile data is spotty inside basement food courts.
  - Chosen over Twilio due to superior Indian telecom DLT compliance support, lower domestic per-SMS pricing, and lower delivery failure rates.

## Render
- **Usage**: Cloud deployment and hosting platform for the frontend static site/PWA and FastAPI backend service.
- **Why Chosen**:
  - Native Infrastructure as Code support via `render.yaml` blueprint syncing frontend and backend environments automatically from Git commits.
  - Built-in TLS certificates, global CDN edge caching, and zero-downtime rolling deployments on `git push`.
  - Chosen over AWS/GCP bare VMs for lower maintenance overhead, automated preview builds, and predictable container management for campus scale.
