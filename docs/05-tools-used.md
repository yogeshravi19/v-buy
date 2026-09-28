# Tools & Technologies Used in V FOODS

A simple guide to the tools, libraries, and services that power V FOODS, explained in plain English.

---

## React + Vite + TypeScript + Tailwind CSS

- **What it is**: The software used to build everything you see on the screen.
- **What it does**:
  - **React**: Organizes the screens into reusable building blocks like menu cards, cart drawers, and live order trackers.
  - **Vite**: Bundles the code so pages load in less than a second, even on crowded college Wi-Fi or mobile data.
  - **TypeScript**: Catches spelling and data mistakes before the app is sent to students and shop staff.
  - **Tailwind CSS**: Styles every button, card, and layout cleanly so it looks great on any screen size.
- **Why we chose it**: It creates a fast, app-like experience in any web browser without needing heavy downloads.

---

## Capacitor

- **What it is**: A tool that wraps the web application into an installable mobile app.
- **What it does**:
  - Turns the website into an installable Android APK and iOS app.
  - Gives the app access to device features like camera scanning for QR codes at food counters.
- **Why we chose it**: We only need to write the code once, and it works on web browsers, phones, and counter tablets alike.

---

## FastAPI (Python)

- **What it is**: A lightweight, fast backend engine running on our server.
- **What it does**:
  - Handles secure communication between V FOODS, PhonePe, and SMS services.
  - Verifies digital signatures so nobody can fake a payment or top-up.
  - Triggers automated WhatsApp and SMS notifications when food is ready.
- **Why we chose it**: It is lightweight, fast, and handles thousands of students ordering at the same break time without crashing.

---

## Supabase

- **What it is**: The secure cloud database and backend platform for V FOODS.
- **What it does**:
  - Safely holds student wallets, shop menus, and live order queues.
  - Automatically updates kitchen screens instantly the moment an order is placed, with no page refreshing.
  - Runs strict security rules inside the database so users can only view their own data.
- **Why we chose it**: It gives us bank-grade database security and instant live updates out of the box. Full details are in the `04-the-database.md` guide.

---

## PhonePe

- **What it is**: The official payment gateway used for all student wallet top-ups.
- **What it does**:
  - Lets students load money into their campus wallet using any UPI app (such as PhonePe, Google Pay, or BHIM) or bank cards.
  - Sends a secure, digitally signed confirmation back to our server once money is received.
  - Zero fees on UPI/RuPay so students get 100% of their money credited to their balance.
- **Why we chose it**: PhonePe is the most popular payment app among students and provides direct, reliable UPI settlement. It is used strictly for wallet top-ups; orders themselves are paid directly from the wallet balance.

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
