import { Link } from 'react-router-dom'
import WaterBubbles from '../../components/landing/WaterBubbles'

const PRIVACY_EMAIL = 'wilc.privacy@ortuma.site'
const LAST_UPDATED = 'July 20, 2026'

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-10">
    <h2 className="text-xl sm:text-2xl font-semibold text-white mb-4">{title}</h2>
    <div className="text-slate-300 leading-relaxed space-y-3">{children}</div>
  </section>
)

const TermsOfServicePage = () => {
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
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Terms of Service</h1>
            <p className="text-sm text-slate-400">Last updated: {LAST_UPDATED}</p>
          </div>

          <Section title="1. What the Service is">
            <p>
              Wil-C (the "Service") is a web and mobile application that lets wastewater treatment plant
              operators log influent and effluent parameter readings (pH, Chemical Oxygen Demand, Biological
              Oxygen Demand, Total Suspended Solids, Ammonia, Nitrate, Phosphate, Temperature, and Flow), view
              dashboards and alerts, and generate compliance reports (including scheduled PDF/email reports)
              against Class C effluent standards.
            </p>
          </Section>

          <Section title="2. Beta status">
            <p>
              The Service is provided as a <span className="text-white font-medium">beta product</span>. This means:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Features, appearance, and behavior may change at any time without notice.</li>
              <li>Data may be modified, reset, or deleted as we improve the product. <span className="text-white font-medium">Do not treat the Service as your sole or authoritative record of compliance data.</span></li>
              <li>Uptime, availability, and performance are <span className="text-white font-medium">not guaranteed</span>. The Service may be unavailable or contain bugs.</li>
            </ul>
          </Section>

          <Section title="3. Not a substitute for official compliance">
            <p>
              The Service is a tool that assists with the <span className="text-white font-medium">tracking and reporting</span> of
              wastewater parameters against Class C standards. It does <span className="text-white font-medium">not</span> replace:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Official laboratory certification or testing of samples;</li>
              <li>The sign-off of a licensed or qualified treatment plant operator; or</li>
              <li>Any government inspection, permit, or regulatory submission requirement.</li>
            </ul>
            <p>
              You remain <span className="text-white font-medium">fully responsible</span> for your own regulatory compliance, for the
              accuracy of the data you enter, and for meeting all applicable legal and permit obligations. Any
              report produced by the Service is for your internal use and reference only.
            </p>
          </Section>

          <Section title="4. Accounts and acceptable use">
            <ul className="list-disc pl-6 space-y-2">
              <li>You must provide accurate account information and keep your credentials confidential.</li>
              <li>You agree to use the Service lawfully and only for its intended purpose of wastewater monitoring and reporting.</li>
              <li>You will not attempt to disrupt, reverse-engineer, or misuse the Service or the data of others.</li>
              <li>We reserve the right to suspend or terminate any account at our discretion, including for misuse, suspected fraud, or failure to comply with these terms.</li>
              <li>During the beta period we make no guarantee that your data will be preserved, and account termination may result in loss of stored data.</li>
            </ul>
          </Section>

          <Section title="5. Limitation of liability">
            <p>
              The Service is provided on an <span className="text-white font-medium">"as is" and "as available"</span> basis, without
              warranties of any kind, express or implied, including any warranty of accuracy, reliability,
              merchantability, or fitness for a particular purpose. To the maximum extent permitted by law,
              Ortuma and its operators shall not be liable for any indirect, incidental, special, or consequential
              damages, or for any loss arising from your use of, or inability to use, the Service — including any
              compliance, regulatory, or financial consequences. You use the Service at your own risk.
            </p>
          </Section>

          <Section title="6. Changes to these terms">
            <p>
              We may update these Terms of Service from time to time. When we make material changes, we will
              post the updated version on this page and update the "Last updated" date above. Continued use of the
              Service after changes are posted constitutes your acceptance of the revised terms.
            </p>
          </Section>

          <Section title="7. Contact">
            <p>
              Questions about these Terms can be sent to{' '}
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

export default TermsOfServicePage
