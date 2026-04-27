import PageWrapper from "@/components/PageWrapper";
import { motion } from "framer-motion";

const LAST_UPDATED = "April 27, 2026";
const CONTACT_EMAIL = "privacy@soapiesplaygrp.club";

export default function Privacy() {
  return (
    <PageWrapper>
      <div className="container px-4 max-w-3xl mx-auto py-10 sm:py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-4xl font-black text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-400 mb-10">Last updated: {LAST_UPDATED}</p>

          <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">
            <section>
              <p>
                This Privacy Policy explains how Soapies ("Soapies," "we," "our," or "us")
                collects, uses, stores, and shares information when you visit
                <strong> soapiesplaygrp.club</strong>, create an account, submit an application,
                participate in platform activities, or use the Soapies website and mobile app.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">1. Information We Collect</h2>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>
                  <strong>Account data:</strong> name, email address, phone number, password hash,
                  and eligibility-related account information.
                </li>
                <li>
                  <strong>Profile data:</strong> display name, bio, photos, location,
                  preferences, and other profile details you choose to provide.
                </li>
                <li>
                  <strong>Application data:</strong> application responses, scheduling,
                  acknowledgements, referral data, and approval status.
                </li>
                <li>
                  <strong>Activity and transaction data:</strong> reservations, ticket history,
                  attendance activity, and payment-related metadata.
                </li>
                <li>
                  <strong>Communications data:</strong> emails, in-app messages, notifications, and
                  SMS message history related to transactional account activity.
                </li>
                <li>
                  <strong>Technical data:</strong> IP address, browser/device information, session
                  activity, logs, and analytics needed to operate and secure the service.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">2. How We Use Information</h2>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Provide and secure the Soapies website, app, and account experience.</li>
                <li>Create and manage accounts, profiles, and platform access.</li>
                <li>Review applications and administer access approvals.</li>
                <li>Process registrations, reservations, and related operational workflows.</li>
                <li>
                  Send transactional communications such as email verification, one-time passcodes,
                  account alerts, scheduling updates, and activity reminders.
                </li>
                <li>Enforce platform standards, investigate misuse, and comply with law.</li>
                <li>Improve product quality, support, reliability, and fraud prevention.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">3. SMS and Messaging Privacy</h2>
              <p>
                If you provide your phone number, we may use it to send transactional text messages such
                as verification codes, login codes, activity reminders, and important account or admin
                notifications.
              </p>
              <p className="mt-2">
                <strong>
                  SMS consent is not shared with third parties or affiliates for third-party marketing or
                  promotional purposes.
                </strong>
              </p>
              <p className="mt-2">
                Message frequency varies by your activity. Message and data rates may apply. You can opt
                out of SMS messages at any time by replying <strong>STOP</strong>, and you can reply
                <strong> HELP</strong> for support where supported.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">4. How Information Is Shared</h2>
              <p>We do not sell your personal information.</p>
              <p className="mt-2">We may share information only in these limited ways:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>
                  <strong>Service providers:</strong> vendors that help operate the platform, such as
                  hosting, storage, email delivery, SMS delivery, analytics, and payment processors.
                </li>
                <li>
                  <strong>Platform operations:</strong> limited internal access by authorized Soapies
                  administrators and support personnel when needed to run the service safely.
                </li>
                <li>
                  <strong>Legal or safety reasons:</strong> if required by law, subpoena, court order, or
                  where necessary to protect users, staff, or the public.
                </li>
                <li>
                  <strong>Business transfers:</strong> in the event of a merger, acquisition, or asset
                  sale involving the service.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">5. Third-Party Services</h2>
              <p>Soapies may rely on third-party providers such as:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li><strong>Twilio</strong> for SMS delivery and phone verification workflows.</li>
                <li><strong>SendGrid</strong> for email delivery and verification emails.</li>
                <li><strong>Cloud or storage providers</strong> for hosting, uploaded photos, and media.</li>
                <li><strong>Payment processors</strong> for platform-related payments where applicable.</li>
              </ul>
              <p className="mt-2">
                Those providers process data under their own terms and privacy policies, subject to their
                role in delivering our services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">6. Data Retention</h2>
              <p>
                We retain personal data for as long as needed to operate the service, maintain platform
                safety, fulfill legal obligations, resolve disputes, and enforce our agreements. We may
                retain limited records after account closure where reasonably necessary for fraud,
                moderation, safety, or compliance purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">7. Your Choices and Rights</h2>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Access, update, or correct certain account information.</li>
                <li>Request deletion of your account and associated personal data, subject to legal or safety exceptions.</li>
                <li>Opt out of SMS by replying STOP where supported.</li>
                <li>Opt out of non-essential email communications through unsubscribe mechanisms when available.</li>
              </ul>
              <p className="mt-2">
                To make a privacy request, email <a href={`mailto:${CONTACT_EMAIL}`} className="text-pink-600 underline">{CONTACT_EMAIL}</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">8. Security</h2>
              <p>
                We use reasonable administrative, technical, and organizational safeguards to protect your
                information. No method of storage or transmission is completely secure, so we cannot
                guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">9. Children</h2>
              <p>
                Soapies is not intended for individuals who do not meet the platform's eligibility
                requirements. We do not knowingly collect personal information from ineligible users in
                connection with the Soapies platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">10. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. When we do, we will update the "Last
                updated" date on this page. Continued use of the service after changes become effective
                means the updated policy applies.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">Contact</h2>
              <p>
                Questions about this Privacy Policy can be sent to{' '}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-pink-600 underline">{CONTACT_EMAIL}</a>.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </PageWrapper>
  );
}
