import { Link } from 'react-router-dom'
import WaterBubbles from '../../components/landing/WaterBubbles'

const PRIVACY_EMAIL = 'noreply@ortuma.site'
const LAST_UPDATED = 'July 20, 2026'

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-10">
    <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">{title}</h2>
    <div className="text-slate-300 leading-relaxed space-y-3">{children}</div>
  </section>
)

const PrivacyPolicyPage = () => {
  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-900 px-4 py-16">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <WaterBubbles />
      </div>

      <Link to="/" className="absolute top-6 left-6 text-sm text-slate-400 hover:text-teal-400 flex items-center gap-1 transition-colors z-10">
        ← Back to Home
      </Link>

      <div className="relative z-10 w-full max-w-3xl mx-auto">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-8 sm:p-12 shadow-2xl">
          <div className="mb-10">
            <img src="/Official Header logo.png" alt="Logo" className="h-16 w-auto mb-6" />
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Privacy Policy</h1>
            <p className="text-sm text-slate-400">Last updated: {LAST_UPDATED}</p>
          </div>

          <Section title="1. Who we are">
            <p>
              Wil-C (the "Service") is a wastewater treatment plant monitoring system operated by Ortuma.
              The Service lets plant operators log influent and effluent readings, view dashboards and
              alerts, and generate compliance reports. We are based in the Philippines.
            </p>
          </Section>

          <Section title="2. Data we collect">
            <p>We collect the following information when you use the Service:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <span className="text-white font-medium">Account information:</span> your email address,
                a password (stored only as a secure hash by our authentication provider), and the full
                name you provide at signup. Your role (Admin, Operator, or Client) is assigned to your account.
              </li>
              <li>
                <span className="text-white font-medium">Plant and company information:</span> the company
                name, treatment plant name, and a free-text plant location you or your administrator enter.
              </li>
              <li>
                <span className="text-white font-medium">Wastewater readings:</span> the measurement values
                you submit for each parameter (pH, Chemical Oxygen Demand, Biological Oxygen Demand, Total
                Suspended Solids, Ammonia, Nitrate, Phosphate, Temperature, and Flow), the influent/effluent
                type, the reading timestamp, and any free-text notes. Each reading is linked to the operator
                who submitted it.
              </li>
              <li>
                <span className="text-white font-medium">Field photos:</span> photos taken in the app with
                your device camera and attached to a measurement. These images are stored and, where configured,
                included in generated reports. The app stamps the date, time, and timezone onto each photo but
                does <span className="text-white font-medium">not</span> read or store GPS or location data from
                your device.
              </li>
              <li>
                <span className="text-white font-medium">Alerts:</span> automated records created when a
                submitted reading exceeds a defined limit.
              </li>
              <li>
                <span className="text-white font-medium">Report recipients:</span> email addresses you or your
                administrator add to receive scheduled compliance reports.
              </li>
            </ul>
            <p>
              We do <span className="text-white font-medium">not</span> collect your device IP address, GPS
              location, browser fingerprint, or payment information. We do not use advertising or analytics
              trackers. The only cookie used is the session cookie set by our authentication provider to keep
              you signed in.
            </p>
          </Section>

          <Section title="3. How we use your data">
            <ul className="list-disc pl-6 space-y-2">
              <li>To create and secure your account and keep you signed in.</li>
              <li>To store, display, and report the wastewater readings and photos you submit.</li>
              <li>To generate compliance dashboards, alerts, and PDF/email reports.</li>
              <li>To send transactional emails (account confirmation and scheduled reports) to the addresses you provide.</li>
            </ul>
          </Section>

          <Section title="4. Where your data is stored and who processes it">
            <p>Your data is stored and processed by the following service providers:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <span className="text-white font-medium">Supabase</span> — hosts our PostgreSQL database,
                authentication, and the storage bucket that holds your field photos.
              </li>
              <li>
                <span className="text-white font-medium">Resend</span> — sends the confirmation and report
                emails on our behalf. Resend receives the recipient email addresses and the report content
                (which may include plant names and measurement values).
              </li>
              <li>
                <span className="text-white font-medium">Cloudflare</span> — hosts the web application and the
                API that power the Service.
              </li>
            </ul>
            <p>
              These providers may process data outside the Philippines. We rely on their standard technical and
              organizational measures to protect it. An optional Google Sheets backup may also be enabled by the
              operator, in which case readings would be copied to a Google Sheets document controlled by the account owner.
            </p>
          </Section>

          <Section title="5. Your rights and how to exercise them">
            <p>
              Because we are based in the Philippines, personal data handled through the Service is subject to the
              Philippine Data Privacy Act of 2012 (Republic Act 10173). You have the right to be informed, to access
              your data, to correct it, to object to or restrict its processing, and to request erasure of your
              personal data.
            </p>
            <p>
              To request a copy of your data (export) or to request deletion of your account and associated data,
              email us at <a href={`mailto:${PRIVACY_EMAIL}`} className="text-teal-400 hover:text-teal-300">{PRIVACY_EMAIL}</a>.
              We will verify your identity and act on verifiable requests within a reasonable time. Note that during
              the beta period, some data may already have been reset or removed as described in our Terms of Service.
            </p>
          </Section>

          <Section title="6. Data retention">
            <p>
              We keep your account and measurement data for as long as your account is active. You may request
              deletion at any time (see Section 5). Because the Service is currently in beta, data may be reset
              or removed without notice — we recommend you do not rely on it as your only record of compliance data.
            </p>
          </Section>

          <Section title="7. Contact us">
            <p>
              Questions about this Privacy Policy or how your data is handled can be sent to{' '}
              <a href={`mailto:${PRIVACY_EMAIL}`} className="text-teal-400 hover:text-teal-300">{PRIVACY_EMAIL}</a>.
            </p>
          </Section>

          <div className="pt-6 border-t border-slate-700">
            <Link to="/" className="text-sm text-teal-400 hover:text-teal-300 transition-colors">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicyPage
