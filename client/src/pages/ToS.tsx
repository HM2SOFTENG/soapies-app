import PageWrapper from "@/components/PageWrapper";
import { motion } from "framer-motion";

const LAST_UPDATED = "April 27, 2026";
const SUPPORT_EMAIL = "support@soapiesplaygrp.club";

export default function ToS() {
  return (
    <PageWrapper>
      <div className="container px-4 max-w-3xl mx-auto py-10 sm:py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-4xl font-black text-gray-900 mb-2">Terms &amp; Conditions</h1>
          <p className="text-sm text-gray-400 mb-10">Last updated: {LAST_UPDATED}</p>

          <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">
            <section>
              <p>
                These Terms &amp; Conditions govern your access to and use of Soapies,
                including the website at <strong>soapiesplaygrp.club</strong>, any related mobile
                applications, user communications, and Soapies-operated platform workflows.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">1. Eligibility</h2>
              <p>
                By using the service, you represent that you meet the platform's eligibility
                requirements and are legally able to agree to these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">2. Accounts and Access</h2>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>You must provide accurate information when creating an account or applying.</li>
                <li>You are responsible for keeping your login credentials confidential.</li>
                <li>You may not transfer, sell, or share your account with another person.</li>
                <li>
                  Soapies may deny, suspend, or revoke account access at its discretion,
                  including for safety, conduct, fraud, or policy reasons.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">3. Platform Conduct</h2>
              <p>By using Soapies, you agree to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Treat other users, staff, and support personnel respectfully.</li>
                <li>Respect boundaries, privacy, and platform safety rules.</li>
                <li>Not harass, threaten, stalk, impersonate, dox, or intimidate anyone.</li>
                <li>Not share user content, private information, or photos without permission.</li>
                <li>Not use the service for unlawful, abusive, discriminatory, or fraudulent activity.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">4. Activities, Reservations, and Access</h2>
              <p>
                Platform participation may be subject to approval, availability, pricing, venue rules,
                and additional activity-specific requirements. Soapies may cancel,
                reschedule, deny access, or remove participants when necessary for safety, operational, or
                policy reasons.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">5. SMS Program Terms</h2>
              <p>
                If you provide your mobile number and consent to receive texts, Soapies may send
                transactional SMS messages including one-time passcodes, account verification messages,
                important account notices, and activity reminders.
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li><strong>Program name:</strong> Soapies SMS Notifications</li>
                <li><strong>Message frequency:</strong> varies based on account activity and platform activity</li>
                <li><strong>Message and data rates:</strong> may apply</li>
                <li><strong>Opt out:</strong> reply <strong>STOP</strong> to unsubscribe where supported</li>
                <li><strong>Help:</strong> reply <strong>HELP</strong> or email <a href={`mailto:${SUPPORT_EMAIL}`} className="text-pink-600 underline">{SUPPORT_EMAIL}</a></li>
              </ul>
              <p className="mt-2">
                Consent to receive SMS messages is not a condition of purchase. SMS messages are intended
                for transactional account and platform operations purposes, not unsolicited third-party
                marketing.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">6. Privacy</h2>
              <p>
                Your use of Soapies is also governed by our{' '}
                <a href="/privacy-policy" className="text-pink-600 underline hover:text-pink-700">
                  Privacy Policy
                </a>
                , which explains how we collect, use, and protect your information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">7. Intellectual Property and Content</h2>
              <p>
                The Soapies platform, branding, design, and service content are owned by Soapies or its
                licensors. You retain ownership of content you submit, but you grant Soapies a limited,
                non-exclusive license to host, store, display, and process that content as needed to
                operate the service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">8. Termination</h2>
              <p>
                We may suspend or terminate access to the service at any time if we believe a user has
                violated these Terms, endangered other users, misused the service, or created legal or
                operational risk.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">9. Disclaimers</h2>
              <p>
                The service is provided on an <strong>"as is"</strong> and <strong>"as available"</strong>{' '}
                basis. We do not guarantee uninterrupted availability, error-free operation, or the conduct
                of any user, guest, venue, or third party.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">10. Limitation of Liability</h2>
              <p>
                To the fullest extent permitted by law, Soapies and its operators are not liable for any
                indirect, incidental, special, consequential, or punitive damages arising out of or related
                to your use of the service, participation in platform activities, or reliance on platform content.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">11. Governing Law</h2>
              <p>
                These Terms are governed by the laws of the State of California, without regard to conflict
                of law principles.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">12. Changes to These Terms</h2>
              <p>
                We may update these Terms &amp; Conditions from time to time. Changes become effective when
                posted on this page unless otherwise stated.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">Contact</h2>
              <p>
                Questions about these Terms can be sent to{' '}
                <a href={`mailto:${SUPPORT_EMAIL}`} className="text-pink-600 underline">{SUPPORT_EMAIL}</a>.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </PageWrapper>
  );
}
