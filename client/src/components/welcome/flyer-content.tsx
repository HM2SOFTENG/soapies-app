import React, { useState, useCallback, useEffect, createContext, useContext, useRef } from "react"
import {
  Users, Utensils, MessageCircle, Heart, Star, Eye, Shield, Hand, Beer, Sparkles,
  Ban, AlertTriangle, UserX, TestTube, Clock, Pill, FileText, Phone, Instagram,
  Gift, DollarSign, CheckCircle2, XCircle, Lock, ChevronDown, Zap, MapPin, Music, Sun, Dice5,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

// --- Expand tracking context ---

type ExpandContextValue = {
  register: (id: string) => void
  markOpened: (id: string) => void
}

const ExpandContext = createContext<ExpandContextValue | null>(null)

export function useExpandGate() {
  const registeredRef = useRef<Set<string>>(new Set())
  const openedRef = useRef<Set<string>>(new Set())
  // Only triggers a parent re-render when ALL cards are finally opened.
  // Individual card opens do NOT cause parent re-renders.
  const [allDone, setAllDone] = useState(false)

  const register = useCallback((id: string) => {
    registeredRef.current.add(id)
  }, [])

  const markOpened = useCallback((id: string) => {
    if (openedRef.current.has(id)) return
    openedRef.current.add(id)
    const t = registeredRef.current.size
    const o = openedRef.current.size
    if (t > 0 && o >= t) {
      setAllDone(true) // single re-render only when complete
    }
  }, [])

  const allExpanded = allDone || registeredRef.current.size === 0

  const reset = useCallback(() => {
    registeredRef.current = new Set()
    openedRef.current = new Set()
    setAllDone(false)
  }, [])

  // Stable ref so the context value object identity never changes
  const contextValueRef = useRef({ register, markOpened })

  return { register, markOpened, allExpanded, reset, contextValue: contextValueRef.current }
}

export function ExpandProvider({ value, children }: { value: ExpandContextValue; children: ReactNode }) {
  return <ExpandContext.Provider value={value}>{children}</ExpandContext.Provider>
}

/** Stable wrapper for flyer content that won't re-mount when parent re-renders.
 *  React.memo prevents re-render unless flyerId changes.
 */
export const FlyerContentBody = React.memo(function FlyerContentBody({
  flyerId,
  contextValue,
}: {
  flyerId: string
  contextValue: ExpandContextValue
}) {
  const flyerContent = getFlyerContent(flyerId)
  return (
    <ExpandProvider value={contextValue}>
      {flyerContent.content}
    </ExpandProvider>
  )
}, (prev, next) => prev.flyerId === next.flyerId)

// --- Flyer-authentic sub-components ---

// Hardcoded bubble positions - 8 entries, components pick a subset via `count`.
// Fully static = no hydration mismatch, no re-render flicker.
const SOAP_BUBBLE_DATA = [
  { s: 38, l: 13, t: 22, d: 5.3, o: 0.72 },
  { s: 54, l: 54, t: 62, d: 6.1, o: 0.65 },
  { s: 27, l: 82, t: 10, d: 7.2, o: 0.78 },
  { s: 66, l: 5, t: 50, d: 5.8, o: 0.6 },
  { s: 42, l: 68, t: 35, d: 6.5, o: 0.7 },
  { s: 33, l: 30, t: 78, d: 5.0, o: 0.68 },
  { s: 58, l: 88, t: 55, d: 7.8, o: 0.62 },
  { s: 24, l: 45, t: 8, d: 6.9, o: 0.75 },
]

function SoapBubbles({ count = 7 }: { count?: number }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  const bubbles = SOAP_BUBBLE_DATA.slice(0, count)

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {bubbles.map((b, i) => (
        <div
          key={i}
          className="absolute rounded-full soap-bubble animate-bubble-drift"
          style={{
            width: `${b.s}px`,
            height: `${b.s}px`,
            left: `${b.l}%`,
            top: `${b.t}%`,
            ["--bubble-duration" as string]: `${b.d}s`,
            animationDelay: `${i * 0.7}s`,
            opacity: b.o,
          }}
        />
      ))}
    </div>
  )
}

/** Big bold centered title like the flyer headers */
function FlyerTitle({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <div className="animate-text-reveal text-center py-2" style={{ animationDelay: `${delay}s` }}>
      {children}
    </div>
  )
}

/** Purple/pink highlighted section header strip - matches the flyer style */
function SectionHeader({ children, color = "bg-fuchsia-300/60", delay = 0 }: { children: ReactNode; color?: string; delay?: number }) {
  return (
    <div className="animate-stagger-in flex justify-center my-3" style={{ animationDelay: `${delay}s` }}>
      <div className={cn("inline-block px-6 py-1.5 rounded-sm", color)}>
        <h4 className="text-gray-900 font-black text-base uppercase tracking-wide text-center">{children}</h4>
      </div>
    </div>
  )
}

/** Body paragraph - bold centered text matching flyer style */
function FlyerParagraph({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <p
      className="animate-stagger-in text-gray-800 text-sm font-bold leading-relaxed text-center px-2"
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </p>
  )
}

/** Expandable dropdown card with self-registration for expand gate */
function ExpandableCard({
  icon,
  title,
  body,
  delay = 0,
  iconGradient,
  accentColor = "border-pink-300/60",
}: {
  icon: ReactNode
  title: string
  body: string
  delay?: number
  iconGradient: string
  accentColor?: string
}) {
  const [open, setOpen] = useState(false)
  const [hasOpened, setHasOpened] = useState(false)
  const ctx = useContext(ExpandContext)
  const idRef = useRef(title)

  useEffect(() => {
    if (ctx) ctx.register(idRef.current)
  }, [ctx])

  const handleToggle = () => {
    const willOpen = !open
    setOpen(willOpen)
    if (willOpen && !hasOpened) {
      setHasOpened(true)
      if (ctx) ctx.markOpened(idRef.current)
    }
  }

  return (
    <div className="animate-stagger-in" style={{ animationDelay: `${delay}s` }}>
      <button
        onClick={handleToggle}
        className={cn(
          "w-full text-left rounded-2xl border-2 backdrop-blur-md p-4 transition-all duration-300 active:scale-[0.98]",
          open
            ? "bg-white/80 border-pink-400 shadow-lg shadow-pink-200/30"
            : hasOpened
              ? "bg-white/50 border-green-300/60"
              : "bg-white/50 ring-2 ring-pink-300/40 ring-offset-1 " + accentColor,
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn("w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg shrink-0", iconGradient)}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-gray-900 text-sm">{title}</p>
            {!open && (
              <p className={cn("text-[10px] mt-0.5 font-bold", hasOpened ? "text-green-500" : "text-pink-500")}>
                {hasOpened ? "Reviewed" : "Tap to read"}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {hasOpened && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
            <ChevronDown className={cn("w-5 h-5 text-gray-400 transition-transform duration-300", open && "rotate-180 text-pink-500")} />
          </div>
        </div>
        <div className={cn("overflow-hidden transition-all duration-300", open ? "max-h-48 mt-3 opacity-100" : "max-h-0 opacity-0")}>
          <div className="h-px bg-gradient-to-r from-transparent via-pink-300 to-transparent mb-3" />
          <p className="text-gray-700 text-sm font-semibold leading-relaxed">{body}</p>
        </div>
      </button>
    </div>
  )
}

/** Stat block */
function StatBlock({ value, label, delay = 0 }: { value: string; label: string; delay?: number }) {
  return (
    <div className="animate-number-count text-center" style={{ animationDelay: `${delay}s` }}>
      <div className="text-3xl font-black text-gray-900">{value}</div>
      <div className="text-[10px] text-gray-600 font-bold uppercase tracking-wider mt-0.5">{label}</div>
    </div>
  )
}

/** Step item with number */
function StepItem({ num, label, delay = 0 }: { num: number; label: string; delay?: number }) {
  return (
    <div className="animate-stagger-in flex items-center gap-3" style={{ animationDelay: `${delay}s` }}>
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center text-white text-xs font-black shrink-0 shadow-md">
        {num}
      </div>
      <span className="text-gray-800 text-sm font-bold leading-relaxed">{label}</span>
    </div>
  )
}

/** Highlighted callout box */
function CalloutBox({ children, bg = "bg-fuchsia-200/50", border = "border-fuchsia-300/60", delay = 0 }: { children: ReactNode; bg?: string; border?: string; delay?: number }) {
  return (
    <div className={cn("animate-stagger-in rounded-2xl border-2 backdrop-blur-sm p-4 text-center", bg, border)} style={{ animationDelay: `${delay}s` }}>
      {children}
    </div>
  )
}

/** Thin divider */
function Divider() {
  return <div className="h-px bg-gradient-to-r from-transparent via-pink-300/40 to-transparent my-1" />
}

// --- Content per flyer ID ---

export function getFlyerContent(flyerId: string): {
  headerGradient: string
  headerIcon: ReactNode
  bgGradient: string
  bgPattern: "dots" | "grid" | "diagonal" | "waves"
  content: ReactNode
} {
  const contentMap: Record<string, { headerGradient: string; headerIcon: ReactNode; bgGradient: string; bgPattern: "dots" | "grid" | "diagonal" | "waves"; content: ReactNode }> = {
    "flyer-1": {
      headerGradient: "from-pink-500 via-fuchsia-500 to-purple-600",
      headerIcon: <Users className="w-5 h-5 text-white" />,
      bgGradient: "from-pink-200 via-fuchsia-100 to-purple-200",
      bgPattern: "dots",
      content: (
        <div className="relative space-y-3">
          <SoapBubbles count={6} />
          <FlyerTitle>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Welcome to Soapies</h3>
          </FlyerTitle>
          <div className="grid grid-cols-3 gap-3 py-1">
            <StatBlock value="500+" label="Members" delay={0.15} />
            <StatBlock value="50+" label="Events/yr" delay={0.25} />
            <StatBlock value="3" label="Cities" delay={0.35} />
          </div>
          <Divider />
          <FlyerParagraph delay={0.2}>
            Soapies is a vetted, inclusive lifestyle community built on respect, connection, and good vibes. We host events across San Diego and Las Vegas for open-minded adults.
          </FlyerParagraph>
          <Divider />
          <ExpandableCard icon={<Star className="w-4 h-4 text-white" />} iconGradient="from-pink-500 to-rose-500" title="What We Look For" body="Respectful, open-minded individuals and couples who value consent, cleanliness, and community. We vet every member personally." delay={0.3} />
          <ExpandableCard icon={<Heart className="w-4 h-4 text-white" />} iconGradient="from-fuchsia-500 to-pink-500" title="Our Mission" body="To create the safest, most welcoming lifestyle community where everyone can explore freely without judgment." delay={0.4} />
          <ExpandableCard icon={<Users className="w-4 h-4 text-white" />} iconGradient="from-purple-500 to-fuchsia-500" title="Our Community" body="A diverse mix of professionals, creatives, and adventurers united by mutual respect and a love for celebrating life." delay={0.5} />
        </div>
      ),
    },
    "flyer-2": {
      headerGradient: "from-fuchsia-500 via-pink-500 to-rose-500",
      headerIcon: <Utensils className="w-5 h-5 text-white" />,
      bgGradient: "from-fuchsia-200 via-pink-100 to-rose-200",
      bgPattern: "grid",
      content: (
        <div className="relative space-y-3">
          <SoapBubbles count={5} />
          <FlyerTitle>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">The Soapies Menu</h3>
            <p className="text-gray-500 text-xs font-bold mt-1">All our event types</p>
          </FlyerTitle>
          <Divider />
          {[
            { icon: <Music className="w-4 h-4 text-white" />, grad: "from-pink-500 to-rose-500", title: "House Parties", body: "Intimate gatherings at private residences. Themed dress codes, DJ, open bar, and curated guest lists. Our most popular format." },
            { icon: <Zap className="w-4 h-4 text-white" />, grad: "from-fuchsia-500 to-purple-500", title: "Sex Raves", body: "High-energy, music-driven events with a sex-positive atmosphere. Larger scale with multiple play areas, dance floors, and themed rooms." },
            { icon: <Sun className="w-4 h-4 text-white" />, grad: "from-purple-500 to-violet-500", title: "Beach Parties", body: "Daytime outdoor events at Blacks Beach. Clothing-optional, body-positive vibes with ocean views. More social, less play-focused." },
            { icon: <Dice5 className="w-4 h-4 text-white" />, grad: "from-amber-500 to-orange-500", title: "Vegas House Parties", body: "Same intimate house party energy, but in Las Vegas. Weekend getaways with the Soapies community in a new setting." },
          ].map((item, i) => (
            <ExpandableCard key={i} icon={item.icon} iconGradient={item.grad} title={item.title} body={item.body} delay={0.15 + i * 0.1} />
          ))}
          <CalloutBox bg="bg-fuchsia-200/40" border="border-fuchsia-300/60" delay={0.6}>
            <p className="text-fuchsia-800 text-xs font-black">Every event has a unique theme and dress code!</p>
          </CalloutBox>
        </div>
      ),
    },
    "flyer-3": {
      headerGradient: "from-purple-500 via-fuchsia-500 to-pink-500",
      headerIcon: <MessageCircle className="w-5 h-5 text-white" />,
      bgGradient: "from-purple-200 via-fuchsia-100 to-pink-200",
      bgPattern: "waves",
      content: (
        <div className="relative space-y-3">
          <SoapBubbles count={6} />
          <FlyerTitle>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Soapies Chats</h3>
            <p className="text-gray-500 text-xs font-bold mt-1">Stay connected with the community</p>
          </FlyerTitle>
          <Divider />
          <ExpandableCard icon={<MessageCircle className="w-4 h-4 text-white" />} iconGradient="from-pink-500 to-rose-500" title="Party Chat" body="Event-specific chat that opens before each party. Coordinate outfits, find ride shares, and get hyped with fellow attendees." delay={0.15} />
          <ExpandableCard icon={<Users className="w-4 h-4 text-white" />} iconGradient="from-fuchsia-500 to-pink-500" title="Main Community Chat" body="The central hub for all Soapies members. Share experiences, ask questions, plan meetups, and stay in the loop on announcements." delay={0.25} />
          <ExpandableCard icon={<Heart className="w-4 h-4 text-white" />} iconGradient="from-purple-500 to-fuchsia-500" title="Women's Chat" body="A safe, women-only space for ladies in the community to connect, share, and support each other." delay={0.35} />
          <CalloutBox bg="bg-pink-200/40" border="border-pink-300/60" delay={0.45}>
            <p className="text-pink-800 text-xs font-black">Keep chats respectful. No soliciting, no unsolicited pics, no drama.</p>
          </CalloutBox>
        </div>
      ),
    },
    "flyer-4": {
      headerGradient: "from-rose-500 via-pink-500 to-fuchsia-500",
      headerIcon: <Heart className="w-5 h-5 text-white" />,
      bgGradient: "from-gray-200 via-gray-100 to-purple-100",
      bgPattern: "waves",
      content: (
        <div className="relative space-y-3">
          <SoapBubbles count={8} />
          <FlyerTitle>
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-wide">Community Behavior</h3>
          </FlyerTitle>
          <SectionHeader color="bg-purple-300/60" delay={0.1}>Respect Soapies</SectionHeader>
          <FlyerParagraph delay={0.15}>
            Treat everyone with respect, that includes hosts, volunteers, crew, attendees, and Soapies Angels.
          </FlyerParagraph>
          <FlyerParagraph delay={0.2}>
            Talk to people, not about people. Communication and transparency is the goal. Try your best to avoid gossip.
          </FlyerParagraph>
          <SectionHeader color="bg-purple-300/60" delay={0.25}>Good Vibes Only</SectionHeader>
          <ExpandableCard icon={<Sparkles className="w-4 h-4 text-white" />} iconGradient="from-fuchsia-500 to-pink-500" title="Good Vibes Only" body="Soapies is designed for entertainment, enjoyment, and connection. Please refrain from using it as a platform for therapy, as we are not qualified to provide that. Remember, trauma is not a justification for negative behavior." delay={0.3} />
          <SectionHeader color="bg-purple-300/60" delay={0.35}>Zero Tolerance</SectionHeader>
          <ExpandableCard icon={<Ban className="w-4 h-4 text-white" />} iconGradient="from-red-500 to-rose-500" title="Zero Tolerance Policy" body="Harassment, racism, sexism, transphobia, homophobia, body shaming, or kink shaming. Slander or rumor spreading about anyone in Soapies. No Karens (unless that's your name), no complaining. We want people who want to be here." accentColor="border-red-300/60" delay={0.4} />
          <ExpandableCard icon={<Users className="w-4 h-4 text-white" />} iconGradient="from-purple-500 to-fuchsia-500" title="Be a Good Guest" body="Clean up after yourself, respect the venue, tip the bartenders, and leave spaces better than you found them." delay={0.5} />
        </div>
      ),
    },
    "flyer-5": {
      headerGradient: "from-fuchsia-600 via-purple-500 to-pink-500",
      headerIcon: <Star className="w-5 h-5 text-white" />,
      bgGradient: "from-fuchsia-200 via-purple-100 to-pink-200",
      bgPattern: "dots",
      content: (
        <div className="relative space-y-3">
          <SoapBubbles count={6} />
          <FlyerTitle>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Soapies Standards</h3>
            <p className="text-gray-500 text-xs font-bold mt-1">What it means to be one of us</p>
          </FlyerTitle>
          <Divider />
          {[
            { icon: <Heart className="w-4 h-4 text-white" />, grad: "from-pink-500 to-rose-500", title: "Loving", body: "Lead with love in every interaction. Compassion is the foundation of our community." },
            { icon: <Sparkles className="w-4 h-4 text-white" />, grad: "from-fuchsia-500 to-pink-500", title: "Kind", body: "Small acts of kindness build big community. A warm smile goes a long way." },
            { icon: <Shield className="w-4 h-4 text-white" />, grad: "from-purple-500 to-fuchsia-500", title: "Respectful", body: "Boundaries are sacred. Always honor them without question." },
            { icon: <Star className="w-4 h-4 text-white" />, grad: "from-amber-500 to-orange-500", title: "Drama Free", body: "Leave gossip and conflict at the door. We are here for good times only." },
            { icon: <CheckCircle2 className="w-4 h-4 text-white" />, grad: "from-green-500 to-emerald-500", title: "Self-Reliant", body: "Take care of yourself so you can enjoy the experience fully and responsibly." },
          ].map((item, i) => (
            <ExpandableCard key={i} icon={item.icon} iconGradient={item.grad} title={item.title} body={item.body} delay={0.15 + i * 0.08} />
          ))}
        </div>
      ),
    },
    "flyer-6": {
      headerGradient: "from-purple-600 via-fuchsia-500 to-pink-500",
      headerIcon: <Eye className="w-5 h-5 text-white" />,
      bgGradient: "from-purple-200 via-fuchsia-100 to-pink-200",
      bgPattern: "waves",
      content: (
        <div className="relative space-y-3">
          <SoapBubbles count={6} />
          <FlyerTitle>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Our Vision</h3>
            <p className="text-gray-500 text-xs font-bold mt-1">Soapies Angels and what we are building</p>
          </FlyerTitle>
          <Divider />
          <FlyerParagraph delay={0.15}>
            Soapies is more than events - it is a movement. We are building a community where adults can explore their desires in a space that prioritizes safety, consent, and genuine connection above all else.
          </FlyerParagraph>
          <Divider />
          <ExpandableCard icon={<Star className="w-4 h-4 text-white" />} iconGradient="from-fuchsia-500 to-pink-500" title="Soapies Angels" body="Experienced community members who volunteer to help at events. They ensure safety, welcome newcomers, and maintain the vibes. Look for them at every party." delay={0.25} />
          <ExpandableCard icon={<Heart className="w-4 h-4 text-white" />} iconGradient="from-pink-500 to-rose-500" title="What We Are Building" body="A nationwide network of safe, inclusive lifestyle communities. Your membership here is the start of something bigger." delay={0.35} />
          <ExpandableCard icon={<Users className="w-4 h-4 text-white" />} iconGradient="from-purple-500 to-fuchsia-500" title="Your Role" body="Every member shapes the culture. Be an ambassador of respect, safety, and fun wherever you go." delay={0.45} />
        </div>
      ),
    },
    "flyer-7": {
      headerGradient: "from-pink-500 via-rose-500 to-red-500",
      headerIcon: <Hand className="w-5 h-5 text-white" />,
      bgGradient: "from-pink-200 via-rose-100 to-red-100",
      bgPattern: "diagonal",
      content: (
        <div className="relative space-y-3">
          <SoapBubbles count={5} />
          <FlyerTitle>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Saying No & Receiving No</h3>
          </FlyerTitle>
          <CalloutBox bg="bg-pink-200/50" border="border-pink-400/60" delay={0.1}>
            <p className="text-pink-900 text-lg font-black animate-text-reveal">No means no. Always. Every time.</p>
          </CalloutBox>
          <ExpandableCard icon={<Hand className="w-4 h-4 text-white" />} iconGradient="from-pink-500 to-rose-500" title="Saying No" body="You never need a reason to say no. 'No' is a complete sentence. You can say no at any point, even if you said yes before." delay={0.2} />
          <ExpandableCard icon={<CheckCircle2 className="w-4 h-4 text-white" />} iconGradient="from-green-500 to-emerald-500" title="Receiving No" body="When someone says no, respond with grace. Say 'thank you for letting me know' and move on. No guilt trips, no pressure, no asking why." delay={0.3} />
          <ExpandableCard icon={<Ban className="w-4 h-4 text-white" />} iconGradient="from-red-500 to-rose-500" title="Never Pressure" body="Do not ask more than twice. If someone declines, respect it fully. Repeated asking is a form of coercion and will not be tolerated." accentColor="border-red-300/60" delay={0.4} />
        </div>
      ),
    },
    "flyer-8": {
      headerGradient: "from-fuchsia-500 via-purple-500 to-blue-500",
      headerIcon: <Shield className="w-5 h-5 text-white" />,
      bgGradient: "from-pink-300 via-fuchsia-100 to-purple-200",
      bgPattern: "dots",
      content: (
        <div className="relative space-y-3">
          <SoapBubbles count={7} />
          <FlyerTitle>
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-wide">Party Rules</h3>
          </FlyerTitle>
          <SectionHeader color="bg-pink-300/60" delay={0.1}>Playing Safe</SectionHeader>
          <FlyerParagraph delay={0.15}>
            Assume that everyone expects condoms to be worn. If you don't want condoms to be worn, then have that conversation. Ask about testing, latex sensitivities, sexual history, at your discretion.
          </FlyerParagraph>
          <ExpandableCard icon={<Shield className="w-4 h-4 text-white" />} iconGradient="from-pink-500 to-rose-500" title="Playing Safe Details" body="If there is any bit of confusion, then use condoms. Make no assumptions when it comes to safety. Protection is always provided at events." delay={0.2} />
          <SectionHeader color="bg-pink-300/60" delay={0.25}>Phones and Pictures</SectionHeader>
          <ExpandableCard icon={<Phone className="w-4 h-4 text-white" />} iconGradient="from-fuchsia-500 to-pink-500" title="Phone Policy" body="Keep phone use to minimum. If you do have to use your phone, use it in the cubby area only. No phones in the play areas, and no pictures are to be taken. If you do have your phone out, you are giving consent for it to be checked if needed." delay={0.3} />
          <SectionHeader color="bg-pink-300/60" delay={0.35}>Alcohol and Drugs</SectionHeader>
          <ExpandableCard icon={<Beer className="w-4 h-4 text-white" />} iconGradient="from-amber-500 to-orange-500" title="Alcohol & Drug Policy" body="Drinking at these parties is a privilege. Let's respect this privilege and not abuse it. Do not experiment with drugs that you are not used to taking at the party. Please respect the space, the guests, yourself, and Soapies by not getting too intoxicated." delay={0.4} />
        </div>
      ),
    },
    "flyer-9": {
      headerGradient: "from-green-500 via-teal-500 to-blue-500",
      headerIcon: <Sparkles className="w-5 h-5 text-white" />,
      bgGradient: "from-green-200 via-teal-100 to-blue-200",
      bgPattern: "dots",
      content: (
        <div className="relative space-y-3">
          <SoapBubbles count={5} />
          <FlyerTitle>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Clean Spaces & Safety</h3>
            <p className="text-gray-500 text-xs font-bold mt-1">Walking buddies and your safety matters</p>
          </FlyerTitle>
          <Divider />
          <ExpandableCard icon={<Sparkles className="w-4 h-4 text-white" />} iconGradient="from-green-500 to-emerald-500" title="Clean Spaces" body="Always clean up after yourself. Dispose of protection properly. Wipe down surfaces. Leave every space ready for the next person." delay={0.15} />
          <ExpandableCard icon={<Users className="w-4 h-4 text-white" />} iconGradient="from-blue-500 to-cyan-500" title="Walking Buddies" body="If you are leaving late, ask someone to walk you to your car. Soapies Angels are always available to escort you safely." delay={0.25} />
          <ExpandableCard icon={<Heart className="w-4 h-4 text-white" />} iconGradient="from-pink-500 to-rose-500" title="Your Safety Matters" body="If you ever feel unsafe, find a Soapies Angel or the host immediately. We take every concern seriously and will act swiftly." delay={0.35} />
          <ExpandableCard icon={<Shield className="w-4 h-4 text-white" />} iconGradient="from-purple-500 to-fuchsia-500" title="Look Out for Others" body="If you notice someone who seems uncomfortable or too intoxicated, check in on them. We take care of each other here." delay={0.45} />
        </div>
      ),
    },
    "flyer-10": {
      headerGradient: "from-red-500 via-pink-500 to-fuchsia-500",
      headerIcon: <Lock className="w-5 h-5 text-white" />,
      bgGradient: "from-red-200 via-pink-100 to-fuchsia-200",
      bgPattern: "diagonal",
      content: (
        <div className="relative space-y-3">
          <SoapBubbles count={5} />
          <FlyerTitle>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Consent Rules</h3>
          </FlyerTitle>
          <CalloutBox bg="bg-red-200/40" border="border-red-400/60" delay={0.1}>
            <p className="text-red-900 text-sm font-black uppercase tracking-wide animate-text-reveal">Ask before touching, kissing, and more</p>
          </CalloutBox>
          <div className="space-y-2.5">
            <StepItem num={1} label="Always ask before initiating any physical contact" delay={0.2} />
            <StepItem num={2} label="Get verbal confirmation - enthusiastic yes only" delay={0.25} />
            <StepItem num={3} label="Check in during play - consent can be revoked anytime" delay={0.3} />
            <StepItem num={4} label="If someone says no or seems hesitant, stop immediately" delay={0.35} />
          </div>
          <ExpandableCard icon={<Ban className="w-4 h-4 text-white" />} iconGradient="from-red-500 to-rose-500" title="The Two Ask Maximum" body="Do not ask someone more than twice. If they say no or are unsure, move on with respect and grace. Repeated asking is coercion." accentColor="border-red-300/60" delay={0.4} />
          <ExpandableCard icon={<CheckCircle2 className="w-4 h-4 text-white" />} iconGradient="from-green-500 to-emerald-500" title="Consent is Ongoing" body="A yes now does not mean yes later. Check in regularly and be ready to stop at any moment without frustration." delay={0.5} />
        </div>
      ),
    },
    "flyer-11": {
      headerGradient: "from-amber-500 via-orange-500 to-red-500",
      headerIcon: <AlertTriangle className="w-5 h-5 text-white" />,
      bgGradient: "from-amber-200 via-orange-100 to-red-200",
      bgPattern: "grid",
      content: (
        <div className="relative space-y-3">
          <SoapBubbles count={4} />
          <FlyerTitle>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Three Strike Rule</h3>
          </FlyerTitle>
          <Divider />
          <div className="space-y-3">
            {[
              { strike: "1st", desc: "Verbal warning and a private conversation with leadership.", color: "from-amber-500 to-yellow-500", border: "border-amber-300/60" },
              { strike: "2nd", desc: "Temporary suspension from events and community chats.", color: "from-orange-500 to-amber-500", border: "border-orange-300/60" },
              { strike: "3rd", desc: "Permanent removal from the Soapies community. No appeals.", color: "from-red-500 to-rose-500", border: "border-red-300/60" },
            ].map((s, i) => (
              <div key={i} className={cn("animate-stagger-in flex items-start gap-3 bg-white/50 backdrop-blur-sm rounded-2xl p-4 border-2", s.border)} style={{ animationDelay: `${0.15 + i * 0.12}s` }}>
                <div className={cn("shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center text-white text-xs font-black shadow-lg", s.color)}>
                  {s.strike}
                </div>
                <p className="text-gray-800 text-sm font-bold leading-relaxed mt-1.5">{s.desc}</p>
              </div>
            ))}
          </div>
          <ExpandableCard icon={<XCircle className="w-4 h-4 text-white" />} iconGradient="from-red-600 to-red-500" title="Instant Removal Offenses" body="Sexual assault, non-consensual recording, bringing weapons, or distributing drugs result in immediate permanent ban - no strikes needed." accentColor="border-red-300/60" delay={0.5} />
        </div>
      ),
    },
    "flyer-12": {
      headerGradient: "from-blue-500 via-purple-500 to-fuchsia-500",
      headerIcon: <UserX className="w-5 h-5 text-white" />,
      bgGradient: "from-blue-200 via-purple-100 to-fuchsia-200",
      bgPattern: "waves",
      content: (
        <div className="relative space-y-3">
          <SoapBubbles count={6} />
          <FlyerTitle>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Solo Gentlemen Policies</h3>
            <p className="text-gray-500 text-xs font-bold mt-1">Guidelines for single male attendees</p>
          </FlyerTitle>
          <Divider />
          <ExpandableCard icon={<Ban className="w-4 h-4 text-white" />} iconGradient="from-red-500 to-rose-500" title="Do Not Interrupt Play" body="If people are engaged, do not approach or try to join unless explicitly invited. Watch from a respectful distance only if the area allows it." accentColor="border-red-300/60" delay={0.15} />
          <ExpandableCard icon={<UserX className="w-4 h-4 text-white" />} iconGradient="from-amber-500 to-orange-500" title="No Hovering or Lingering" body="Do not stand around watching others play without invitation. It makes people uncomfortable. Move through spaces naturally." delay={0.25} />
          <ExpandableCard icon={<Heart className="w-4 h-4 text-white" />} iconGradient="from-pink-500 to-rose-500" title="Be Social First" body="Focus on genuine conversation and connection before anything else. Build rapport, be charming, and let things happen naturally." delay={0.35} />
          <ExpandableCard icon={<CheckCircle2 className="w-4 h-4 text-white" />} iconGradient="from-green-500 to-emerald-500" title="Read the Room" body="Pay attention to body language. If someone is not engaging back, gracefully move on. The community respects men who are self-aware." delay={0.45} />
          <CalloutBox bg="bg-blue-200/40" border="border-blue-300/60" delay={0.55}>
            <p className="text-blue-800 text-xs font-black">Solo gentlemen who follow these guidelines are valued and respected members of the community.</p>
          </CalloutBox>
        </div>
      ),
    },
    "flyer-13": {
      headerGradient: "from-green-500 via-emerald-500 to-teal-500",
      headerIcon: <TestTube className="w-5 h-5 text-white" />,
      bgGradient: "from-green-200 via-emerald-100 to-teal-200",
      bgPattern: "dots",
      content: (
        <div className="relative space-y-3">
          <SoapBubbles count={5} />
          <FlyerTitle>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Suggested Testing Routine</h3>
          </FlyerTitle>
          <CalloutBox bg="bg-green-200/50" border="border-green-400/60" delay={0.1}>
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-5 py-2.5 rounded-full text-sm font-black shadow-lg shadow-green-200/50 animate-icon-pop">
              <div className="w-3 h-3 rounded-full bg-white/80 animate-pulse-subtle" />
              Green Wristband = Tested within 30 days
            </div>
          </CalloutBox>
          <ExpandableCard icon={<Clock className="w-4 h-4 text-white" />} iconGradient="from-green-500 to-emerald-500" title="30-Day Window" body="We recommend getting tested within 30 days of any event you plan to attend. This ensures the most accurate and up-to-date results." delay={0.2} />
          <ExpandableCard icon={<TestTube className="w-4 h-4 text-white" />} iconGradient="from-blue-500 to-cyan-500" title="Full Panel Test" body="We recommend a full STI panel including: HIV, Chlamydia, Gonorrhea, Syphilis, Herpes (HSV-1 & HSV-2), Hepatitis B & C, and Trichomoniasis." delay={0.3} />
          <ExpandableCard icon={<FileText className="w-4 h-4 text-white" />} iconGradient="from-purple-500 to-fuchsia-500" title="How to Get Tested" body="AHF Healthcare provides free testing. Many urgent care and Planned Parenthood locations also offer affordable panels." delay={0.4} />
        </div>
      ),
    },
    "flyer-14": {
      headerGradient: "from-teal-500 via-green-500 to-emerald-500",
      headerIcon: <CheckCircle2 className="w-5 h-5 text-white" />,
      bgGradient: "from-teal-200 via-green-100 to-emerald-200",
      bgPattern: "grid",
      content: (
        <div className="relative space-y-3">
          <SoapBubbles count={5} />
          <FlyerTitle>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Testing Wristbands</h3>
          </FlyerTitle>
          <CalloutBox bg="bg-green-200/50" border="border-green-400/60" delay={0.1}>
            <p className="text-green-900 text-sm font-black animate-text-reveal">Wristbands are a signal of trust, not a requirement.</p>
          </CalloutBox>
          {[
            "Testing wristbands show you have been tested within the last 30 days",
            "They are recommended and appreciated, but never mandatory",
            "Submit your results via the form provided in the community chat",
            "Results are reviewed privately and confidentially by leadership",
            "Having a wristband may make others more comfortable playing with you",
          ].map((item, i) => (
            <div key={i} className="animate-stagger-in flex items-start gap-2.5 bg-white/50 backdrop-blur-sm rounded-xl p-3 border border-green-200/60" style={{ animationDelay: `${0.2 + i * 0.08}s` }}>
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                <CheckCircle2 className="w-3 h-3 text-white" />
              </div>
              <span className="text-gray-800 text-sm font-bold leading-relaxed">{item}</span>
            </div>
          ))}
          <ExpandableCard icon={<Shield className="w-4 h-4 text-white" />} iconGradient="from-teal-500 to-green-500" title="Your Privacy" body="Test results are never shared. Only leadership confirms wristband eligibility. Your health info stays confidential." delay={0.7} />
        </div>
      ),
    },
    "flyer-15": {
      headerGradient: "from-blue-500 via-cyan-500 to-teal-500",
      headerIcon: <Pill className="w-5 h-5 text-white" />,
      bgGradient: "from-blue-200 via-cyan-100 to-teal-200",
      bgPattern: "waves",
      content: (
        <div className="relative space-y-3">
          <SoapBubbles count={5} />
          <FlyerTitle>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Easy Tips for Safer Sex</h3>
            <p className="text-gray-500 text-xs font-bold mt-1">AHF testing, DoxyPEP, and PrEP info</p>
          </FlyerTitle>
          <Divider />
          <ExpandableCard icon={<TestTube className="w-4 h-4 text-white" />} iconGradient="from-blue-500 to-cyan-500" title="AHF Free Testing" body="AIDS Healthcare Foundation offers free STI testing at locations nationwide. Walk-ins welcome. Results in minutes for rapid tests." delay={0.15} />
          <ExpandableCard icon={<Pill className="w-4 h-4 text-white" />} iconGradient="from-green-500 to-emerald-500" title="DoxyPEP" body="A post-exposure antibiotic that reduces risk of chlamydia, syphilis, and gonorrhea by up to 90% when taken within 72 hours. Ask your doctor." delay={0.25} />
          <ExpandableCard icon={<Shield className="w-4 h-4 text-white" />} iconGradient="from-purple-500 to-fuchsia-500" title="PrEP (Pre-Exposure Prophylaxis)" body="A daily medication that reduces HIV risk by up to 99%. Available through most doctors and can be free through assistance programs." delay={0.35} />
          <ExpandableCard icon={<Heart className="w-4 h-4 text-white" />} iconGradient="from-pink-500 to-rose-500" title="Protection Basics" body="Condoms and dental dams are always provided at events. Use them. Bring your own if you prefer a specific type or brand." delay={0.45} />
        </div>
      ),
    },
    "flyer-16": {
      headerGradient: "from-fuchsia-500 via-pink-500 to-purple-500",
      headerIcon: <FileText className="w-5 h-5 text-white" />,
      bgGradient: "from-fuchsia-200 via-pink-100 to-purple-200",
      bgPattern: "diagonal",
      content: (
        <div className="relative space-y-3">
          <SoapBubbles count={5} />
          <FlyerTitle>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Navigating Safer Sex</h3>
          </FlyerTitle>
          <SectionHeader color="bg-fuchsia-300/60" delay={0.1}>The RBDSMT Conversation</SectionHeader>
          <FlyerParagraph delay={0.15}>Before playing, discuss:</FlyerParagraph>
          <div className="space-y-2.5">
            <StepItem num={1} label="R - Recent testing? When was your last test?" delay={0.2} />
            <StepItem num={2} label="B - Birth control? What methods are in use?" delay={0.25} />
            <StepItem num={3} label="D - DoxyPEP? Are either of you taking it?" delay={0.3} />
            <StepItem num={4} label="S - STI status? Anything to disclose?" delay={0.35} />
            <StepItem num={5} label="M - Medication? PrEP or other relevant meds?" delay={0.4} />
            <StepItem num={6} label="T - Tracking? Do you track your partners?" delay={0.45} />
          </div>
          <ExpandableCard icon={<Users className="w-4 h-4 text-white" />} iconGradient="from-purple-500 to-fuchsia-500" title="Track Your Partners" body="Keep a mental or written note of who you play with at events. If you test positive later, you can notify them discreetly through leadership." delay={0.5} />
        </div>
      ),
    },
    "flyer-17": {
      headerGradient: "from-red-500 via-rose-500 to-pink-500",
      headerIcon: <Phone className="w-5 h-5 text-white" />,
      bgGradient: "from-red-200 via-rose-100 to-pink-200",
      bgPattern: "grid",
      content: (
        <div className="relative space-y-3">
          <SoapBubbles count={4} />
          <FlyerTitle>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Positive Test Protocol</h3>
          </FlyerTitle>
          <Divider />
          <div className="space-y-2.5">
            <StepItem num={1} label="Contact Soapies leadership immediately and confidentially" delay={0.15} />
            <StepItem num={2} label="Provide a list of recent partners from events" delay={0.2} />
            <StepItem num={3} label="Leadership will notify affected members anonymously" delay={0.25} />
            <StepItem num={4} label="All affected members should get tested ASAP" delay={0.3} />
            <StepItem num={5} label="Follow your doctor's treatment plan completely" delay={0.35} />
          </div>
          <ExpandableCard icon={<Heart className="w-4 h-4 text-white" />} iconGradient="from-pink-500 to-rose-500" title="No Shame, No Blame" body="STIs happen. There is zero judgment in this community. We support each other through everything, including health scares." delay={0.4} />
          <ExpandableCard icon={<Shield className="w-4 h-4 text-white" />} iconGradient="from-green-500 to-emerald-500" title="Confidentiality Guaranteed" body="Your identity is never revealed during notifications. Leadership handles everything with discretion and care." delay={0.5} />
          <CalloutBox bg="bg-red-200/40" border="border-red-400/60" delay={0.6}>
            <p className="text-red-800 text-xs font-black">Failing to disclose a known positive status before playing is an instant permanent ban.</p>
          </CalloutBox>
        </div>
      ),
    },
    "flyer-18": {
      headerGradient: "from-purple-600 via-pink-500 to-orange-400",
      headerIcon: <Instagram className="w-5 h-5 text-white" />,
      bgGradient: "from-purple-200 via-pink-100 to-orange-200",
      bgPattern: "waves",
      content: (
        <div className="relative space-y-3">
          <SoapBubbles count={6} />
          <FlyerTitle>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Soapies Instagram</h3>
            <p className="text-gray-500 text-xs font-bold mt-1">Follow and stay in the loop</p>
          </FlyerTitle>
          <CalloutBox bg="bg-purple-200/40" border="border-purple-300/60" delay={0.1}>
            <div className="animate-icon-pop" style={{ animationDelay: "0.15s" }}>
              <Instagram className="w-12 h-12 text-fuchsia-500 mx-auto mb-2" />
            </div>
            <p className="text-gray-900 text-xl font-black animate-text-reveal" style={{ animationDelay: "0.25s" }}>@soapies_sd</p>
            <p className="text-gray-500 text-xs font-bold mt-1">DM for access to the private page</p>
          </CalloutBox>
          <ExpandableCard icon={<MessageCircle className="w-4 h-4 text-white" />} iconGradient="from-pink-500 to-rose-500" title="DM to Follow" body="Our page is private. Send a DM with your name and membership info to get approved. Do not just send a follow request." delay={0.35} />
          <ExpandableCard icon={<Ban className="w-4 h-4 text-white" />} iconGradient="from-red-500 to-rose-500" title="Do Not Follow Other Members" body="Do not follow or add other members you have not met in person. Respect privacy. Meeting online first is not the same as meeting at an event." accentColor="border-red-300/60" delay={0.45} />
          <ExpandableCard icon={<Shield className="w-4 h-4 text-white" />} iconGradient="from-purple-500 to-fuchsia-500" title="Privacy is Sacred" body="Never screenshot, share, or discuss content from the private page outside of the community. What you see stays with Soapies." delay={0.55} />
        </div>
      ),
    },
    "flyer-19": {
      headerGradient: "from-green-500 via-emerald-400 to-fuchsia-500",
      headerIcon: <Gift className="w-5 h-5 text-white" />,
      bgGradient: "from-green-200 via-emerald-100 to-fuchsia-200",
      bgPattern: "dots",
      content: (
        <div className="relative space-y-3">
          <SoapBubbles count={6} />
          <FlyerTitle>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Referral Program</h3>
          </FlyerTitle>
          <CalloutBox bg="bg-green-200/40" border="border-green-400/60" delay={0.1}>
            <div className="grid grid-cols-2 gap-6">
              <StatBlock value="$35" label="Per Referral" delay={0.15} />
              <StatBlock value="$70" label="Per Couple" delay={0.25} />
            </div>
            <p className="text-gray-600 text-xs font-bold mt-3">No limit on referrals!</p>
          </CalloutBox>
          <ExpandableCard icon={<DollarSign className="w-4 h-4 text-white" />} iconGradient="from-green-500 to-emerald-500" title="How It Works" body="Refer someone new to Soapies. Once they complete the application and attend their first event, you earn $35 ($70 for couples)." delay={0.35} />
          <ExpandableCard icon={<Users className="w-4 h-4 text-white" />} iconGradient="from-fuchsia-500 to-pink-500" title="Quality Over Quantity" body="Only refer people who you genuinely believe would be a great fit for the community. They must pass the same vetting process." delay={0.45} />
          <ExpandableCard icon={<Gift className="w-4 h-4 text-white" />} iconGradient="from-pink-500 to-rose-500" title="Unlimited Earning" body="There is no cap on referrals. The more great people you bring in, the more you earn and the better our community gets." delay={0.55} />
        </div>
      ),
    },
  }

  return contentMap[flyerId] || contentMap["flyer-1"]
}
