---
name: Wil-C
shortDescription: Full-stack PWA for wastewater treatment monitoring with automated compliance reporting and real-time field data logging.
video: /wil-c.mp4
tech:
  - React
  - TypeScript
  - Supabase
  - Cloudflare Workers
  - PWA
  - PostgreSQL
features:
  - Role-based portals with distinct UI themes for Admins, Clients, and Operators
  - Custom in-app camera with baked-in timestamp and parameter metadata
  - Automated PDF report generation via Cloudflare Browser Rendering
  - Real-time monitoring dashboard with visual compliance threshold alerts
  - Scheduled CRON jobs for automated daily, weekly, or monthly email reports
  - Automatic data mirroring to Google Sheets for audit-proof record keeping
  - Mobile-first PWA design for offline-capable field data entry
techStack:
  - React (TypeScript)
  - Cloudflare Workers
  - Cloudflare Pages
  - Supabase (PostgreSQL, Auth, Storage)
  - Cloudflare Browser Rendering (Puppeteer)
  - Google Sheets API
pages:
  - /login/aquadash
  - /login/operator
  - /dashboard
  - /graphs
  - /reports
  - /settings
workflowMermaid: |
  graph TD
    N0["1. Operator opens app mobile"]
    N1["2. Fills in measurement form"]
    N2["parameters: BOD, COD, TSS, pH,"]
    N3["Camera captures lab sample photos"]
    N4["3. Data submitted → saved"]
    N5["4. Admin Client views Wil-C"]
    N6["Dashboard, graphs, alerts update after"]
    N7["5. Reports generated"]
    N8["Manual download anytime"]
    N9["Automated PDF emails — Daily,"]
    N10["6. Data backed up Google"]
    N0 --> N1
    N1 --> N2
    N2 --> N3
    N3 --> N4
    N4 --> N5
    N5 --> N6
    N6 --> N7
    N7 --> N8
    N8 --> N9
    N9 --> N10
---

Wil-C is a production-ready web application built for wastewater treatment plant operations. It provides a dual-portal system: a dark-themed monitoring dashboard for clients and administrators, and a light-themed, mobile-optimized PWA for field operators to log influent and effluent measurements directly from the facility.

The system ensures regulatory compliance by enforcing effluent standards (e.g., BOD, COD, TSS, pH) with real-time threshold validation and automated visual alerts. Built on a zero-cost infrastructure stack, it leverages Cloudflare Workers for API operations and automated PDF report generation, while Supabase provides robust PostgreSQL storage, authentication, and real-time data syncing.

To maintain audit integrity, the app features a custom in-app camera component that bakes location and timestamp metadata directly into lab images. Additionally, it automates administrative workflows by generating scheduled professional PDF reports and mirroring all measurement data to Google Sheets for streamlined stakeholder reporting.
