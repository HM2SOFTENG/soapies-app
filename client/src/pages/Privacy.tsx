import { Link } from 'wouter';

export default function Privacy() {
  return (
    <div className="min-h-screen bg-black/90 text-white p-6 max-w-3xl mx-auto pt-20">
      <Link to="/" className="text-pink-400 text-sm mb-6 block">← Back</Link>
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>
      <p className="text-white/60 text-sm mb-8">Last updated: March 2026</p>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">1. Data We Collect</h2>
        <p className="text-white/70">We collect information you provide directly, including your name, email address, phone number, date of birth, and profile photos. We also collect usage data such as pages visited, events attended, and interactions within the platform. Device information (IP address, browser type, operating system) is collected automatically when you use Soapies.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">2. How We Use It</h2>
        <p className="text-white/70">We use your information to operate and improve the Soapies platform, process event registrations and ticket purchases, send you important communications about your account and events, verify your identity and age, and enforce our community guidelines. We do not sell your personal data to third parties.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">3. Third Parties</h2>
        <p className="text-white/70">We work with trusted service providers to deliver our platform:</p>
        <ul className="mt-2 space-y-1 text-white/70 list-disc list-inside">
          <li><strong>SendGrid</strong> — Used to deliver transactional and marketing emails. Your email address is shared to facilitate delivery.</li>
          <li><strong>Twilio</strong> — Used for SMS verification and notifications. Your phone number is shared to facilitate message delivery.</li>
          <li><strong>Amazon S3</strong> — Used to store profile photos and event media. Images you upload are stored securely in our S3 buckets.</li>
        </ul>
        <p className="text-white/70 mt-2">Each of these providers is contractually obligated to handle your data in accordance with applicable privacy laws.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">4. Data Retention</h2>
        <p className="text-white/70">We retain your personal data for as long as your account is active or as needed to provide services. If you close your account, we will delete or anonymize your personal information within 90 days, except where we are required by law to retain it longer. Event transaction records may be retained for up to 7 years for legal and financial compliance.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">5. Your Rights</h2>
        <p className="text-white/70">Depending on your jurisdiction, you may have the right to access, correct, or delete your personal data. California residents have additional rights under the CCPA, including the right to know what data we collect and to opt out of certain data sharing. To exercise your rights, contact us at the email below.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">6. Contact</h2>
        <p className="text-white/70">If you have questions about this Privacy Policy or how we handle your data, please contact us at <a href="mailto:privacy@soapies.com" className="text-pink-400 hover:underline">privacy@soapies.com</a>.</p>
      </section>

      <p className="text-white/40 text-sm mt-8">&copy; {new Date().getFullYear()} Soapies. All rights reserved.</p>
    </div>
  );
}
