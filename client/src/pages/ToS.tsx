import PageWrapper from "@/components/PageWrapper";
import { motion } from "framer-motion";

export default function ToS() {
  return (
    <PageWrapper>
      <div className="container px-4 max-w-3xl mx-auto py-10 sm:py-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-4xl font-black text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-400 mb-10">Last updated: {new Date().getFullYear()}</p>

          <div className="prose prose-gray max-w-none space-y-8 text-gray-700 leading-relaxed">

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">1. Eligibility (18+)</h2>
              <p>
                Soapies is an adults-only platform. By accessing or using this service you represent and warrant
                that you are at least <strong>18 years of age</strong>. If we become aware that any user is under
                18, we will immediately terminate their account without notice. We reserve the right to request
                proof of age at any time.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">2. Membership</h2>
              <p>
                Soapies is a <strong>private, invite-only community</strong>. Access is granted solely at our
                discretion following an application and interview process. Membership may be revoked at any time
                for any reason. You may not transfer, sell, or share your account or membership status with any
                other person. You are responsible for maintaining the confidentiality of your login credentials.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">3. Conduct</h2>
              <p>All members agree to:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Treat all community members with respect and dignity.</li>
                <li>Obtain clear, enthusiastic consent before any physical or intimate interaction.</li>
                <li>Not harass, stalk, threaten, or intimidate any person on or off the platform.</li>
                <li>Not share other members' personal information, photos, or content outside the platform without explicit consent.</li>
                <li>Not engage in discrimination based on race, gender, sexual orientation, disability, or religion.</li>
                <li>Comply with all applicable local, state, and federal laws.</li>
              </ul>
              <p className="mt-2">
                Violation of these conduct standards may result in immediate account suspension or termination,
                and may be reported to law enforcement where required.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">4. Events</h2>
              <p>
                Event attendance is subject to payment and capacity limitations. Tickets are non-refundable
                unless an event is cancelled by Soapies. You agree to follow all event rules, venue policies,
                and staff instructions. We reserve the right to refuse entry or remove any attendee who violates
                our policies, engages in disruptive behavior, or poses a safety risk. Volunteer tickets require
                fulfillment of duties; failure to do so may result in forfeiture of any credit or refund.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">5. Privacy</h2>
              <p>
                Your use of Soapies is also governed by our{" "}
                <a href="/privacy" className="text-pink-600 underline hover:text-pink-700">Privacy Policy</a>,
                which is incorporated into these Terms by reference. You consent to the collection and processing
                of your personal data as described therein.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">6. Termination</h2>
              <p>
                We may suspend or terminate your account at any time, with or without cause or notice, including
                for violation of these Terms. Upon termination, your right to access the platform ceases
                immediately. You may request deletion of your personal data by contacting us at
                privacy@soapies.events.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">7. Disclaimer of Warranties</h2>
              <p>
                The platform is provided <strong>"as is"</strong> without warranties of any kind, express or
                implied. We do not guarantee uninterrupted access, accuracy of content, or the conduct of other
                members. Your use of the service is at your own risk.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">8. Limitation of Liability</h2>
              <p>
                To the fullest extent permitted by law, Soapies and its operators shall not be liable for any
                indirect, incidental, special, or consequential damages arising from your use of the service,
                including but not limited to personal injury, property damage, or emotional distress.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">9. Governing Law</h2>
              <p>
                These Terms are governed by the laws of the <strong>State of California</strong>, without regard
                to its conflict-of-law provisions. Any disputes shall be resolved exclusively in the state or
                federal courts located in Los Angeles County, California.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">10. Changes to Terms</h2>
              <p>
                We reserve the right to update these Terms at any time. Continued use of the platform after
                changes constitutes acceptance of the revised Terms. We will make reasonable efforts to notify
                members of material changes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-gray-800 mb-3">Contact</h2>
              <p>
                Questions about these Terms? Email us at{" "}
                <a href="mailto:legal@soapies.events" className="text-pink-600 underline">legal@soapies.events</a>.
              </p>
            </section>

          </div>
        </motion.div>
      </div>
    </PageWrapper>
  );
}
