import { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Camera,
  Download,
  Heart,
  Sparkles,
  Shield,
  Lock,
  Users,
  BookOpen,
  Phone,
  Calendar,
  Gift,
  AlertCircle,
  FlaskConical,
  MapPin,
  Star,
  Zap,
  MessageCircle,
} from "lucide-react";

// ─── GUIDE DATA ────────────────────────────────────────────────────────────

interface GuideStep {
  id: number;
  section: string;
  title: string;
  subtitle?: string;
  content: React.ReactNode;
  icon?: React.ReactNode;
}

const SECTIONS = [
  "Start",
  "Follow & Download",
  "Intro & Community",
  "Safety",
  "Safer Sex",
  "Referral",
  "Events",
  "Next Steps",
] as const;

const GUIDE_STEPS: GuideStep[] = [
  // Step 1: Welcome
  {
    id: 1,
    section: "Start",
    title: "Welcome to Soapies!",
    subtitle: "Thank you for considering playing with our community",
    content: (
      <div className="space-y-6">
        <p className="text-lg text-foreground/80">
          Thank you for considering playing with our community of vetted and sexy people. We're thrilled you're here!
        </p>

        <div className="glass-pink rounded-2xl p-6 space-y-4">
          <p className="font-semibold text-foreground text-center">Please read the following flyers carefully.</p>
          <p className="text-sm text-foreground/70 text-center">
            They contain important info about our community, safety standards, and guidelines.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-6">
          {[
            { label: "Follow & Download", count: "1 step" },
            { label: "Intro & Community", count: "5 flyers" },
            { label: "Safety Guidelines", count: "7 flyers" },
            { label: "Safer Sex", count: "5 flyers" },
            { label: "Referral Program", count: "1 flyer" },
            { label: "Event Schedule", count: "2026" },
            { label: "Text to Join", count: "Final" },
            { label: "What's Ahead", count: "→" },
          ].map((item, idx) => (
            <div
              key={idx}
              className="glass rounded-xl p-3 text-center backdrop-blur-md"
            >
              <p className="text-xs font-semibold text-foreground/70">{item.label}</p>
              <p className="text-sm font-display text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">
                {item.count}
              </p>
            </div>
          ))}
        </div>
      </div>
    ),
  },

  // Step 2: Follow & Download
  {
    id: 2,
    section: "Follow & Download",
    title: "Follow & Download",
    subtitle: "Two quick steps before you dive into the flyers",
    content: (
      <div className="space-y-6">
        {/* Follow Camera */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-3">
            <Camera className="w-5 h-5 text-pink-500" />
            <h3 className="font-semibold text-foreground">Follow on Camera</h3>
          </div>
          <a
            href="https://instagram.com/Soapies_playgroup"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full btn-premium py-3 rounded-xl flex items-center justify-center gap-2 font-semibold"
          >
            <Camera className="w-4 h-4" />
            @Soapies_playgroup
          </a>

          <div className="glass-pink rounded-2xl p-4 space-y-2">
            <p className="font-semibold text-sm text-foreground">Camera Rules</p>
            <ul className="text-sm text-foreground/70 space-y-1">
              <li>• DM "playgroup" to request a follow</li>
              <li>• Do NOT follow other members you haven't met in person</li>
              <li>• Turn on post notifications</li>
            </ul>
          </div>
        </div>

        {/* Download Partiful */}
        <div className="space-y-4 border-t border-border pt-6">
          <div className="flex items-center gap-3 mb-3">
            <Download className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-foreground">Download Partiful</h3>
          </div>
          <p className="text-sm text-foreground/70">
            We use Partiful for all event invites and RSVPs.
          </p>

          <div className="flex gap-3">
            <a
              href="https://apps.apple.com/us/app/partiful/id1500979965"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 glass rounded-xl py-3 font-semibold text-sm text-center hover:bg-primary/10 transition"
            >
              App Store
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.partiful.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 glass rounded-xl py-3 font-semibold text-sm text-center hover:bg-primary/10 transition"
            >
              Google Play
            </a>
          </div>
        </div>
      </div>
    ),
  },

  // Step 3: Welcome to Soapies
  {
    id: 3,
    section: "Intro & Community",
    title: "Welcome to Soapies",
    icon: <Sparkles className="w-6 h-6" />,
    content: (
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="glass-pink rounded-xl p-3">
            <p className="text-2xl font-display text-gradient-static">500+</p>
            <p className="text-xs text-foreground/70 mt-1">Members</p>
          </div>
          <div className="glass-pink rounded-xl p-3">
            <p className="text-2xl font-display text-gradient-static">50+</p>
            <p className="text-xs text-foreground/70 mt-1">Events/Yr</p>
          </div>
          <div className="glass-pink rounded-xl p-3">
            <p className="text-2xl font-display text-gradient-static">3</p>
            <p className="text-xs text-foreground/70 mt-1">Cities</p>
          </div>
        </div>

        <p className="text-foreground/80">
          Soapies is a vetted community of sexy, adventurous people who believe in consent, privacy, and
          connection. We host events across multiple cities with a focus on safety and fun.
        </p>

        <details className="group glass rounded-xl p-4">
          <summary className="cursor-pointer font-semibold text-foreground flex justify-between items-center">
            <span>What We Look For</span>
            <Sparkles className="w-4 h-4 group-open:rotate-180 transition" />
          </summary>
          <div className="mt-3 text-sm text-foreground/70 space-y-2">
            <p>✓ Respectful and consensual attitude</p>
            <p>✓ Understanding of privacy and discretion</p>
            <p>✓ Commitment to community safety</p>
            <p>✓ Openness to diverse expressions of sexuality</p>
          </div>
        </details>
      </div>
    ),
  },

  // Step 4: The Soapies Menu
  {
    id: 4,
    section: "Intro & Community",
    title: "The Soapies Menu",
    icon: <Sparkles className="w-6 h-6" />,
    content: (
      <div className="space-y-4">
        <p className="text-sm text-foreground/70 font-semibold mb-4">Every event has a unique theme and dress code!</p>

        <div className="space-y-3">
          {[
            { name: "House Parties", desc: "Intimate gatherings in beautiful venues with curated vibes" },
            { name: "Sex Raves", desc: "High-energy events with music, dancing, and freedom to play" },
            { name: "Beach Parties", desc: "Seasonal gatherings for sun, sand, and connection" },
            { name: "Vegas House Parties", desc: "Epic multi-day experiences in Las Vegas" },
          ].map((event, idx) => (
            <details key={idx} className="group glass rounded-xl p-3">
              <summary className="cursor-pointer font-semibold text-foreground flex justify-between items-center text-sm">
                <span>{event.name}</span>
                <Sparkles className="w-4 h-4 group-open:rotate-180 transition" />
              </summary>
              <p className="text-xs text-foreground/70 mt-2">{event.desc}</p>
            </details>
          ))}
        </div>
      </div>
    ),
  },

  // Step 5: The Soapies Values
  {
    id: 5,
    section: "Intro & Community",
    title: "The Soapies Values",
    icon: <Heart className="w-6 h-6" />,
    content: (
      <div className="space-y-3">
        {[
          { icon: Heart, title: "Respect & Consent", color: "text-pink-500" },
          { icon: Users, title: "Inclusivity", color: "text-purple-500" },
          { icon: Lock, title: "Privacy", color: "text-rose-500" },
          { icon: Sparkles, title: "Fun & Connection", color: "text-violet-500" },
          { icon: Shield, title: "Safety First", color: "text-indigo-500" },
        ].map((value, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="glass rounded-xl p-4 flex items-start gap-3"
          >
            <value.icon className={`w-5 h-5 flex-shrink-0 ${value.color} mt-1`} />
            <h3 className="font-semibold text-foreground">{value.title}</h3>
          </motion.div>
        ))}
      </div>
    ),
  },

  // Step 6: Communication
  {
    id: 6,
    section: "Intro & Community",
    title: "Communication",
    icon: <Phone className="w-6 h-6" />,
    content: (
      <div className="space-y-4">
        <p className="text-foreground/80 mb-4">How to stay connected with the Soapies community:</p>

        {[
          { icon: Camera, label: "Camera", desc: "@Soapies_playgroup for announcements" },
          { icon: Download, label: "Partiful", desc: "Event invites and RSVP management" },
          { icon: Phone, label: "Text Alerts", desc: "Last-minute event details & surprises" },
        ].map((item, idx) => (
          <div key={idx} className="glass rounded-xl p-4 flex items-start gap-3">
            <item.icon className="w-5 h-5 text-pink-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-foreground">{item.label}</p>
              <p className="text-sm text-foreground/70">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },

  // Step 7: Membership Tiers
  {
    id: 7,
    section: "Intro & Community",
    title: "Membership Tiers",
    icon: <Star className="w-6 h-6" />,
    content: (
      <div className="space-y-3">
        {[
          { name: "Angel", price: "$0", perks: ["Free event access", "Community access"] },
          { name: "Regular", price: "$X", perks: ["Priority access", "Exclusive events", "Member discounts"] },
          { name: "Premium", price: "$X+", perks: ["VIP status", "Private events", "Concierge support"] },
        ].map((tier, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={`rounded-xl p-4 ${
              idx === 0 ? "glass-pink" : "glass border-2 border-pink-300/20"
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-bold text-foreground">{tier.name}</h3>
              <p className="text-sm font-semibold text-primary">{tier.price}</p>
            </div>
            <ul className="text-xs text-foreground/70 space-y-1">
              {tier.perks.map((perk, pidx) => (
                <li key={pidx}>✓ {perk}</li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    ),
  },

  // Step 8: Consent is Everything
  {
    id: 8,
    section: "Safety",
    title: "Consent is Everything",
    icon: <Shield className="w-6 h-6" />,
    content: (
      <div className="space-y-4">
        <div className="glass-pink rounded-2xl p-4 space-y-3">
          <p className="font-semibold text-foreground text-center">The foundation of everything we do</p>
        </div>

        <div className="space-y-3">
          {[
            "Always ask before touching or engaging with someone",
            "Accept 'no' gracefully with zero judgment",
            "Check in regularly—enthusiasm can change",
            "Respect boundaries without question or negotiation",
            "Never pressure or coerce anyone under any circumstances",
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="flex gap-3 items-start"
            >
              <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-foreground/80">{item}</p>
            </motion.div>
          ))}
        </div>
      </div>
    ),
  },

  // Step 9: Photography Policy
  {
    id: 9,
    section: "Safety",
    title: "Photography Policy",
    icon: <AlertCircle className="w-6 h-6" />,
    content: (
      <div className="space-y-4">
        <div className="glass-pink rounded-2xl p-4 text-center">
          <p className="font-semibold text-foreground">No phones or cameras in play areas</p>
        </div>

        <div className="space-y-3 text-sm text-foreground/80">
          <p>We take privacy extremely seriously. This means:</p>
          <ul className="space-y-2 ml-4">
            <li>✗ No phones in play spaces</li>
            <li>✗ No photos or videos without explicit written consent</li>
            <li>✗ No screenshots of attendee lists or photos</li>
            <li>✓ Designated photo areas with consent</li>
            <li>✓ Official event photographer (consent-based)</li>
          </ul>
        </div>

        <div className="glass rounded-xl p-3 border-l-4 border-pink-500">
          <p className="text-xs text-foreground/70">
            <strong>Violation = Immediate Removal</strong> from event and potential permanent ban
          </p>
        </div>
      </div>
    ),
  },

  // Step 10: Privacy & Discretion
  {
    id: 10,
    section: "Safety",
    title: "Privacy & Discretion",
    icon: <Lock className="w-6 h-6" />,
    content: (
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-pink-500/10 to-purple-500/10 rounded-2xl p-4 border border-pink-300/20">
          <p className="font-semibold text-foreground text-center">
            What happens at Soapies stays at Soapies
          </p>
        </div>

        <div className="space-y-3">
          {[
            "Never discuss who attended events",
            "Don't share details about other members' preferences or kinks",
            "Keep all conversations confidential",
            "Respect others' need for anonymity",
            "Our community thrives on trust—break it and you're out",
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: idx * 0.08 }}
              className="flex gap-3 text-sm text-foreground/80"
            >
              <Lock className="w-4 h-4 text-purple-500 flex-shrink-0 mt-0.5" />
              <p>{item}</p>
            </motion.div>
          ))}
        </div>
      </div>
    ),
  },

  // Step 11: Alcohol & Substances
  {
    id: 11,
    section: "Safety",
    title: "Alcohol & Substances",
    icon: <AlertCircle className="w-6 h-6" />,
    content: (
      <div className="space-y-4">
        <div className="glass-pink rounded-2xl p-4">
          <p className="text-sm font-semibold text-foreground text-center">Responsible use only</p>
        </div>

        <div className="space-y-3 text-sm text-foreground/80">
          <div className="glass rounded-xl p-3">
            <p className="font-semibold text-foreground mb-2">✓ What's OK:</p>
            <ul className="space-y-1 ml-3">
              <li>• Moderate alcohol consumption</li>
              <li>• Staying hydrated and taking breaks</li>
              <li>• Communication while sober-ish</li>
            </ul>
          </div>

          <div className="glass rounded-xl p-3 border-l-4 border-rose-500">
            <p className="font-semibold text-foreground mb-2">✗ What's NOT OK:</p>
            <ul className="space-y-1 ml-3">
              <li>• Being intoxicated to the point of impaired consent</li>
              <li>• Using heavy drugs or substances</li>
              <li>• Taking substances without disclosure</li>
            </ul>
          </div>
        </div>

        <p className="text-xs text-foreground/70 italic">
          Remember: Consent requires capacity to give informed consent
        </p>
      </div>
    ),
  },

  // Step 12: Boundaries & Communication
  {
    id: 12,
    section: "Safety",
    title: "Boundaries & Communication",
    icon: <Users className="w-6 h-6" />,
    content: (
      <div className="space-y-4">
        <p className="text-foreground/80">
          Clear communication is the key to amazing experiences and everyone feeling safe.
        </p>

        <div className="space-y-2">
          {[
            { title: "Before Play", items: ["Discuss boundaries", "Share STI status", "Agree on safewords"] },
            {
              title: "During Play",
              items: ["Check in regularly", "Notice body language", "Be ready to pause or stop"],
            },
            {
              title: "After Play",
              items: ["Aftercare & cuddles", "Debrief together", "Process feelings"],
            },
          ].map((section, sidx) => (
            <motion.details
              key={sidx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: sidx * 0.1 }}
              className="group glass rounded-xl p-3"
            >
              <summary className="cursor-pointer font-semibold text-foreground flex justify-between items-center text-sm">
                <span>{section.title}</span>
                <Sparkles className="w-3 h-3 group-open:rotate-180 transition" />
              </summary>
              <ul className="text-xs text-foreground/70 mt-2 space-y-1 ml-3">
                {section.items.map((item, iidx) => (
                  <li key={iidx}>• {item}</li>
                ))}
              </ul>
            </motion.details>
          ))}
        </div>
      </div>
    ),
  },

  // Step 13: Reporting Issues
  {
    id: 13,
    section: "Safety",
    title: "Reporting Issues",
    icon: <AlertCircle className="w-6 h-6" />,
    content: (
      <div className="space-y-4">
        <div className="glass-pink rounded-2xl p-4">
          <p className="font-semibold text-foreground mb-2">Your safety matters</p>
          <p className="text-sm text-foreground/80">
            If something goes wrong, we want to know immediately so we can help and take action.
          </p>
        </div>

        <div className="space-y-3">
          <div className="glass rounded-xl p-4 border-l-4 border-pink-500">
            <p className="font-semibold text-foreground text-sm mb-2">How to Report:</p>
            <ol className="text-sm text-foreground/80 space-y-1 ml-3">
              <li>1. Reach out to an organizer immediately</li>
              <li>2. Text or email with details (stay safe first)</li>
              <li>3. We investigate all reports confidentially</li>
              <li>4. Take appropriate action to protect the community</li>
            </ol>
          </div>

          <p className="text-xs text-foreground/70 italic">
            All reports are taken seriously. Retaliation is not tolerated.
          </p>
        </div>
      </div>
    ),
  },

  // Step 14: Zero Tolerance
  {
    id: 14,
    section: "Safety",
    title: "Zero Tolerance",
    icon: <Shield className="w-6 h-6" />,
    content: (
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-rose-500/10 to-red-500/10 rounded-2xl p-4 border border-rose-300/20">
          <p className="font-semibold text-foreground">We maintain zero tolerance for:</p>
        </div>

        <ul className="space-y-2 text-sm text-foreground/80">
          {[
            "Any form of non-consensual behavior",
            "Sexual harassment or coercion",
            "Discrimination or harassment of any kind",
            "Photography violations",
            "Breaching privacy or discretion",
            "Under the influence inability to consent",
            "Repeated boundary violations",
          ].map((item, idx) => (
            <motion.li
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.06 }}
              className="flex gap-2 items-start"
            >
              <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
              {item}
            </motion.li>
          ))}
        </ul>

        <div className="glass rounded-xl p-3 bg-rose-500/5 border-l-4 border-rose-500">
          <p className="text-xs font-semibold text-foreground">
            Violation = Immediate Removal & Permanent Ban from the community
          </p>
        </div>
      </div>
    ),
  },

  // Step 15: Protection First
  {
    id: 15,
    section: "Safer Sex",
    title: "Protection First",
    icon: <Heart className="w-6 h-6" />,
    content: (
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-green-500/10 to-teal-500/10 rounded-2xl p-4 border border-green-300/20">
          <p className="font-semibold text-foreground">We provide comprehensive protection</p>
        </div>

        <div className="space-y-3">
          <div className="glass rounded-xl p-4">
            <p className="font-semibold text-foreground text-sm mb-3">Available at all events:</p>
            <ul className="text-sm text-foreground/80 space-y-1 ml-3">
              <li>✓ High-quality condoms (multiple types)</li>
              <li>✓ Dental dams and barriers</li>
              <li>✓ Lube (water & silicone-based)</li>
              <li>✓ Gloves & wet wipes</li>
            </ul>
          </div>

          <p className="text-sm text-foreground/80">
            No shame, no judgment. Using protection is the responsibility of everyone and we make it easy.
          </p>
        </div>
      </div>
    ),
  },

  // Step 16: STI Testing
  {
    id: 16,
    section: "Safer Sex",
    title: "STI Testing",
    icon: <FlaskConical className="w-6 h-6" />,
    content: (
      <div className="space-y-4">
        <div className="glass-pink rounded-2xl p-4">
          <p className="font-semibold text-foreground mb-1">Regular testing is expected</p>
          <p className="text-sm text-foreground/70">Everyone in our community tests regularly & discusses status</p>
        </div>

        <div className="space-y-3 text-sm text-foreground/80">
          <div className="glass rounded-xl p-3">
            <p className="font-semibold text-foreground mb-2">Recommended Schedule:</p>
            <p className="text-xs ml-3">• Every 3 months for sexually active members</p>
            <p className="text-xs ml-3">• After new partners or condom breaks</p>
          </div>

          <div className="glass rounded-xl p-3">
            <p className="font-semibold text-foreground mb-2">Before Events:</p>
            <p className="text-xs ml-3">• Know your status</p>
            <p className="text-xs ml-3">• Disclose to partners being intimate with</p>
            <p className="text-xs ml-3">• Be prepared to discuss</p>
          </div>
        </div>

        <p className="text-xs text-foreground/70 italic">Testing is about care—for yourself and your community</p>
      </div>
    ),
  },

  // Step 17: Communication Before Play
  {
    id: 17,
    section: "Safer Sex",
    title: "Communication Before Play",
    icon: <Phone className="w-6 h-6" />,
    content: (
      <div className="space-y-4">
        <p className="text-foreground/80">
          Before any sexual interaction, have an open conversation about:
        </p>

        <div className="space-y-2">
          {[
            { icon: "❓", label: "STI Status", desc: "Be honest about recent testing & any concerns" },
            { icon: "🛡️", label: "Barriers", desc: "What protection will be used (condoms, etc.)" },
            { icon: "🚫", label: "Hard Limits", desc: "What's absolutely off-limits for you" },
            { icon: "📢", label: "Safeword", desc: "A word or signal to pause/stop immediately" },
            { icon: "❤️", label: "Desires", desc: "What each person is excited about" },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="glass rounded-xl p-3"
            >
              <p className="font-semibold text-foreground text-sm">{item.icon} {item.label}</p>
              <p className="text-xs text-foreground/70 mt-1">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    ),
  },

  // Step 18: Resources Available
  {
    id: 18,
    section: "Safer Sex",
    title: "Resources Available",
    icon: <MapPin className="w-6 h-6" />,
    content: (
      <div className="space-y-4">
        <p className="text-foreground/80">We provide information and support for sexual health:</p>

        <div className="space-y-3">
          <details className="group glass rounded-xl p-3">
            <summary className="cursor-pointer font-semibold text-foreground flex justify-between items-center text-sm">
              <span>Local Testing Centers</span>
              <Zap className="w-3 h-3 group-open:rotate-180 transition" />
            </summary>
            <div className="text-xs text-foreground/70 mt-2 space-y-1">
              <p>We share local STI testing clinic information</p>
              <p>Many offer confidential & low-cost testing</p>
            </div>
          </details>

          <details className="group glass rounded-xl p-3">
            <summary className="cursor-pointer font-semibold text-foreground flex justify-between items-center text-sm">
              <span>PrEP Information</span>
              <Zap className="w-3 h-3 group-open:rotate-180 transition" />
            </summary>
            <div className="text-xs text-foreground/70 mt-2 space-y-1">
              <p>Pre-exposure prophylaxis info available</p>
              <p>Ask organizers for resources & recommendations</p>
            </div>
          </details>

          <details className="group glass rounded-xl p-3">
            <summary className="cursor-pointer font-semibold text-foreground flex justify-between items-center text-sm">
              <span>Post-Exposure Prophylaxis</span>
              <Zap className="w-3 h-3 group-open:rotate-180 transition" />
            </summary>
            <div className="text-xs text-foreground/70 mt-2 space-y-1">
              <p>Information about PEP available if needed</p>
              <p>Time-sensitive—reach out immediately if concerned</p>
            </div>
          </details>
        </div>
      </div>
    ),
  },

  // Step 19: Your Health Matters
  {
    id: 19,
    section: "Safer Sex",
    title: "Your Health Matters",
    icon: <Heart className="w-6 h-6" />,
    content: (
      <div className="space-y-4">
        <div className="glass-pink rounded-2xl p-4">
          <p className="font-semibold text-foreground text-center">
            Your sexual health is a community priority
          </p>
        </div>

        <div className="space-y-3 text-sm text-foreground/80">
          <div className="flex gap-3">
            <Heart className="w-5 h-5 text-pink-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">We're all in this together</p>
              <p className="text-xs mt-1">Regular testing + honest communication = healthy community</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Sparkles className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">No judgment, ever</p>
              <p className="text-xs mt-1">STI status doesn't define you or your worth in our community</p>
            </div>
          </div>

          <div className="flex gap-3">
            <Shield className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-foreground">Resources are available</p>
              <p className="text-xs mt-1">Ask organizers about testing, treatment, or prevention info</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  // Step 20: Referral Program
  {
    id: 20,
    section: "Referral",
    title: "Refer Your Friends",
    icon: <Gift className="w-6 h-6" />,
    content: (
      <div className="space-y-6">
        <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl p-4 border border-purple-300/20">
          <p className="font-semibold text-foreground mb-2">Know someone sexy & adventurous?</p>
          <p className="text-sm text-foreground/70">
            Refer them to Soapies and earn rewards when they join!
          </p>
        </div>

        <div className="space-y-3">
          <div className="glass rounded-xl p-4">
            <p className="font-semibold text-foreground text-sm mb-2">How it works:</p>
            <ol className="text-sm text-foreground/70 space-y-2 ml-3">
              <li>1. Refer a friend (must know them personally)</li>
              <li>2. They complete the welcome guide</li>
              <li>3. Both of you get rewards & perks!</li>
            </ol>
          </div>

          <div className="glass rounded-xl p-4 border-l-4 border-pink-500">
            <p className="font-semibold text-foreground text-sm mb-2">Rewards Include:</p>
            <ul className="text-sm text-foreground/70 space-y-1 ml-3">
              <li>✓ Event credits</li>
              <li>✓ Tier upgrades</li>
              <li>✓ Exclusive access</li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },

  // Step 21: Event Schedule
  {
    id: 21,
    section: "Events",
    title: "2026 Event Schedule",
    icon: <Calendar className="w-6 h-6" />,
    content: (
      <div className="space-y-4">
        <p className="text-foreground/80">
          Upcoming events in 2026. Sign up on Partiful after you join!
        </p>

        <div className="space-y-2">
          {[
            { month: "Spring", events: "House Parties, Beach Parties" },
            { month: "Summer", events: "Vegas House Parties, Sex Raves" },
            { month: "Fall", events: "Festival Parties, Intimacy Workshops" },
            { month: "Winter", events: "Holiday Celebrations, New Year Rave" },
          ].map((season, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="glass rounded-xl p-4"
            >
              <p className="font-semibold text-foreground text-sm">{season.month}</p>
              <p className="text-xs text-foreground/70 mt-1">{season.events}</p>
            </motion.div>
          ))}
        </div>

        <div className="glass-pink rounded-2xl p-4 text-center text-sm text-foreground/80">
          <p>New events announced regularly. Turn on Partiful notifications!</p>
        </div>
      </div>
    ),
  },

  // Step 22: Text to Join / You're Ready
  {
    id: 22,
    section: "Next Steps",
    title: "You're Ready!",
    subtitle: "Congratulations on completing the welcome guide",
    content: (
      <div className="space-y-6 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="flex justify-center"
        >
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
            <Check className="w-8 h-8 text-white" />
          </div>
        </motion.div>

        <div>
          <h3 className="font-display text-2xl font-bold text-foreground mb-2">Welcome to Soapies!</h3>
          <p className="text-foreground/70">
            You're now ready to join our amazing community of vetted, consensual, sexy people.
          </p>
        </div>

        <div className="glass-pink rounded-2xl p-6 space-y-3">
          <p className="font-semibold text-foreground">Text to Complete Your Membership:</p>
          <p className="text-4xl font-display text-gradient-static tracking-wider">+1 (555) XXX-XXXX</p>
          <p className="text-sm text-foreground/70">
            Text "PLAYGROUP" to confirm your membership and get added to our community
          </p>
        </div>

        <div className="glass rounded-xl p-4 text-sm text-foreground/80 space-y-2">
          <p className="font-semibold text-foreground">What happens next:</p>
          <ul className="text-xs ml-3">
            <li>✓ We review your submission</li>
            <li>✓ You're added to Partiful invites</li>
            <li>✓ First event invite comes soon!</li>
            <li>✓ Follow Camera for updates</li>
          </ul>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-xs text-foreground/50 italic"
        >
          Questions? DM us on Camera @Soapies_playgroup
        </motion.div>
      </div>
    ),
  },
];

// ─── PROGRESS COMPONENTS ────────────────────────────────────────────────────

function ProgressBar({ current, total }: { current: number; total: number }) {
  const progress = (current / total) * 100;

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-600 origin-left z-50"
      initial={{ scaleX: 0 }}
      animate={{ scaleX: progress / 100 }}
      transition={{ type: "spring", stiffness: 300, damping: 60 }}
    />
  );
}

function SectionNavigation({
  sections,
  currentStep,
  completedSections,
}: {
  sections: typeof SECTIONS;
  currentStep: GuideStep;
  completedSections: Set<string>;
}) {
  const currentSectionIndex = sections.indexOf(currentStep.section as typeof SECTIONS[number]);

  return (
    <div className="sticky top-16 z-40 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="container py-2 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 min-w-max">
          {sections.map((section) => {
            const isActive = section === currentStep.section;
            const isCompleted = completedSections.has(section);

            return (
              <motion.button
                key={section}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "btn-premium text-white"
                    : isCompleted
                      ? "glass text-foreground flex items-center gap-1.5"
                      : "glass text-foreground/60"
                }`}
              >
                {isCompleted && <Check className="w-3 h-3" />}
                {section}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Header({ currentStep, totalSteps }: { currentStep: GuideStep; totalSteps: number }) {
  const sectionIndex =
    SECTIONS.indexOf(currentStep.section as typeof SECTIONS[number]) + 1;

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border"
    >
      <div className="container py-3 sm:py-4 flex items-center justify-between gap-4">
        {/* Logo & Info */}
        <div className="flex items-center gap-3 min-w-0">
          <img
            src="https://d2xsxph8kpxj0f.cloudfront.net/310519663460303717/FfTbhpP94ZvscRd7twWNT6/soapies-logo_cf3c72b2.png"
            alt="Soapies"
            className="h-8 w-auto"
          />
          <div className="min-w-0">
            <h1 className="font-display font-bold text-foreground text-sm sm:text-base truncate">
              Welcome Guide
            </h1>
            <p className="text-xs sm:text-sm text-foreground/60 truncate">
              {currentStep.id} of {totalSteps} • {currentStep.section}
            </p>
          </div>
        </div>

        {/* Text Us Button */}
        <a
          href="sms:+1555XXXXXXX"
          className="hidden sm:flex btn-premium px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap items-center gap-2 flex-shrink-0"
        >
          <Phone className="w-4 h-4" />
          Text Us
        </a>

        {/* Close Button */}
        <button className="p-2 hover:bg-primary/10 rounded-lg transition text-foreground/60 hover:text-foreground flex-shrink-0">
          <X className="w-5 h-5" />
        </button>
      </div>
    </motion.header>
  );
}

// ─── FLOATING BACKGROUND ELEMENTS ───────────────────────────────────────────

function FloatingBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      {/* Large gradient blobs */}
      {[
        { size: 400, top: "10%", left: "10%", color: "oklch(0.75 0.2 340 / 0.1)" },
        { size: 500, top: "60%", right: "5%", color: "oklch(0.55 0.25 310 / 0.08)" },
        { size: 300, bottom: "10%", left: "50%", color: "oklch(0.68 0.22 340 / 0.08)" },
      ].map((blob, idx) => (
        <motion.div
          key={idx}
          className="absolute rounded-full blur-3xl"
          style={{
            width: blob.size,
            height: blob.size,
            top: blob.top,
            left: blob.left,
            right: blob.right,
            bottom: blob.bottom,
            background: blob.color,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 20, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 8 + idx * 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Decorative hearts */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={`heart-${i}`}
          className="absolute text-pink-300/20 text-4xl"
          animate={{
            y: [0, -40, 0],
            rotate: [0, 10, 0],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 5 + i,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.8,
          }}
          style={{
            left: `${15 + i * 20}%`,
            top: `${20 + (i % 3) * 30}%`,
          }}
        >
          ♥
        </motion.div>
      ))}
    </div>
  );
}

// ─── MAIN COMPONENT ────────────────────────────────────────────────────────

export default function WelcomeGuide() {
  const [currentStepId, setCurrentStepId] = useState(1);
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());

  const currentStep = GUIDE_STEPS.find((step) => step.id === currentStepId)!;
  const currentIndex = GUIDE_STEPS.findIndex((step) => step.id === currentStepId);

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < GUIDE_STEPS.length - 1;

  // Mark sections as completed
  useEffect(() => {
    const completed = new Set<string>();
    const currentStepIndex = GUIDE_STEPS.findIndex(
      (s) => s.section === currentStep.section
    );

    GUIDE_STEPS.slice(0, currentStepIndex + 1).forEach((step) => {
      completed.add(step.section);
    });

    setCompletedSections(completed);
  }, [currentStepId, currentStep.section]);

  const handleNext = useCallback(() => {
    if (canGoNext) setCurrentStepId((id) => id + 1);
  }, [canGoNext]);

  const handlePrev = useCallback(() => {
    if (canGoPrev) setCurrentStepId((id) => id - 1);
  }, [canGoPrev]);

  const stepsInSection = useMemo(
    () =>
      GUIDE_STEPS.filter((step) => step.section === currentStep.section),
    [currentStep.section]
  );

  const currentStepIndexInSection = stepsInSection.findIndex(
    (step) => step.id === currentStepId
  );

  return (
    <div className="min-h-screen bg-background">
      <FloatingBackground />
      <ProgressBar current={currentStepId} total={GUIDE_STEPS.length} />

      <Header currentStep={currentStep} totalSteps={GUIDE_STEPS.length} />
      <SectionNavigation
        sections={SECTIONS}
        currentStep={currentStep}
        completedSections={completedSections}
      />

      {/* Main Content */}
      <main className="container py-6 sm:py-8 pb-32 relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStepId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Card Container */}
            <motion.div
              className="relative"
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {/* Glow Background */}
              <div
                className="absolute -inset-6 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity"
                style={{
                  background: "radial-gradient(circle, oklch(0.75 0.2 340 / 0.2), transparent 70%)",
                  filter: "blur(20px)",
                }}
              />

              {/* Main Card */}
              <div className="relative card-premium rounded-3xl p-6 sm:p-8 space-y-6 border-2 border-pink-300/20">
                {/* Step Badge */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">
                      {currentStep.section} • Step {currentStepIndexInSection + 1} of{" "}
                      {stepsInSection.length}
                    </div>
                    <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground mb-2">
                      {currentStep.title}
                    </h2>
                    {currentStep.subtitle && (
                      <p className="text-foreground/70 text-lg">{currentStep.subtitle}</p>
                    )}
                  </div>

                  {currentStep.icon && (
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", delay: 0.2 }}
                      className="text-pink-500/30 flex-shrink-0"
                    >
                      {currentStep.icon}
                    </motion.div>
                  )}
                </div>

                {/* Content */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="prose prose-sm max-w-none"
                >
                  {currentStep.content}
                </motion.div>

                {/* Flyer Thumbnails */}
                {stepsInSection.length > 1 && (
                  <div className="border-t border-border pt-4 mt-4">
                    <p className="text-xs font-semibold text-foreground/60 uppercase mb-3">
                      Steps in this section
                    </p>
                    <div className="flex gap-2 overflow-x-auto no-scrollbar">
                      {stepsInSection.map((step, idx) => (
                        <motion.button
                          key={step.id}
                          onClick={() => setCurrentStepId(step.id)}
                          className={`flex-shrink-0 w-12 h-12 rounded-lg font-display font-bold text-xs transition-all ${
                            step.id === currentStepId
                              ? "btn-premium text-white ring-2 ring-pink-500/50"
                              : "glass text-foreground/70 hover:text-foreground"
                          }`}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {idx + 1}
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation & Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex gap-3 items-center justify-between mt-8"
        >
          <motion.button
            onClick={handlePrev}
            disabled={!canGoPrev}
            className={`p-3 rounded-xl transition-all ${
              canGoPrev
                ? "glass hover:bg-primary/10 text-foreground"
                : "glass text-foreground/30 cursor-not-allowed"
            }`}
            whileHover={canGoPrev ? { scale: 1.05 } : {}}
            whileTap={canGoPrev ? { scale: 0.95 } : {}}
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>

          <div className="flex items-center gap-2">
            <div className="h-1 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex-1 flex gap-1 p-0.5">
              {GUIDE_STEPS.map((_, idx) => (
                <motion.div
                  key={idx}
                  className={`flex-1 h-full rounded-full ${
                    idx < currentStepId ? "bg-white" : "bg-white/30"
                  }`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                />
              ))}
            </div>
          </div>

          <motion.button
            onClick={handleNext}
            disabled={!canGoNext}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
              canGoNext
                ? "btn-premium text-white"
                : "glass text-foreground/50 cursor-not-allowed"
            }`}
            whileHover={canGoNext ? { scale: 1.05, gap: "12px" } : {}}
            whileTap={canGoNext ? { scale: 0.95 } : {}}
          >
            {currentStepId === GUIDE_STEPS.length ? "Complete" : "Continue"}
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </motion.div>
      </main>

      {/* Floating Decorations */}
      <motion.div
        className="fixed bottom-20 right-10 text-6xl opacity-10 pointer-events-none"
        animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
      >
        ✨
      </motion.div>
    </div>
  );
}
