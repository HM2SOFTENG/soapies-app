# Soapies - Project TODO

## Database Schema
- [x] Core user/profile tables (profiles, application_photos, application_logs)
- [x] Relationship & partner tables (relationship_groups, partner_invitations)
- [x] Events system tables (events, reservations, tickets, addons, pricing)
- [x] Event operations tables (operators, shifts, checklist, feedback)
- [x] Messaging system tables (conversations, messages, reactions, presence)
- [x] Community/social tables (wall_posts, likes, comments, announcements)
- [x] Notification system tables (notifications, queue, preferences, push)
- [x] Admin/operations tables (audit_logs, settings, groups, waivers, credits)
- [x] Push schema to database

## Theme & Design
- [x] Set up pink/purple theme from Soapies logo
- [x] Add Google Fonts (display + body)
- [x] Upload logo to CDN and set as app logo
- [x] Generate hero images and visual assets

## Core Layout & Navigation
- [x] Public landing page with community branding
- [x] Top navigation with auth state
- [x] Auth flow integration (login/signup)
- [ ] Community landing pages (/c/soapies, /c/groupies, /c/gaypeez)
- [ ] Application/onboarding multi-step form

## Member Features
- [x] Member dashboard with overview
- [x] Events listing and detail pages
- [x] Event reservation flow
- [x] Profile view and edit
- [x] Real-time messaging (DMs, groups, channels)
- [x] Community wall (posts, likes, comments)
- [x] Referral system
- [x] Notification preferences

## Admin Dashboard
- [x] Admin layout with sidebar
- [x] Application review queue
- [x] Member management
- [x] Event management (create, edit, operations)
- [x] Settings and feature flags
- [ ] Reservation management (admin view)
- [ ] Analytics dashboard (charts)

## Polish & Testing
- [x] Write vitest tests (37 tests passing)
- [x] Responsive mobile views
- [x] Loading states and empty states
- [x] Error handling

## Mobile-First & Animation Requirements
- [x] Mobile-first responsive design throughout
- [x] Framer Motion page transitions and entrance animations
- [x] Playful micro-interactions (hover, tap, swipe)
- [x] Fun, sexy, modern UI aesthetic
- [x] Animated cards, buttons, and navigation
- [x] Smooth scroll animations and parallax effects
- [x] Engaging loading states with branded animations

## Bug Fixes
- [x] Fix referrals.myCode query returning undefined on /dashboard (TanStack Query error)
- [x] Fix uncontrolled page refreshing/reload loop
- [x] User visual edit: Navbar container background changed to #f000bc (vibrant pink)

## Events Feature Enhancement
- [x] Extract event dates from flyer images
- [x] Create seed script to populate database with real events (39 events seeded)
- [x] Build marketing-focused Events page with countdown timer for next event
- [x] Auto-scrolling animated event card list
- [x] Next event prominently displayed at top with hero countdown
- [x] Get Tickets button on each event card
- [x] Ticket pricing: $40 single women, $130 couples, $145 single men
- [x] Update Home page event showcase to pull from real DB events

## Event Detail Page & Reservation Form
- [x] Full event detail page with hero image, countdown, description, venue, date/time
- [x] Ticket type selection: Single Woman ($40), Couple ($130), Single Man ($145)
- [x] Quantity picker for each ticket type with animated +/- controls
- [x] Live order total calculation with animated summary
- [x] Reservation form with animated transitions and success overlay
- [x] Mobile-first responsive layout (stacked on mobile, 2-col on desktop)
- [x] Back navigation to events list

## Full UI/UX Overhaul - Premium Redesign
- [x] Overhaul index.css with premium glassmorphism, animated gradients, depth system
- [x] Redesign Navbar with glassmorphism, animated logo, scroll-aware effects
- [x] Redesign PageWrapper with richer transitions and floating particles
- [x] Redesign Home page: immersive hero with parallax, animated stats counter, testimonial carousel, interactive feature cards
- [x] Redesign Events page: premium card design, animated filters, immersive countdown hero
- [x] Redesign EventDetail page: cinematic hero, interactive ticket selector, animated sections
- [x] Redesign Dashboard: animated stat cards, activity feed, progress rings, glassmorphic panels
- [x] Redesign Profile page: avatar upload area, animated form sections, visual identity
- [x] Redesign Wall/Community: social media-style feed, animated reactions, rich post cards
- [x] Redesign Messages: modern chat bubbles, typing indicators, conversation list polish
- [x] Redesign Admin pages: modern data tables, chart visualizations, glassmorphic sidebar
- [x] Add floating particle system / ambient animations
- [x] Add scroll-triggered animations throughout
- [x] Add haptic-feel micro-interactions on all buttons and cards

## Multi-Step Application/Onboarding Form
- [x] Step 1: Welcome & basic info (display name, gender, date of birth, phone)
- [x] Step 2: About you (bio, orientation, relationship status, location, community)
- [x] Step 3: Photo upload (1-6 photos with S3 integration)
- [x] Step 4: Community preferences (interests, what you're looking for)
- [x] Step 5: Agreement & submission (community guidelines, waiver, review summary)
- [x] Animated step transitions with progress indicator and step icons
- [x] Backend: profile upsert, photo upload/delete, application submission
- [x] Application status page (pending/approved/waitlisted/rejected)
- [x] Mobile-first responsive design with premium glassmorphism
- [x] Tests for application flow (37 total tests passing)

## Auto-Redirect New Users to Application Form
- [x] Create useProfileStatus hook to check if user has completed profile
- [x] Create RequireProfile route guard component with animated loading/redirect states
- [x] Wrap protected pages (Dashboard, Profile, Wall, Messages) with route guard
- [x] Skip redirect for admin users
- [x] Handle loading states during profile check
- [x] All 37 tests passing

## Email & SMS Notifications on Application Approval
- [x] Review existing notification system and built-in APIs
- [x] Create unified notification service (in-app + email + SMS)
- [x] In-app notifications: create, list, mark read (works immediately)
- [x] Email notifications via SendGrid (activates when API key provided)
- [x] SMS notifications via Twilio (activates when API key provided)
- [x] Integrate notifications into admin application approval flow
- [x] Send welcome email when application is approved
- [x] Send SMS notification when application is approved
- [x] Add in-app notification bell/dropdown in Navbar
- [x] Add notification preferences to user settings
- [x] Write tests for notification flow (52 tests total passing)

## Enhanced Profile Page with Application Status & Notification Preferences
- [x] Personal Info tab with editable form fields and save functionality
- [x] Application Status tab with visual progress stepper and animated timeline
- [x] Notification Preferences tab with per-category channel toggles (in-app/email/SMS/push)
- [x] Photos Gallery tab with upload, preview lightbox, and delete
- [x] Animated tab transitions with AnimatePresence
- [x] Mobile-first responsive layout with premium glassmorphism
- [x] Backend: notification preferences upsert procedure, application timeline logs
- [x] Write tests for new profile features (60 tests passing across 3 files)
