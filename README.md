# V FOODS

V FOODS is a campus food pre-ordering, prepaid digital wallet, and kitchen management platform built for college canteens and festival stalls. It eliminates physical counter lines by letting students load a digital campus wallet, order food ahead of time, and pick up hot meals using instant token and QR passes.

---

## Documentation

Full documentation: see **[docs/00-start-here.md](docs/00-start-here.md)**.

### Master Whitepaper & Architecture
- **[Complete System Guide & Architecture (Markdown)](docs/V_FOODS_COMPLETE_SYSTEM_GUIDE.md)**: Plain-English comprehensive whitepaper with 6 Mermaid architecture diagrams covering campus flow, wallet-first mechanics, KDS, and cloud infrastructure.
- **[Downloadable Printable PDF Guide](docs/V_FOODS_SYSTEM_GUIDE.pdf)**: Formatted, publication-ready vector PDF document ready for offline sharing and print distribution.
- **[Interactive HTML Guide](docs/V_FOODS_SYSTEM_GUIDE.html)**: Styled browser-ready document with printable styling.

### Step-by-Step Learning Path
The `/docs` directory is organized as a step-by-step reading path for anyone new to the project:

- **[00-start-here.md](docs/00-start-here.md)**: Entry point and reading guide
- **[01-what-is-vfoods.md](docs/01-what-is-vfoods.md)**: The campus problem and why V FOODS exists
- **[02-the-four-roles.md](docs/02-the-four-roles.md)**: Super Admin, Shop Owner, Kitchen Staff, and Student roles
- **[03-how-an-order-works.md](docs/03-how-an-order-works.md)**: The end-to-end order and pickup lifecycle
- **[04-the-database.md](docs/04-the-database.md)**: Live tables, outlet connections, RLS security, and money rules
- **[05-tools-used.md](docs/05-tools-used.md)**: Frontend, backend, database, and messaging tools explained simply
- **[06-features.md](docs/06-features.md)**: Catalog of active and retired features
- **[07-payments-phonepe.md](docs/07-payments-phonepe.md)**: The wallet-first payment architecture and PhonePe integration
- **[08-running-it-locally.md](docs/08-running-it-locally.md)**: Local developer setup and environment configuration

---

## Quick Start

```bash
# Frontend (React + Vite)
cd frontend
npm install
npm run dev

# Backend (FastAPI Python)
cd backend
python -m venv venv
.\venv\Scripts\activate  # On macOS/Linux: source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

For full environment variable configuration and dependencies, follow **[docs/08-running-it-locally.md](docs/08-running-it-locally.md)**.
