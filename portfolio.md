---
name: Wil-C
shortDescription: A full-stack PWA for wastewater treatment plant monitoring, automated compliance reporting, and real-time data logging.
video: /wil-c.mp4
tech:
  - React
  - TypeScript
  - Supabase
  - Cloudflare
  - PWA
  - PostgreSQL
features:
  - Dual-portal architecture with role-based access control (RBAC)
  - Installable PWA for field operators with offline capability
  - Custom camera component with Canvas API timestamp watermarking
  - Real-time monitoring dashboard with regulatory compliance alerts
  - Automated PDF report generation via Cloudflare Browser Rendering
  - Scheduled CRON jobs for daily, weekly, or monthly report emails
  - Automatic synchronization of all measurement data to Google Sheets
  - Dynamic timezone auto-detection via browser Intl API
techStack:
  - React (TypeScript)
  - Cloudflare Pages & Workers
  - Supabase (PostgreSQL, Auth, Storage)
  - Cloudflare Puppeteer (@cloudflare/puppeteer)
  - Capacitor
  - Google Sheets API
pages:
  - /login/aquadash
  - /login/operator
  - /dashboard
  - /graphs
  - /input
  - /reports
  - /settings
workflowMermaid: |
  graph TD
    N0["1. Operator opens PWA mobile"]
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

Wil-C is a production-deployed web application designed for wastewater treatment plant operations. It features two dedicated portals: a dark-themed monitoring dashboard for admins and clients, and a light-themed PWA for field operators to input influent and effluent measurements, even in offline environments.

The system enforces regulatory compliance for parameters like BOD, COD, and pH with real-time threshold validation and automated visual alerts. Built on a zero-cost infrastructure stack, it leverages Cloudflare Pages and Workers for high-performance hosting and PDF report generation, while Supabase provides robust PostgreSQL storage, authentication, and real-time syncing capabilities.

To ensure audit-proof operations, the app includes a custom timestamped camera component that embeds location and time metadata directly into lab images. Additionally, it automates administrative overhead by generating scheduled professional PDF reports and mirroring data to Google Sheets for streamlined stakeholder reporting.
