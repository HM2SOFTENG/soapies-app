import { Link } from 'wouter';

export default function ToS() {
  return (
    <div className="min-h-screen bg-black/90 text-white p-6 max-w-3xl mx-auto pt-20">
      <Link to="/" className="text-pink-400 text-sm mb-6 block">← Back</Link>
      <h1 className="text-3xl font-bold mb-8">Terms of Service</h1>
      <p className="text-white/60 text-sm mb-8">Last updated: March 2026</p>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">1. Eligibility</h2>
        <p className="text-white/70">You must be 18 years of age or older to use Soapies. By accessing this platform, you confirm that you meet this requirement. We reserve the right to request age verification at any time.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">2. Membership</h2>
        <p className="text-white/70">Soapies is a private, invite-only community. Membership is granted at our sole discretion following an application review. We may revoke membership at any time for violations of these terms or community guidelines.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">3. Community Conduct</h2>
        <p className="text-white/70">Members agree to treat all participants with respect. Harassment, non-consensual contact, recording without consent, and sharing of other members' personal information are strictly prohibited and may result in immediate removal.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">4. Events</h2>
        <p className="text-white/70">Event tickets are non-refundable unless the event is cancelled. Members must sign any required waivers before attending. Soapies reserves the right to deny entry at the door for any violation of our code of conduct.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">5. Content</h2>
        <p className="text-white/70">By uploading photos or posting on the community wall, you grant Soapies a limited license to display that content to other approved members. You retain ownership of your content.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">6. Termination</h2>
        <p className="text-white/70">We may suspend or terminate your account at any time for violating these terms. You may close your account by contacting us.</p>
      </section>

      <section className="mb-6">
        <h2 className="text-xl font-semibold mb-2">7. Governing Law</h2>
        <p className="text-white/70">These terms are governed by the laws of the State of California, without regard to conflict of law principles.</p>
      </section>

      <p className="text-white/40 text-sm mt-8">Questions? Contact us at legal@soapies.com</p>
    </div>
  );
}
