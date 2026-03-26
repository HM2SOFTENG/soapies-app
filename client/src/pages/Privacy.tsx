import PageWrapper from "@/components/PageWrapper";
import { motion } from "framer-motion";

export default function Privacy() {
  return (
    <PageWrapper>
      <div className="container px-4 max-w-3xl mx-auto py-10 sm:py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-4xl font-black text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-400 mb-10">Last updated: {new Date().getFullYear()}</p>

          <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">1. Information We Collect</h2>
              <p>We collect the following categories of personal information:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li><strong>Account data:</strong> name, email address, phone number, date of birth.</li>
                <li><strong>Profile data:</strong> display name, gender, orientation, bio, profile photo, and location.</li>
                <li><strong>Health data (optional):</strong> STI test result URLs submitted voluntarily for event access.</li>
                <li><strong>Event data:</strong> ticket purchases, reservations, attendance history, and feedback.</li>
                <li><strong>Payment data:</strong> Venmo handles or credit transactions (we do not store full payment card numbers).</li>
                <li><strong>Communications:</strong> messages sent within the platform.</li>
                <li><strong>Technical data:</strong> IP address, device type, browser, and usage analytics.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">2. How We Use Your Information</h2>
              <p>We use your information to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Create and manage your account and membership.</li>
                <li>Process event reservations and payments.</li>
                <li>Send transactional communications (booking confirmations, reminders).</li>
                <li>Enforce community safety rules and Terms of Service.</li>
                <li>Improve the platform and user experience.</li>
                <li>Comply with legal obligations.</li>
              </ul>
              <p className="mt-2">
                We do <strong>not</strong> sell your personal information to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">3. Third-Party Services</h2>
              <p>We use the following third-party services that may process your data:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>
                  <strong>SendGrid</strong> — email delivery (booking confirmations, notifications). Data processed:
                  email address, message content.
                </li>
                <li>
                  <strong>Twilio</strong> — SMS notifications. Data processed: phone number, message content.
                </li>
                <li>
                  <strong>Amazon S3</strong> — file and media storage. Data processed: profile photos, uploaded
                  media.
                </li>
              </ul>
              <p className="mt-2">
                Each provider operates under their own privacy policy and data processing agreements. We require
                all third-party processors to maintain appropriate security measures.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">4. Member Photos and Media</h2>
              <p>
                Profile photos and media you upload are stored securely on Amazon S3. They are visible only to
                other approved Soapies members while you have an active account. Photos are <strong>not</strong>{" "}
                indexed by search engines or accessible to the public.
              </p>
              <p className="mt-2">
                You retain ownership of all content you upload. By uploading content, you grant Soapies a limited,
                non-exclusive license to display that content within the platform to other members.
              </p>
              <p className="mt-2">
                <strong>Do not share or screenshot other members' photos</strong> outside the platform. Doing so
                violates our Terms of Service and may result in account termination.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">5. Data Retention</h2>
              <p>
                We retain your personal data for as long as your account is active or as needed to provide
                services. Inactive accounts may be purged after 24 months of inactivity. Certain data may be
                retained longer where required by law.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">6. Your Rights & Deletion</h2>
              <p>You have the right to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li><strong>Access</strong> the personal data we hold about you.</li>
                <li><strong>Correct</strong> inaccurate or incomplete data.</li>
                <li><strong>Delete</strong> your account and associated personal data.</li>
                <li><strong>Portability</strong> — request a copy of your data in a portable format.</li>
                <li><strong>Opt out</strong> of non-transactional marketing communications at any time.</li>
              </ul>
              <p className="mt-2">
                To exercise any of these rights, email us at{" "}
                <a href="mailto:privacy@soapies.events" className="text-pink-600 underline">privacy@soapies.events</a>.
                We will respond within 30 days. Note: deleting your account will remove access to all event
                history and community connections.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">7. Security</h2>
              <p>
                We implement industry-standard security measures including encrypted data transmission (TLS),
                hashed passwords, and access controls. However, no system is completely secure, and we cannot
                guarantee the absolute security of your data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">8. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of significant changes
                via email or in-app notification. Continued use after changes constitutes acceptance.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">Contact</h2>
              <p>
                Privacy questions? Email{" "}
                <a href="mailto:privacy@soapies.events" className="text-pink-600 underline">privacy@soapies.events</a>.
              </p>
            </section>

          </div>
        </motion.div>
      </div>
    </PageWrapper>
  );
}
