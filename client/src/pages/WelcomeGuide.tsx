import { useState, useEffect, useCallback, useRef } from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  ZoomIn,
  Lock,
  CheckCircle2,
  Sparkles,
  Heart,
  Users,
  Shield,
  BookOpen,
  Calendar,
  Instagram,
  Download,
  ExternalLink,
  HeartHandshake,
  MessageSquare,
  Phone,
  MapPin,
  Ticket,
  PartyPopper,
  Gift,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { getFlyerContent, useExpandGate, ExpandProvider, FlyerContentBody } from "@/components/welcome/flyer-content"

type StepType = "intro" | "flyer" | "action" | "schedule" | "outro"

interface Step {
  id: string
  type: StepType
  title?: string
  subtitle?: string
  description?: string
  image?: string
  section?: number
  sectionName?: string
  actionType?: "instagram" | "partiful" | "social"
}

// Flyer data organized by new sections from the Google Doc
const flyerData: Step[] = [
  // Section 1: Intro and Community (Flyers 1-5)
  {
    id: "flyer-1",
    type: "flyer",
    title: "Intro & Community",
    subtitle: "Flyer 1 of 5",
    description: "Welcome to Soapies - who we are, how many, and what we look for.",
    image: "/flyers/01-welcome.jpg",
    section: 1,
    sectionName: "Intro & Community",
  },
  {
    id: "flyer-2",
    type: "flyer",
    title: "Intro & Community",
    subtitle: "Flyer 2 of 5",
    description: "The Soapies menu - all our event types and what to expect.",
    image: "/flyers/02-menu.png",
    section: 1,
    sectionName: "Intro & Community",
  },
  {
    id: "flyer-3",
    type: "flyer",
    title: "Intro & Community",
    subtitle: "Flyer 3 of 5",
    description: "Soapies chats - party chat, main community chat, and women's chat.",
    image: "/flyers/03-chat.png",
    section: 1,
    sectionName: "Intro & Community",
  },
  {
    id: "flyer-4",
    type: "flyer",
    title: "Intro & Community",
    subtitle: "Flyer 4 of 5",
    description: "Community behavior - respect, good vibes, and zero tolerance policies.",
    image: "/flyers/04-behavior.png",
    section: 1,
    sectionName: "Intro & Community",
  },
  {
    id: "flyer-5",
    type: "flyer",
    title: "Intro & Community",
    subtitle: "Flyer 5 of 5",
    description: "Soapies standards - loving, kind, respectful, drama free, and self-reliant.",
    image: "/flyers/05-standards.png",
    section: 1,
    sectionName: "Intro & Community",
  },
  // Section 2: Safety Guidelines (Flyers 6-12)
  {
    id: "flyer-6",
    type: "flyer",
    title: "Safety Guidelines",
    subtitle: "Flyer 1 of 7",
    description: "Our vision for community, Soapies Angels, and what we're building together.",
    image: "/flyers/06-vision.png",
    section: 2,
    sectionName: "Safety Guidelines",
  },
  {
    id: "flyer-7",
    type: "flyer",
    title: "Safety Guidelines",
    subtitle: "Flyer 2 of 7",
    description: "Saying No and Receiving No - boundaries are celebrated here.",
    image: "/flyers/07-saying-no.png",
    section: 2,
    sectionName: "Safety Guidelines",
  },
  {
    id: "flyer-8",
    type: "flyer",
    title: "Safety Guidelines",
    subtitle: "Flyer 3 of 7",
    description: "Playing safe, phone policies, and alcohol and drug guidelines.",
    image: "/flyers/08-playing-safe.png",
    section: 2,
    sectionName: "Safety Guidelines",
  },
  {
    id: "flyer-9",
    type: "flyer",
    title: "Safety Guidelines",
    subtitle: "Flyer 4 of 7",
    description: "Clean spaces, walking buddies, and your safety matters.",
    image: "/flyers/09-clean-space.png",
    section: 2,
    sectionName: "Safety Guidelines",
  },
  {
    id: "flyer-10",
    type: "flyer",
    title: "Safety Guidelines",
    subtitle: "Flyer 5 of 7",
    description: "Consent rules - ask before touching, kissing, and more. Do not ask more than twice.",
    image: "/flyers/10-consent.png",
    section: 2,
    sectionName: "Safety Guidelines",
  },
  {
    id: "flyer-11",
    type: "flyer",
    title: "Safety Guidelines",
    subtitle: "Flyer 6 of 7",
    description: "No exploiting Soapies and the three strike rule.",
    image: "/flyers/11-three-strikes.png",
    section: 2,
    sectionName: "Safety Guidelines",
  },
  {
    id: "flyer-12",
    type: "flyer",
    title: "Safety Guidelines",
    subtitle: "Flyer 7 of 7",
    description: "New solo gentlemen policies - do not interrupt play, no hovering or lingering.",
    image: "/flyers/12-solo-gentlemen.png",
    section: 2,
    sectionName: "Safety Guidelines",
  },
  // Section 3: Safer Sex Flyers (Flyers 13-17)
  {
    id: "flyer-13",
    type: "flyer",
    title: "Safer Sex",
    subtitle: "Flyer 1 of 5",
    description: "Suggested testing routine - green wristbands, 30-day window, full panel test details.",
    image: "/flyers/13-suggested-testing.jpg",
    section: 3,
    sectionName: "Safer Sex",
  },
  {
    id: "flyer-14",
    type: "flyer",
    title: "Safer Sex",
    subtitle: "Flyer 2 of 5",
    description: "Testing wristbands are recommended, not mandatory - submission rules and guidelines.",
    image: "/flyers/14-suggested-testing-pt2.jpg",
    section: 3,
    sectionName: "Safer Sex",
  },
  {
    id: "flyer-15",
    type: "flyer",
    title: "Safer Sex",
    subtitle: "Flyer 3 of 5",
    description: "Easy tips for safer sex - AHF testing, DoxyPEP, and PrEP info.",
    image: "/flyers/15-easy-tips.jpg",
    section: 3,
    sectionName: "Safer Sex",
  },
  {
    id: "flyer-16",
    type: "flyer",
    title: "Safer Sex",
    subtitle: "Flyer 4 of 5",
    description: "Navigating safer sex at parties - the RBDSMT talk and tracking partners.",
    image: "/flyers/16-navigating.jpg",
    section: 3,
    sectionName: "Safer Sex",
  },
  {
    id: "flyer-17",
    type: "flyer",
    title: "Safer Sex",
    subtitle: "Flyer 5 of 5",
    description: "Positive test standard protocol - notification chain and community support.",
    image: "/flyers/17-positive-test.jpg",
    section: 3,
    sectionName: "Safer Sex",
  },
  // Section 4: Referral Promo (Flyer 19)
  {
    id: "flyer-19",
    type: "flyer",
    title: "Referral Program",
    subtitle: "Earn Rewards",
    description: "Earn $35 per person you refer - couples count as $70, no limit on referrals.",
    image: "/flyers/19-referral.jpg",
    section: 4,
    sectionName: "Referral",
  },
]

const steps: Step[] = [
  { id: "intro", type: "intro" },
  { id: "action-social", type: "action", actionType: "social" },
  ...flyerData,
  { id: "schedule", type: "schedule" },
  { id: "outro", type: "outro" },
]

const sections = [
  { id: 0, name: "Start", icon: "sparkles" },
  { id: 10, name: "Follow & Download", icon: "download" },
  { id: 1, name: "Intro & Community", icon: "users" },
  { id: 2, name: "Safety", icon: "shield" },
  { id: 3, name: "Safer Sex", icon: "heart" },
  { id: 4, name: "Referral", icon: "gift" },
  { id: 7, name: "Events", icon: "calendar" },
  { id: 6, name: "Next Steps", icon: "calendar" },
]

const BUBBLE_DATA = [
  { w: 38, h: 33, l: 48, t: 23, d: 4.7 },
  { w: 51, h: 56, l: 22, t: 76, d: 5.2 },
  { w: 26, h: 42, l: 85, t: 12, d: 6.1 },
  { w: 64, h: 29, l: 7, t: 58, d: 4.3 },
  { w: 34, h: 68, l: 63, t: 41, d: 5.8 },
  { w: 45, h: 37, l: 38, t: 89, d: 7.0 },
  { w: 72, h: 52, l: 91, t: 33, d: 4.5 },
  { w: 28, h: 44, l: 15, t: 67, d: 6.4 },
]

function FloatingBubbles() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {BUBBLE_DATA.map((b, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-gradient-to-br from-white/40 to-white/10 backdrop-blur-sm animate-float"
          style={{
            width: `${b.w}px`,
            height: `${b.h}px`,
            left: `${b.l}%`,
            top: `${b.t}%`,
            animationDelay: `${i * 0.5}s`,
            animationDuration: `${b.d}s`,
          }}
        />
      ))}
    </div>
  )
}

export function WelcomeFlyersClient() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [viewedSteps, setViewedSteps] = useState<Set<string>>(new Set())
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const [hasCompletedWalkthrough, setHasCompletedWalkthrough] = useState(false)
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right")
  const [isAnimating, setIsAnimating] = useState(false)

  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)
  const minSwipeDistance = 50
  const sectionNavRef = useRef<HTMLDivElement>(null)
  const activeSectionRef = useRef<HTMLButtonElement>(null)

  // Expand gate: track whether all dropdowns on current flyer have been expanded
  const expandGate = useExpandGate()
  const isFlyerStep = steps[currentIndex]?.type === "flyer"
  const expandsBlocking = isFlyerStep && !expandGate.allExpanded

  // Reset expand gate when step changes
  useEffect(() => {
    expandGate.reset()
  }, [currentIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  const currentStep = steps[currentIndex]
  const progress = ((currentIndex + 1) / steps.length) * 100
  const flyerSteps = steps.filter((s) => s.type === "flyer")
  const allFlyersViewed = flyerSteps.every((s) => viewedSteps.has(s.id))

  // Get current section based on step type
  const getCurrentSection = () => {
    if (currentStep?.type === "intro") return 0
    if (currentStep?.type === "action") return 10
    if (currentStep?.type === "schedule") return 7
    if (currentStep?.type === "outro") return 6
    return (currentStep as any)?.section || 1
  }
  const currentSection = getCurrentSection()

  // Auto-scroll the section nav to keep active section visible
  useEffect(() => {
    if (activeSectionRef.current && sectionNavRef.current) {
      const container = sectionNavRef.current
      const activeBtn = activeSectionRef.current
      const containerRect = container.getBoundingClientRect()
      const btnRect = activeBtn.getBoundingClientRect()

      // Calculate the offset needed to center the active button
      const scrollLeft =
        activeBtn.offsetLeft - container.offsetLeft - containerRect.width / 2 + btnRect.width / 2

      container.scrollTo({
        left: scrollLeft,
        behavior: "smooth",
      })
    }
  }, [currentSection])

  // Mark current step as viewed after 1 second
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentStep) {
        setViewedSteps((prev) => new Set([...prev, currentStep.id]))
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [currentIndex, currentStep])

  // Check if walkthrough is complete
  useEffect(() => {
    if (viewedSteps.size === steps.length) {
      setHasCompletedWalkthrough(true)
    }
  }, [viewedSteps])

  const nextSlide = useCallback(() => {
    if (expandsBlocking) return
    if (currentIndex < steps.length - 1 && !isAnimating) {
      setSlideDirection("right")
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1)
        setIsAnimating(false)
      }, 150)
    }
  }, [currentIndex, isAnimating, expandsBlocking])

  const prevSlide = useCallback(() => {
    if (currentIndex > 0 && !isAnimating) {
      setSlideDirection("left")
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentIndex((prev) => prev - 1)
        setIsAnimating(false)
      }, 150)
    }
  }, [currentIndex, isAnimating])

  const goToStep = (index: number) => {
    if (index > currentIndex && expandsBlocking) return
    const targetStep = steps[index]
    if ((viewedSteps.has(targetStep.id) || index <= currentIndex || index === currentIndex + 1) && !isAnimating) {
      setSlideDirection(index > currentIndex ? "right" : "left")
      setIsAnimating(true)
      setTimeout(() => {
        setCurrentIndex(index)
        setIsAnimating(false)
      }, 150)
    }
  }

  // Touch navigation
  const onTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null
    touchStartX.current = e.targetTouches[0].clientX
  }

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX
  }

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return
    const distance = touchStartX.current - touchEndX.current
    if (distance > minSwipeDistance) nextSlide()
    if (distance < -minSwipeDistance) prevSlide()
  }

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLightboxOpen) {
        if (e.key === "Escape") setIsLightboxOpen(false)
      } else {
        if (e.key === "ArrowRight") nextSlide()
        if (e.key === "ArrowLeft") prevSlide()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isLightboxOpen, nextSlide, prevSlide])

  const isLastStep = currentIndex === steps.length - 1
  const isFirstStep = currentIndex === 0

  const IntroStep = () => (
    <div
      className="max-w-lg mx-auto animate-fade-in"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-pink-400 via-fuchsia-500 to-purple-600 p-1 shadow-2xl shadow-pink-300/30">
        <FloatingBubbles />
        <div className="relative bg-white rounded-[22px] p-6 sm:p-8 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-50/50 via-transparent to-purple-50/50 animate-pulse-slow" />

          {/* Logo */}
          <div className="relative flex flex-col items-center mb-6">
            <div className="relative animate-bounce-slow">
              <div className="absolute inset-0 bg-pink-400 blur-2xl opacity-30 rounded-full animate-pulse" />
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663460303717/FfTbhpP94ZvscRd7twWNT6/soapies-logo_cf3c72b2.png"
                alt="Soapies"
                className="relative h-20 sm:h-24 w-auto drop-shadow-lg"
              />
            </div>

            <div className="absolute -top-2 -right-4 animate-float" style={{ animationDelay: "0s" }}>
              <Heart className="w-6 h-6 text-pink-400 fill-pink-400" />
            </div>
            <div className="absolute top-8 -left-6 animate-float" style={{ animationDelay: "0.5s" }}>
              <Sparkles className="w-5 h-5 text-fuchsia-400" />
            </div>
            <div className="absolute -bottom-2 right-0 animate-float" style={{ animationDelay: "1s" }}>
              <Heart className="w-4 h-4 text-purple-400 fill-purple-400" />
            </div>
          </div>

          {/* Welcome text */}
          <div className="relative text-center space-y-4">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-600 via-fuchsia-600 to-purple-600 bg-clip-text text-transparent animate-slide-up">
              Welcome to Soapies!
            </h1>

            <p
              className="text-gray-600 text-sm sm:text-base leading-relaxed animate-slide-up"
              style={{ animationDelay: "0.1s" }}
            >
              Thank you for considering playing with our community of{" "}
              <span className="font-semibold text-fuchsia-600">vetted and sexy people</span>. We{"'"}re thrilled you{"'"}re
              here!
            </p>

            <div
              className="bg-gradient-to-r from-purple-50 to-fuchsia-50 rounded-xl p-4 border border-purple-200 animate-slide-up"
              style={{ animationDelay: "0.2s" }}
            >
              <p className="text-purple-800 text-sm font-medium flex items-center justify-center gap-2">
                <BookOpen className="w-4 h-4 flex-shrink-0" />
                Please read the following flyers carefully. They contain important info about our community, safety
                standards, and guidelines.
              </p>
            </div>

            {/* What you'll go through */}
            <div
              className="bg-gradient-to-r from-pink-50 to-fuchsia-50 rounded-xl p-4 border border-pink-100 animate-slide-up"
              style={{ animationDelay: "0.3s" }}
            >
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-fuchsia-500 animate-spin-slow" />
                <span className="text-base">{"What's"} Ahead</span>
                <Sparkles className="w-4 h-4 text-fuchsia-500 animate-spin-slow" />
              </h3>
              <div className="grid grid-cols-2 gap-2 text-left">
                {[
                  { label: "Follow & Download", count: "1 step", icon: Download, color: "from-purple-500 to-purple-600" },
                  { label: "Intro & Community", count: "5 flyers", icon: Users, color: "from-pink-500 to-pink-600" },
                  { label: "Safety Guidelines", count: "7 flyers", icon: Shield, color: "from-fuchsia-500 to-fuchsia-600" },
                  { label: "Safer Sex", count: "5 flyers", icon: HeartHandshake, color: "from-pink-600 to-fuchsia-500" },
                  { label: "Referral Program", count: "1 flyer", icon: Gift, color: "from-purple-600 to-fuchsia-500" },
                  { label: "Event Schedule", count: "2026 events", icon: Calendar, color: "from-purple-500 to-fuchsia-600" },
                  { label: "Text to Join", count: "Final step", icon: MessageSquare, color: "from-fuchsia-600 to-pink-500" },
                ].map((item, idx) => (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 bg-white rounded-lg p-2 animate-slide-up"
                    style={{ animationDelay: `${0.4 + idx * 0.05}s` }}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center flex-shrink-0`}
                    >
                      <item.icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{item.label}</p>
                      <p className="text-[10px] text-gray-500">{item.count}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const SocialActionStep = () => (
    <div
      className="max-w-lg mx-auto animate-fade-in"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-purple-500 via-pink-500 to-fuchsia-500 p-1 shadow-2xl shadow-purple-300/30">
        <FloatingBubbles />
        <div className="relative bg-white rounded-[22px] p-5 sm:p-7 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 via-transparent to-pink-50/50 animate-pulse-slow" />

          <div className="relative flex flex-col items-center text-center space-y-4">
            {/* Header icons row */}
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-purple-600 via-pink-500 to-fuchsia-500 flex items-center justify-center shadow-lg">
                <Instagram className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
              <div className="text-2xl font-bold text-gray-300">+</div>
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br from-fuchsia-600 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <Download className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-fuchsia-500 bg-clip-text text-transparent">
                Follow & Download
              </h2>
              <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">
                Two quick steps before you dive into the flyers.
              </p>
            </div>

            {/* Instagram Section */}
            <div className="w-full space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">1</span>
                </div>
                <h3 className="font-bold text-gray-800 text-sm">Follow on Instagram</h3>
              </div>

              <a
                href="https://instagram.com/soapies_playgroup"
                target="_blank"
                rel="noopener noreferrer"
                className="group w-full block bg-gradient-to-r from-purple-600 via-pink-500 to-fuchsia-500 hover:from-purple-700 hover:via-pink-600 hover:to-fuchsia-600 text-white rounded-xl p-3 text-center transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-pink-300/30"
              >
                <div className="flex items-center justify-center gap-2">
                  <Instagram className="w-5 h-5" />
                  <span className="font-bold">@Soapies_playgroup</span>
                  <ExternalLink className="w-3 h-3 opacity-70" />
                </div>
              </a>

              <div className="bg-red-50 rounded-xl p-3 border-2 border-red-300 shadow-sm">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Shield className="w-4 h-4 text-red-600" />
                  <span className="font-extrabold text-red-700 text-xs uppercase tracking-wide">Instagram Rules</span>
                </div>
                <ul className="space-y-1.5">
                  <li className="flex items-start gap-1.5">
                    <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    <span className="text-gray-800 text-xs font-bold leading-snug">
                      DM {"\""}playgroup{"\""} to request a follow
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    <span className="text-gray-800 text-xs font-bold leading-snug">
                      Do <span className="text-red-600 underline underline-offset-2">NOT</span> follow other members you {"haven't"} met in person
                    </span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    <span className="text-gray-800 text-xs font-bold leading-snug">
                      Turn on post notifications for event announcements
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-gradient-to-r from-transparent via-pink-200 to-transparent" />

            {/* Partiful Section */}
            <div className="w-full space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-500 flex items-center justify-center">
                  <span className="text-white text-xs font-bold">2</span>
                </div>
                <h3 className="font-bold text-gray-800 text-sm">Download Partiful</h3>
              </div>

              <p className="text-gray-500 text-xs leading-relaxed text-left">
                We use <span className="font-semibold text-purple-600">Partiful</span> for all event invites and RSVPs. Download it so you can receive invitations.
              </p>

              <div className="flex gap-2 w-full">
                <a
                  href="https://apps.apple.com/app/partiful-party-invitations/id1557524942"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 bg-gray-900 hover:bg-black text-white rounded-xl p-2.5 transition-all active:scale-[0.98] shadow-lg"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                  </svg>
                  <div className="text-left">
                    <div className="text-[8px] text-gray-400 leading-none">Download on the</div>
                    <div className="text-xs font-semibold leading-tight">App Store</div>
                  </div>
                </a>

                <a
                  href="https://play.google.com/store/apps/details?id=com.partiful.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 bg-gray-900 hover:bg-black text-white rounded-xl p-2.5 transition-all active:scale-[0.98] shadow-lg"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.61 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                  </svg>
                  <div className="text-left">
                    <div className="text-[8px] text-gray-400 leading-none">Get it on</div>
                    <div className="text-xs font-semibold leading-tight">Google Play</div>
                  </div>
                </a>
              </div>

              <div className="bg-fuchsia-50 rounded-lg p-2.5 border border-fuchsia-100">
                <p className="text-gray-600 text-xs leading-relaxed">
                  <span className="font-semibold text-fuchsia-700">Important:</span> Event invites are sent exclusively through Partiful. Enable notifications so you {"don't"} miss any events.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // All 2026 Soapies events
  const allEvents = [
    { date: "2026-01-24", name: "Sex Rave SD", theme: "Anything But Clothes", location: "San Diego", type: "rave" },
    { date: "2026-02-07", name: "Vegas House Party", theme: "Valentines and Vikings", location: "Las Vegas", type: "house" },
    { date: "2026-02-14", name: "SD House Party", theme: "Valentines and Vikings", location: "San Diego", type: "house" },
    { date: "2026-02-28", name: "Sex Rave SD", theme: "Valentines and Vikings", location: "San Diego", type: "rave" },
    { date: "2026-03-07", name: "Vegas House Party", theme: "Mardi Gras", location: "Las Vegas", type: "house" },
    { date: "2026-03-14", name: "SD House Party", theme: "Mardi Gras", location: "San Diego", type: "house" },
    { date: "2026-03-28", name: "Sex Rave SD", theme: "Mardi Gras", location: "San Diego", type: "rave" },
    { date: "2026-04-04", name: "Vegas House Party", theme: "Barbie", location: "Las Vegas", type: "house" },
    { date: "2026-04-11", name: "SD House Party", theme: "Barbie", location: "San Diego", type: "house" },
    { date: "2026-04-25", name: "Sex Rave SD", theme: "Barbie", location: "San Diego", type: "rave" },
    { date: "2026-05-02", name: "SD House Party", theme: "Cowboys and Aliens", location: "San Diego", type: "house" },
    { date: "2026-05-09", name: "Vegas House Party", theme: "Cowboys and Aliens", location: "Las Vegas", type: "house" },
    { date: "2026-05-16", name: "Sex Rave SD", theme: "Cowboys and Aliens", location: "San Diego", type: "rave" },
    { date: "2026-06-06", name: "Vegas House Party", theme: "Rainbow Road, Mario", location: "Las Vegas", type: "house" },
    { date: "2026-06-13", name: "SD House Party", theme: "Rainbow Road, Mario", location: "San Diego", type: "house" },
    { date: "2026-06-27", name: "Sex Rave SD", theme: "Rainbow Road, Mario", location: "San Diego", type: "rave" },
    { date: "2026-07-04", name: "Blacks Beach Party", theme: "Herogasm, Comic Con", location: "San Diego", type: "beach" },
    { date: "2026-07-11", name: "SD House Party", theme: "Herogasm, Comic Con", location: "San Diego", type: "house" },
    { date: "2026-07-17", name: "Vegas House Party", theme: "Herogasm, Comic Con", location: "Las Vegas", type: "house" },
    { date: "2026-07-25", name: "Sex Rave SD", theme: "Herogasm, Comic Con", location: "San Diego", type: "rave" },
    { date: "2026-08-01", name: "Blacks Beach Party", theme: "Circus", location: "San Diego", type: "beach" },
    { date: "2026-08-08", name: "SD House Party", theme: "Circus", location: "San Diego", type: "house" },
    { date: "2026-08-15", name: "Vegas House Party", theme: "Circus", location: "Las Vegas", type: "house" },
    { date: "2026-08-22", name: "Sex Rave SD", theme: "Circus", location: "San Diego", type: "rave" },
    { date: "2026-08-29", name: "Blacks Beach Party", theme: "Circus", location: "San Diego", type: "beach" },
    { date: "2026-09-11", name: "SD House Party", theme: "Disco", location: "San Diego", type: "house" },
    { date: "2026-09-13", name: "Blacks Beach Party", theme: "Disco", location: "San Diego", type: "beach" },
    { date: "2026-09-18", name: "Vegas House Party", theme: "Disco", location: "Las Vegas", type: "house" },
    { date: "2026-09-19", name: "Sex Rave SD", theme: "Disco", location: "San Diego", type: "rave" },
    { date: "2026-10-03", name: "Blacks Beach Party", theme: "Halloween", location: "San Diego", type: "beach" },
    { date: "2026-10-10", name: "SD House Party", theme: "Halloween", location: "San Diego", type: "house" },
    { date: "2026-10-17", name: "Vegas House Party", theme: "Halloween", location: "Las Vegas", type: "house" },
    { date: "2026-10-31", name: "Sex Rave SD", theme: "Halloween", location: "San Diego", type: "rave" },
    { date: "2026-11-07", name: "Vegas House Party", theme: "80's Goth Prom", location: "Las Vegas", type: "house" },
    { date: "2026-11-14", name: "SD House Party", theme: "80's Goth Prom", location: "San Diego", type: "house" },
    { date: "2026-11-21", name: "Sex Rave SD", theme: "80's Goth Prom", location: "San Diego", type: "rave" },
    { date: "2026-12-05", name: "Vegas House Party", theme: "Christmas", location: "Las Vegas", type: "house" },
    { date: "2026-12-12", name: "SD House Party", theme: "Christmas", location: "San Diego", type: "house" },
    { date: "2026-12-31", name: "Sex Rave SD", theme: "NYE", location: "San Diego", type: "rave" },
  ]

  // Schedule state hoisted to parent so hooks are always called
  const [scheduleNow, setScheduleNow] = useState(new Date())
  const [scheduleExpandedCard, setScheduleExpandedCard] = useState<string | null>(null)
  const [scheduleActiveFilter, setScheduleActiveFilter] = useState<string>("all")
  const scheduleScrollRef = useRef<HTMLDivElement>(null)
  const scheduleAutoScrollPaused = useRef(false)
  const schedulePauseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scheduleScrollDirection = useRef<"down" | "up">("down")

  useEffect(() => {
    const timer = setInterval(() => setScheduleNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Auto-scroll effect for schedule (hoisted)
  useEffect(() => {
    const el = scheduleScrollRef.current
    if (!el) return

    let raf: number
    const speed = 0.5

    const step = () => {
      if (!scheduleAutoScrollPaused.current && el) {
        const maxScroll = el.scrollHeight - el.clientHeight
        if (scheduleScrollDirection.current === "down") {
          el.scrollTop += speed
          if (el.scrollTop >= maxScroll - 1) {
            scheduleScrollDirection.current = "up"
          }
        } else {
          el.scrollTop -= speed
          if (el.scrollTop <= 0) {
            scheduleScrollDirection.current = "down"
          }
        }
      }
      raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [scheduleActiveFilter])

  // Pause schedule auto-scroll (hoisted)
  const schedulePauseAutoScroll = useCallback(() => {
    scheduleAutoScrollPaused.current = true
    if (schedulePauseTimeout.current) clearTimeout(schedulePauseTimeout.current)
    schedulePauseTimeout.current = setTimeout(() => {
      scheduleAutoScrollPaused.current = false
    }, 4000)
  }, [])

  const EventScheduleStep = () => {
    const now = scheduleNow
    const expandedCard = scheduleExpandedCard
    const setExpandedCard = setScheduleExpandedCard
    const activeFilter = scheduleActiveFilter
    const setActiveFilter = setScheduleActiveFilter
    const scrollRef = scheduleScrollRef
    const pauseAutoScroll = schedulePauseAutoScroll

    const upcomingEvents = allEvents.filter((e) => {
      const eventDate = new Date(e.date + "T23:59:59")
      return eventDate >= now
    })

    const filteredEvents = activeFilter === "all"
      ? upcomingEvents
      : upcomingEvents.filter((e) => e.type === activeFilter)

    const nextEvent = upcomingEvents[0]

    const getCountdown = () => {
      if (!nextEvent) return null
      const eventDate = new Date(nextEvent.date + "T20:00:00")
      const diff = eventDate.getTime() - now.getTime()
      if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      }
    }

    const countdown = getCountdown()

    const themeConfig: Record<string, { gradient: string; accent: string; bg: string }> = {
      "Anything But Clothes": { gradient: "from-rose-500 to-orange-500", accent: "text-rose-600", bg: "bg-rose-500" },
      "Valentines and Vikings": { gradient: "from-red-500 to-pink-500", accent: "text-red-600", bg: "bg-red-500" },
      "Mardi Gras": { gradient: "from-purple-600 to-yellow-500", accent: "text-purple-600", bg: "bg-purple-500" },
      "Barbie": { gradient: "from-pink-400 to-pink-600", accent: "text-pink-600", bg: "bg-pink-500" },
      "Cowboys and Aliens": { gradient: "from-amber-600 to-emerald-600", accent: "text-amber-600", bg: "bg-amber-600" },
      "Rainbow Road, Mario": { gradient: "from-red-500 via-yellow-400 to-green-500", accent: "text-green-600", bg: "bg-green-500" },
      "Herogasm, Comic Con": { gradient: "from-blue-600 to-red-500", accent: "text-blue-600", bg: "bg-blue-600" },
      "Circus": { gradient: "from-red-600 to-yellow-500", accent: "text-red-600", bg: "bg-red-600" },
      "Disco": { gradient: "from-violet-500 to-cyan-400", accent: "text-violet-600", bg: "bg-violet-500" },
      "Halloween": { gradient: "from-orange-500 to-gray-900", accent: "text-orange-600", bg: "bg-orange-500" },
      "80's Goth Prom": { gradient: "from-gray-800 to-purple-600", accent: "text-gray-700", bg: "bg-gray-800" },
      "Christmas": { gradient: "from-red-600 to-green-600", accent: "text-red-600", bg: "bg-red-600" },
      "NYE": { gradient: "from-yellow-400 to-fuchsia-500", accent: "text-yellow-600", bg: "bg-yellow-500" },
    }

    const typeLabels: Record<string, { label: string; color: string }> = {
      rave: { label: "RAVE", color: "bg-fuchsia-500 text-white" },
      house: { label: "HOUSE", color: "bg-pink-500 text-white" },
      beach: { label: "BEACH", color: "bg-purple-500 text-white" },
    }

    const getTheme = (theme: string) => themeConfig[theme] || { gradient: "from-pink-500 to-fuchsia-500", accent: "text-pink-600", bg: "bg-pink-500" }

    const formatShortDate = (dateStr: string) => {
      const d = new Date(dateStr + "T12:00:00")
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    }

    const getMonthLabel = (dateStr: string) => {
      const d = new Date(dateStr + "T12:00:00")
      return d.toLocaleDateString("en-US", { month: "long" })
    }

    const groupedByMonth: Record<string, typeof filteredEvents> = {}
    filteredEvents.forEach((event) => {
      const monthKey = getMonthLabel(event.date)
      if (!groupedByMonth[monthKey]) groupedByMonth[monthKey] = []
      groupedByMonth[monthKey].push(event)
    })

    const filterButtons = [
      { key: "all", label: "All" },
      { key: "house", label: "House" },
      { key: "rave", label: "Rave" },
      { key: "beach", label: "Beach" },
    ]

    return (
      <div
        className="max-w-lg mx-auto animate-fade-in"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-pink-400 via-fuchsia-500 to-purple-600 p-1 shadow-2xl shadow-pink-300/30">
          <FloatingBubbles />
          <div className="relative bg-white rounded-[22px] overflow-hidden">

            {/* Checkerboard background pattern */}
            <div className="absolute bottom-0 left-0 right-0 h-[60%] overflow-hidden opacity-[0.04] pointer-events-none" style={{ perspective: "300px" }}>
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `repeating-conic-gradient(#000 0% 25%, transparent 0% 50%)`,
                  backgroundSize: "30px 30px",
                  transform: "rotateX(60deg) translateY(-20%)",
                  transformOrigin: "center bottom",
                }}
              />
            </div>

            {/* Subtle grid pattern at the top */}
            <div
              className="absolute top-0 left-0 right-0 h-[40%] opacity-[0.03] pointer-events-none"
              style={{
                backgroundImage: `linear-gradient(#a855f7 1px, transparent 1px), linear-gradient(90deg, #a855f7 1px, transparent 1px)`,
                backgroundSize: "24px 24px",
              }}
            />

            {/* Header - sticky at top */}
            <div className="relative overflow-hidden px-5 pt-5 pb-3 z-10">
              <div className="absolute inset-0 bg-gradient-to-b from-fuchsia-50 via-white to-transparent" />
              <div className="relative text-center">
                <p className="text-fuchsia-400 text-[10px] font-bold uppercase tracking-[0.25em] mb-1">Soapies 2026</p>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Event Schedule</h2>
                <p className="text-gray-400 text-xs mt-1">{upcomingEvents.length} upcoming events</p>
              </div>
            </div>

            {/* Unified scrollable area */}
            <div
              ref={scrollRef}
              onTouchStart={pauseAutoScroll}
              onMouseDown={pauseAutoScroll}
              onWheel={pauseAutoScroll}
              className="max-h-[60vh] overflow-y-auto scrollbar-hide"
            >

            {/* Countdown - Bold & Animated */}
            {nextEvent && countdown && (
              <div className="mx-4 mb-4">
                {/* Outer shimmer border */}
                <div className="relative rounded-2xl bg-gradient-to-r from-fuchsia-500 via-pink-400 via-purple-500 to-fuchsia-500 p-[2px]">
                  <div className="relative bg-gradient-to-br from-gray-900 via-gray-950 to-gray-900 rounded-[14px] overflow-hidden">

                    {/* Animated background particles */}
                    <div className="absolute inset-0 overflow-hidden">
                      {[...Array(8)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute rounded-full animate-float"
                          style={{
                            width: `${6 + ((i * 13 + 3) % 20)}px`,
                            height: `${6 + ((i * 17 + 7) % 20)}px`,
                            left: `${(i * 37 + 11) % 100}%`,
                            top: `${(i * 53 + 19) % 100}%`,
                            animationDelay: `${i * 0.4}s`,
                            animationDuration: `${3 + ((i * 11 + 5) % 30) / 10}s`,
                            background: `radial-gradient(circle, ${
                              ["rgba(236,72,153,0.3)", "rgba(168,85,247,0.3)", "rgba(217,70,239,0.25)", "rgba(244,114,182,0.25)"][i % 4]
                            } 0%, transparent 70%)`,
                          }}
                        />
                      ))}
                      {/* Radial glow behind countdown numbers */}
                      <div className="absolute inset-0 bg-gradient-to-t from-fuchsia-600/10 via-transparent to-purple-600/10" />
                    </div>

                    <div className="relative p-5">
                      {/* Event name header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-fuchsia-400 animate-pulse-subtle" />
                            <span className="text-fuchsia-400 text-[10px] font-bold uppercase tracking-[0.2em]">Coming Up</span>
                          </div>
                          <h3 className="text-white font-black text-lg leading-tight">{nextEvent.name}</h3>
                          <p className="text-pink-300/80 text-xs font-semibold mt-0.5">{nextEvent.theme}</p>
                        </div>
                        <div className="animate-bounce">
                          <div className="bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg shadow-pink-500/30">
                            Up Next
                          </div>
                        </div>
                      </div>

                      {/* Location & Date bar */}
                      <div className="flex items-center gap-3 mb-4 bg-white/5 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-fuchsia-400" />
                          <span className="text-white/70 text-xs font-medium">{nextEvent.location}</span>
                        </div>
                        <div className="w-px h-3 bg-white/20" />
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-fuchsia-400" />
                          <span className="text-white/70 text-xs font-medium">
                            {new Date(nextEvent.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                          </span>
                        </div>
                      </div>

                      {/* Countdown numbers */}
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          { value: countdown.days, label: "DAYS" },
                          { value: countdown.hours, label: "HRS" },
                          { value: countdown.minutes, label: "MIN" },
                          { value: countdown.seconds, label: "SEC" },
                        ].map((unit, i) => (
                          <div key={unit.label} className="text-center">
                            <div className={cn(
                              "relative bg-gradient-to-b from-white/10 to-white/5 border border-white/10 rounded-2xl py-3 backdrop-blur-sm overflow-hidden",
                              i === 3 && "border-fuchsia-500/30"
                            )}>
                              {/* Top highlight */}
                              <div className="absolute top-0 left-2 right-2 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                              {/* Divider line */}
                              <div className="absolute top-1/2 left-0 right-0 h-px bg-black/20" />
                              <span className="relative text-2xl font-black text-white tabular-nums drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]">
                                {String(unit.value).padStart(2, "0")}
                              </span>
                            </div>
                            <span className="text-[9px] font-bold text-white/40 tracking-[0.15em] mt-1.5 block">{unit.label}</span>
                          </div>
                        ))}
                      </div>

                      {/* Separator dots */}
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-4 flex gap-[72px] pointer-events-none">
                        {[0, 1, 2].map((i) => (
                          <div key={i} className="flex flex-col gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-fuchsia-400/60" />
                            <div className="w-1 h-1 rounded-full bg-fuchsia-400/60" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Filter Pills */}
            <div className="flex items-center gap-2 px-4 mb-4 overflow-x-auto scrollbar-hide">
              {filterButtons.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setActiveFilter(f.key)}
                  className={cn(
                    "shrink-0 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 border",
                    activeFilter === f.key
                      ? "bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white border-transparent shadow-lg shadow-pink-200/40 scale-105"
                      : "bg-white text-gray-500 border-gray-200 hover:border-pink-300 hover:text-pink-500"
                  )}
                >
                  {f.label}
                </button>
              ))}
              <div className="shrink-0 w-2" />
            </div>

            {/* Scrollable Event Grid */}
            <div className="relative px-4 pb-4 space-y-5">
              {Object.entries(groupedByMonth).map(([month, events]) => (
                <div key={month}>
                  <div className="sticky top-0 z-10 backdrop-blur-md bg-white/90 py-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-pink-300 to-transparent" />
                      <span className="text-[11px] font-black text-fuchsia-600 uppercase tracking-[0.15em]">{month}</span>
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-pink-300 to-transparent" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {events.map((event, idx) => {
                      const eventDate = new Date(event.date + "T12:00:00")
                      const dayNum = eventDate.getDate()
                      const dayName = eventDate.toLocaleDateString("en-US", { weekday: "short" })
                      const isNext = nextEvent && event.date === nextEvent.date && event.name === nextEvent.name
                      const cardId = `${event.date}-${event.name}-${idx}`
                      const isExpanded = expandedCard === cardId
                      const theme = getTheme(event.theme)
                      const typeInfo = typeLabels[event.type] || { label: "EVENT", color: "bg-gray-500 text-white" }

                      return (
                        <button
                          key={cardId}
                          onClick={() => setExpandedCard(isExpanded ? null : cardId)}
                          className={cn(
                            "relative group text-left rounded-2xl overflow-hidden transition-all duration-300 active:scale-[0.97]",
                            isNext
                              ? "col-span-2"
                              : "",
                          )}
                          style={{ animationDelay: `${idx * 0.06}s` }}
                        >
                          {/* Card background */}
                          <div className={cn(
                            "absolute inset-0 bg-gradient-to-br opacity-90",
                            theme.gradient,
                          )} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                          {/* Content */}
                          <div className={cn(
                            "relative p-3 flex flex-col justify-between transition-all duration-300",
                            isNext ? "min-h-[110px]" : "min-h-[100px]",
                          )}>
                            {/* Top row: date + type */}
                            <div className="flex items-start justify-between">
                              <div className="bg-black/30 backdrop-blur-sm rounded-lg px-2 py-1">
                                <span className="text-white/70 text-[9px] font-bold uppercase block leading-none">{dayName}</span>
                                <span className="text-white text-lg font-black leading-none">{dayNum}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                {isNext && (
                                  <span className="text-[8px] font-black uppercase tracking-wider bg-white text-fuchsia-600 px-1.5 py-0.5 rounded-md">
                                    NEXT
                                  </span>
                                )}
                                <span className={cn("text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md", typeInfo.color)}>
                                  {typeInfo.label}
                                </span>
                              </div>
                            </div>

                            {/* Bottom: Name + Theme */}
                            <div className="mt-auto">
                              <p className="text-white font-extrabold text-sm leading-tight drop-shadow-lg">
                                {event.name}
                              </p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-white/60 shrink-0" />
                                <p className="text-white/80 text-[10px] font-semibold truncate">
                                  {event.theme}
                                </p>
                              </div>
                              {isNext && (
                                <div className="flex items-center gap-1 mt-1.5">
                                  <MapPin className="w-3 h-3 text-white/60" />
                                  <span className="text-white/60 text-[10px] font-medium">{event.location}</span>
                                </div>
                              )}
                            </div>

                            {/* Expanded detail overlay */}
                            <div className={cn(
                              "absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 p-3 transition-all duration-300 rounded-2xl",
                              isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"
                            )}>
                              <p className="text-white font-extrabold text-sm text-center">{event.name}</p>
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-fuchsia-400" />
                                <span className="text-white/90 text-xs font-medium">{formatShortDate(event.date)}</span>
                              </div>
                              <div className={cn("px-2.5 py-1 rounded-lg text-xs font-bold text-white", theme.bg)}>
                                {event.theme}
                              </div>
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-gray-400" />
                                <span className="text-gray-300 text-[10px]">{event.location}</span>
                              </div>
                            </div>
                          </div>

                          {/* Shimmer effect on hover */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
              {filteredEvents.length === 0 && (
                <div className="text-center py-10">
                  <PartyPopper className="w-10 h-10 text-pink-200 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm font-semibold">
                    {activeFilter === "all" ? "All 2026 events have passed." : `No upcoming ${activeFilter} events.`}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    {activeFilter === "all" ? "Stay tuned for 2027!" : "Try a different filter."}
                  </p>
                </div>
              )}
            </div>

            {/* Footer inside scroll */}
            <div className="px-4 pb-4">
              <div className="bg-gradient-to-r from-pink-50 to-fuchsia-50 border border-pink-200 rounded-xl p-3 text-center">
                <p className="text-gray-500 text-[11px] font-medium">
                  <span className="text-fuchsia-600 font-bold">Tickets required.</span>{" "}Dates & themes subject to change.
                </p>
              </div>
            </div>

            </div>{/* end unified scroll */}
          </div>
        </div>
      </div>
    )
  }

  const OutroStep = () => (
    <div
      className="max-w-lg mx-auto animate-fade-in"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-pink-400 via-fuchsia-500 to-purple-500 p-1 shadow-2xl shadow-pink-300/30">
        <FloatingBubbles />
        <div className="relative bg-white rounded-[22px] p-6 sm:p-8 overflow-hidden">
          {/* Confetti */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-float"
                style={{
                  left: `${(i * 29 + 7) % 100}%`,
                  top: "-20px",
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: `${2 + ((i * 13 + 3) % 20) / 10}s`,
                }}
              >
                {i % 3 === 0 ? (
                  <Heart className="w-3 h-3 text-pink-300 fill-pink-300" />
                ) : i % 3 === 1 ? (
                  <Sparkles className="w-3 h-3 text-purple-300" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-gradient-to-br from-fuchsia-400 to-purple-400" />
                )}
              </div>
            ))}
          </div>

          {/* Logo */}
          <div className="relative flex justify-center mb-4">
            <div className="animate-bounce-slow">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663460303717/FfTbhpP94ZvscRd7twWNT6/soapies-logo_cf3c72b2.png"
                alt="Soapies"
                className="h-14 w-auto drop-shadow-lg"
              />
            </div>
          </div>

          {/* Success */}
          <div className="relative flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-fuchsia-400 blur-2xl opacity-40 rounded-full animate-pulse" />
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-pink-500 to-fuchsia-500 flex items-center justify-center shadow-xl shadow-pink-300/50">
                <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-fuchsia-400 flex items-center justify-center animate-bounce">
                <Heart className="w-4 h-4 text-white fill-white" />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="relative text-center space-y-4">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-pink-600 via-fuchsia-600 to-purple-600 bg-clip-text text-transparent animate-slide-up">
              You Did It!
            </h1>

            <p
              className="text-gray-600 text-sm sm:text-base leading-relaxed animate-slide-up"
              style={{ animationDelay: "0.1s" }}
            >
              Thank you for taking the time to read through all our guidelines. We appreciate your commitment to being
              an amazing community member!
            </p>

            {/* Text Kellen to Join - PRIMARY CTA */}
            <div
              className="bg-gradient-to-br from-pink-50 via-fuchsia-50 to-purple-50 rounded-xl p-5 border border-pink-200 text-left space-y-4 animate-slide-up"
              style={{ animationDelay: "0.2s" }}
            >
              <h3 className="font-bold text-gray-800 text-center text-lg flex items-center justify-center gap-2">
                <MessageSquare className="w-5 h-5 text-fuchsia-500" />
                Text Us to Get Started
              </h3>

              <p className="text-gray-600 text-sm text-center">
                {"To complete your vetting process, text Kellen with the following info:"}
              </p>

              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-fuchsia-500 mt-0.5 shrink-0" />
                  <span><strong>3 clear photos</strong> (face & body, no nudes)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-fuchsia-500 mt-0.5 shrink-0" />
                  <span><strong>Name(s)</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-fuchsia-500 mt-0.5 shrink-0" />
                  <span><strong>Age(s)</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-fuchsia-500 mt-0.5 shrink-0" />
                  <span><strong>How you heard about us</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-fuchsia-500 mt-0.5 shrink-0" />
                  <span><strong>Quick bio</strong> about yourself</span>
                </li>
              </ul>

              {allFlyersViewed ? (
                <a
                  href="sms:6195083707"
                  className="group block bg-gradient-to-r from-pink-500 to-fuchsia-500 hover:from-pink-600 hover:to-fuchsia-600 text-white rounded-xl p-4 text-center transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-pink-300/40"
                >
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Phone className="w-5 h-5" />
                    <span className="font-bold text-lg">Text (619) 508-3707</span>
                  </div>
                  <span className="text-pink-100 text-sm flex items-center justify-center gap-1">
                    Opens your messaging app
                  </span>
                </a>
              ) : (
                <div className="block bg-gray-200 text-gray-400 rounded-xl p-4 text-center cursor-not-allowed">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Lock className="w-5 h-5" />
                    <span className="font-bold text-lg">Text (619) 508-3707</span>
                  </div>
                  <span className="text-gray-400 text-sm">
                    View all flyers to unlock ({flyerSteps.filter((s) => viewedSteps.has(s.id)).length} of {flyerSteps.length} viewed)
                  </span>
                </div>
              )}
            </div>

            <p
              className="text-gray-500 text-sm italic animate-slide-up flex items-center justify-center gap-2"
              style={{ animationDelay: "0.4s" }}
            >
              <Heart className="w-4 h-4 text-pink-400 fill-pink-400 animate-pulse" />
              We can{"'"}t wait to meet you and welcome you to the Soapies family!
              <Heart className="w-4 h-4 text-pink-400 fill-pink-400 animate-pulse" />
            </p>
          </div>
        </div>
      </div>
    </div>
  )

  const FlyerStep = () => {
    const flyer = currentStep as Step & { image: string; title: string; sectionName: string; subtitle: string; description: string }
    const flyerContent = getFlyerContent(flyer.id)

    return (
      <div
        className={cn(
          "relative max-w-lg mx-auto transition-all duration-300",
          isAnimating && slideDirection === "right" && "translate-x-4 opacity-0",
          isAnimating && slideDirection === "left" && "-translate-x-4 opacity-0",
          !isAnimating && "translate-x-0 opacity-100",
        )}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Viewed badge */}
        {viewedSteps.has(flyer.id) && (
          <div className="absolute -top-1 left-3 z-20 px-2.5 py-1 rounded-full bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white text-xs font-medium flex items-center gap-1 shadow-lg animate-scale-in">
            <Check className="w-3 h-3" />
            Viewed
          </div>
        )}

        {/* Card with themed background */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-pink-400 via-fuchsia-500 to-purple-600 p-[2px] shadow-2xl shadow-pink-300/30">
          <div className="relative rounded-[22px] overflow-hidden">

            {/* Themed full-card background */}
            <div className={cn("absolute inset-0 bg-gradient-to-br", flyerContent.bgGradient)} />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-white/30" />

            {/* Header bar */}
            <div className={cn("relative overflow-hidden px-5 pt-4 pb-3", `bg-gradient-to-r ${flyerContent.headerGradient}`)}>
              <div className="absolute inset-0 bg-black/10" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                    {flyerContent.headerIcon}
                  </div>
                  <div>
                    <p className="text-white/80 text-[10px] font-bold uppercase tracking-widest">{flyer.sectionName}</p>
                    <p className="text-white text-xs font-semibold">{flyer.subtitle}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <img
                    src="https://d2xsxph8kpxj0f.cloudfront.net/310519663460303717/FfTbhpP94ZvscRd7twWNT6/soapies-logo_cf3c72b2.png"
                    alt="Soapies"
                    className="h-9 w-auto drop-shadow-lg"
                  />
                </div>
              </div>
            </div>

            {/* Scrollable content body */}
            <div className="relative max-h-[55vh] overflow-y-auto px-5 py-4 scrollbar-hide">
              <FlyerContentBody flyerId={flyer.id} contextValue={expandGate.contextValue} />
            </div>

            {/* Bottom fade */}
            <div className={cn("pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white/90 to-transparent rounded-b-[22px]")} />
          </div>
        </div>

        {/* Navigation buttons */}
        <button
          onClick={prevSlide}
          disabled={isFirstStep || isAnimating}
          className={cn(
            "absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/3 p-3.5 rounded-full shadow-xl transition-all duration-200 z-10",
            isFirstStep || isAnimating
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-white/95 text-gray-700 hover:bg-white hover:scale-110 active:scale-95 hover:shadow-2xl",
          )}
          aria-label="Previous"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={nextSlide}
          disabled={isLastStep || isAnimating || expandsBlocking}
          className={cn(
            "absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/3 p-3.5 rounded-full shadow-xl transition-all duration-200 z-10",
            isLastStep || isAnimating || expandsBlocking
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white hover:from-pink-600 hover:to-fuchsia-600 hover:scale-110 active:scale-95 hover:shadow-2xl hover:shadow-pink-300/50",
          )}
          aria-label="Next"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    )
  }

  const getCurrentSectionLabel = () => {
    if (currentStep?.type === "intro") return "Getting Started"
    if (currentStep?.type === "schedule") return "Event Schedule"
    if (currentStep?.type === "outro") return "Next Steps"
    if (currentStep?.type === "action") {
      return "Follow & Download"
    }
    return (currentStep as any)?.sectionName || ""
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-fuchsia-50 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-gradient-to-br from-pink-200/30 to-purple-200/30 animate-float"
            style={{
              width: `${80 + i * 40}px`,
              height: `${80 + i * 40}px`,
              left: `${10 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${8 + i * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-pink-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310519663460303717/FfTbhpP94ZvscRd7twWNT6/soapies-logo_cf3c72b2.png"
                alt="Soapies"
                className="h-9 w-auto drop-shadow-md hover:scale-105 transition-transform"
              />
              <div>
                <h1 className="text-sm sm:text-base font-bold text-gray-900">Welcome Guide</h1>
                <p className="text-xs text-gray-500">
                  {currentIndex + 1} of {steps.length} {" • "}
                  {getCurrentSectionLabel()}
                </p>
              </div>
            </div>
            {allFlyersViewed ? (
              <a href="sms:6195083707">
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-pink-500 to-fuchsia-500 hover:from-pink-600 hover:to-fuchsia-600 text-white shadow-lg shadow-pink-200/50 hover:shadow-xl transition-all hover:scale-105 active:scale-95"
                >
                  <Phone className="w-4 h-4 mr-1" />
                  Text Us
                </Button>
              </a>
            ) : (
              <Button
                size="sm"
                disabled
                className="bg-gray-200 text-gray-400 cursor-not-allowed"
              >
                <Lock className="w-4 h-4 mr-1" />
                Text Us
              </Button>
            )}
          </div>
          <div className="relative">
            <div className="h-2 bg-pink-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-fuchsia-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Section indicators */}
      <div ref={sectionNavRef} className="sticky top-[72px] z-30 bg-white/80 backdrop-blur-sm border-b border-pink-50 py-2 px-4 overflow-x-auto scrollbar-hide">
        <div className="flex gap-2 max-w-3xl mx-auto justify-start sm:justify-center">
          {sections.map((section) => {
            const isActive = currentSection === section.id
            const sectionSteps = steps.filter((s) => {
              if (section.id === 0) return s.type === "intro"
              if (section.id === 10) return s.type === "action"
              if (section.id === 7) return s.type === "schedule"
              if (section.id === 6) return s.type === "outro"
              return s.type === "flyer" && (s as any).section === section.id
            })
            const viewedInSection = sectionSteps.filter((s) => viewedSteps.has(s.id)).length
            const isComplete = viewedInSection === sectionSteps.length && sectionSteps.length > 0

            return (
              <button
                key={section.id}
                ref={isActive ? activeSectionRef : undefined}
                onClick={() => {
                  const firstStepInSection = steps.findIndex((s) => {
                    if (section.id === 0) return s.type === "intro"
                    if (section.id === 10) return s.type === "action"
                    if (section.id === 7) return s.type === "schedule"
                    if (section.id === 6) return s.type === "outro"
                    return s.type === "flyer" && (s as any).section === section.id
                  })
                  if (firstStepInSection !== -1) goToStep(firstStepInSection)
                }}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-300",
                  isActive
                    ? "bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white shadow-lg shadow-pink-200/50 scale-105"
                    : isComplete
                      ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                      : "bg-gray-100 text-gray-600 hover:bg-pink-100 hover:text-pink-700",
                )}
              >
                {isComplete && !isActive && <Check className="w-3 h-3" />}
                {section.name}
              </button>
            )
          })}
        </div>
      </div>

      {/* Main content */}
      <main className="relative px-4 py-6 sm:py-8 pb-28">
        <div className="max-w-3xl mx-auto">
          {currentStep?.type === "intro" && IntroStep()}
          {currentStep?.type === "action" && SocialActionStep()}
          {currentStep?.type === "flyer" && FlyerStep()}
          {currentStep?.type === "schedule" && EventScheduleStep()}
          {currentStep?.type === "outro" && OutroStep()}
        </div>
      </main>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-pink-100 p-4 shadow-[0_-4px_20px_rgba(236,72,153,0.1)]">
        <div className="max-w-3xl mx-auto">
          {/* Expand progress indicator */}
          {expandsBlocking && (
            <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-pink-50 border border-pink-200/60 mb-3">
              <ChevronDown className="w-4 h-4 text-pink-500" />
              <p className="text-pink-600 text-xs font-semibold">
                Open all dropdowns to continue
              </p>
            </div>
          )}

          {/* Continue button */}
          <Button
            onClick={
              expandsBlocking
                ? undefined
                : isLastStep && allFlyersViewed
                  ? () => window.open("sms:6195083707", "_self")
                  : isLastStep
                    ? undefined
                    : nextSlide
            }
            disabled={isAnimating || expandsBlocking || (isLastStep && !allFlyersViewed)}
            className={cn(
              "w-full h-12 text-base font-semibold transition-all duration-300 shadow-xl",
              expandsBlocking
                ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                : isLastStep && !allFlyersViewed
                  ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"
                  : isLastStep
                    ? "bg-gradient-to-r from-fuchsia-500 to-purple-500 hover:from-fuchsia-600 hover:to-purple-600 shadow-purple-200/50"
                    : "bg-gradient-to-r from-pink-500 to-fuchsia-500 hover:from-pink-600 hover:to-fuchsia-600 shadow-pink-200/50",
            )}
          >
            {expandsBlocking
              ? "Open all dropdowns"
              : isLastStep && allFlyersViewed
                ? "Text Us to Join"
                : isLastStep
                  ? `View all flyers (${flyerSteps.filter((s) => viewedSteps.has(s.id)).length}/${flyerSteps.length})`
                  : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default WelcomeFlyersClient
