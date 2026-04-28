/**
 * Soapies App — Test User Seed Script
 * Creates 30 realistic test user profiles with full activity data for admin workflow testing.
 * Idempotent: skips if test users already exist.
 *
 * Run: node seed-test-users.mjs
 */

import mysql from 'mysql2/promise';

const DB_URL = process.env.DATABASE_URL;

// Static bcrypt hash for "TestPass123!"
const PASSWORD_HASH = '$2b$12$K4wGSO5i9RVB.4WYxZGBjeOujFXiDAWGQxAP3VbKSHLMVfSl8aaNG';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function hoursAgo(n) {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d;
}

function fmt(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function buildMembershipState(userNumber, isApproved) {
  if (!isApproved) {
    return null;
  }

  const pattern = userNumber % 10;
  const base = {
    activatedAt: fmt(daysAgo(30 + (userNumber % 10))),
  };

  if (pattern === 0 || pattern === 5) {
    return {
      ...base,
      tierKey: 'inner_circle',
      status: pattern === 5 ? 'complimentary' : 'active',
      interval: 'year',
      currentPeriodEnd: fmt(daysFromNow(240)),
      stripeCustomerId: pattern === 5 ? null : `cus_seed_${userNumber}`,
      stripeSubscriptionId: pattern === 5 ? null : `sub_seed_inner_${userNumber}`,
    };
  }

  if (pattern === 2 || pattern === 3 || pattern === 7) {
    return {
      ...base,
      tierKey: 'connect',
      status: pattern === 7 ? 'trialing' : 'active',
      interval: 'month',
      currentPeriodEnd: fmt(daysFromNow(pattern === 7 ? 10 : 28)),
      stripeCustomerId: `cus_seed_${userNumber}`,
      stripeSubscriptionId: `sub_seed_connect_${userNumber}`,
    };
  }

  return {
    ...base,
    tierKey: 'community',
    status: 'inactive',
    interval: null,
    currentPeriodEnd: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
  };
}

// ─── User definitions ─────────────────────────────────────────────────────────
// Index 0-19: approved (20)
// Index 20-23: submitted/pending (4)
// Index 24-26: under_review (3)
// Index 27-28: rejected (2)
// Index 29: waitlisted (1)

const USER_DEFS = [
  // ── Approved users (0–19) ──
  { n: 1,  firstName: 'Jordan',   lastName: 'Reyes',     gender: 'non-binary',   orientation: 'queer',      community: 'soapies',  role: 'user',   appStatus: 'approved', memberRole: 'angel' },
  { n: 2,  firstName: 'Alexa',    lastName: 'Fontaine',  gender: 'female',       orientation: 'bisexual',   community: 'soapies',  role: 'user',   appStatus: 'approved', memberRole: 'member' },
  { n: 3,  firstName: 'Marcus',   lastName: 'Webb',      gender: 'male',         orientation: 'straight',   community: 'groupus',  role: 'user',   appStatus: 'approved', memberRole: 'member' },
  { n: 4,  firstName: 'Priya',    lastName: 'Sharma',    gender: 'female',       orientation: 'lesbian',    community: 'gaypeez',  role: 'user',   appStatus: 'approved', memberRole: 'angel' },
  { n: 5,  firstName: 'Dante',    lastName: 'Cruz',      gender: 'male',         orientation: 'gay',        community: 'gaypeez',  role: 'user',   appStatus: 'approved', memberRole: 'member' },
  { n: 6,  firstName: 'Sofia',    lastName: 'Mendez',    gender: 'trans female', orientation: 'pansexual',  community: 'soapies',  role: 'user',   appStatus: 'approved', memberRole: 'member', suspended: true },
  { n: 7,  firstName: 'Riley',    lastName: 'Park',      gender: 'non-binary',   orientation: 'queer',      community: 'groupus',  role: 'user',   appStatus: 'approved', memberRole: 'member' },
  { n: 8,  firstName: 'Camille',  lastName: 'Dubois',    gender: 'female',       orientation: 'bisexual',   community: 'soapies',  role: 'user',   appStatus: 'approved', memberRole: 'angel' },
  { n: 9,  firstName: 'Theo',     lastName: 'Nakamura',  gender: 'male',         orientation: 'gay',        community: 'gaypeez',  role: 'user',   appStatus: 'approved', memberRole: 'member' },
  { n: 10, firstName: 'Zara',     lastName: 'Ahmed',     gender: 'female',       orientation: 'straight',   community: 'groupus',  role: 'user',   appStatus: 'approved', memberRole: 'member' },
  { n: 11, firstName: 'Felix',    lastName: 'Okonkwo',   gender: 'trans male',   orientation: 'queer',      community: 'soapies',  role: 'user',   appStatus: 'approved', memberRole: 'member' },
  { n: 12, firstName: 'Luna',     lastName: 'Vasquez',   gender: 'female',       orientation: 'pansexual',  community: 'gaypeez',  role: 'user',   appStatus: 'approved', memberRole: 'member' },
  { n: 13, firstName: 'Kieran',   lastName: 'Blake',     gender: 'male',         orientation: 'bisexual',   community: 'groupus',  role: 'user',   appStatus: 'approved', memberRole: 'member' },
  { n: 14, firstName: 'Mia',      lastName: 'Tanaka',    gender: 'female',       orientation: 'lesbian',    community: 'soapies',  role: 'user',   appStatus: 'approved', memberRole: 'member' },
  { n: 15, firstName: 'Ezra',     lastName: 'Collins',   gender: 'non-binary',   orientation: 'queer',      community: 'gaypeez',  role: 'user',   appStatus: 'approved', memberRole: 'angel' },
  { n: 16, firstName: 'Nadia',    lastName: 'Petrov',    gender: 'female',       orientation: 'straight',   community: 'soapies',  role: 'user',   appStatus: 'approved', memberRole: 'member' },
  { n: 17, firstName: 'Luca',     lastName: 'Ferrari',   gender: 'male',         orientation: 'straight',   community: 'groupus',  role: 'user',   appStatus: 'approved', memberRole: 'member' },
  { n: 18, firstName: 'Imani',    lastName: 'Jackson',   gender: 'female',       orientation: 'bisexual',   community: 'gaypeez',  role: 'user',   appStatus: 'approved', memberRole: 'member' },
  { n: 19, firstName: 'Sasha',    lastName: 'Volkov',    gender: 'trans female', orientation: 'queer',      community: 'soapies',  role: 'user',   appStatus: 'approved', memberRole: 'member' },
  { n: 20, firstName: 'Omar',     lastName: 'Hassan',    gender: 'male',         orientation: 'gay',        community: 'gaypeez',  role: 'user',   appStatus: 'approved', memberRole: 'member' },
  // ── Submitted/pending (20–23, mapped to n=21..24) ──
  { n: 21, firstName: 'Harper',   lastName: 'Singh',     gender: 'female',       orientation: 'bisexual',   community: 'soapies',  role: 'user',   appStatus: 'submitted',    memberRole: 'pending' },
  { n: 22, firstName: 'Rowan',    lastName: 'Mitchell',  gender: 'non-binary',   orientation: 'pansexual',  community: 'groupus',  role: 'user',   appStatus: 'submitted',    memberRole: 'pending' },
  { n: 23, firstName: 'Valeria',  lastName: 'Ruiz',      gender: 'female',       orientation: 'straight',   community: 'gaypeez',  role: 'user',   appStatus: 'submitted',    memberRole: 'pending' },
  { n: 24, firstName: 'Axel',     lastName: 'Brennan',   gender: 'male',         orientation: 'straight',   community: 'soapies',  role: 'user',   appStatus: 'submitted',    memberRole: 'pending' },
  // ── Under review (24–26, mapped to n=25..27) ──
  { n: 25, firstName: 'Zoe',      lastName: 'Laurent',   gender: 'female',       orientation: 'lesbian',    community: 'soapies',  role: 'user',   appStatus: 'under_review', memberRole: 'pending', interviewScheduled: true },
  { n: 26, firstName: 'Malik',    lastName: 'Thompson',  gender: 'male',         orientation: 'gay',        community: 'gaypeez',  role: 'user',   appStatus: 'under_review', memberRole: 'pending' },
  { n: 27, firstName: 'Ingrid',   lastName: 'Svensson',  gender: 'female',       orientation: 'bisexual',   community: 'groupus',  role: 'user',   appStatus: 'under_review', memberRole: 'pending' },
  // ── Rejected (27–28, mapped to n=28..29) ──
  { n: 28, firstName: 'Derek',    lastName: 'Holt',      gender: 'male',         orientation: 'straight',   community: 'soapies',  role: 'user',   appStatus: 'rejected',     memberRole: 'pending' },
  { n: 29, firstName: 'Cassidy',  lastName: 'Monroe',    gender: 'female',       orientation: 'straight',   community: 'groupus',  role: 'user',   appStatus: 'rejected',     memberRole: 'pending' },
  // ── Waitlisted (29, mapped to n=30) ──
  { n: 30, firstName: 'Phoenix',  lastName: 'Gray',      gender: 'non-binary',   orientation: 'queer',      community: 'gaypeez',  role: 'user',   appStatus: 'waitlisted',   memberRole: 'pending' },
];

const ADMIN_WORKFLOW_NOTES = {};

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const conn = await mysql.createConnection({
    uri: DB_URL,
    ssl: { rejectUnauthorized: false },
    multipleStatements: false,
  });

  console.log('✅ Connected to database');

  // ── 1. Idempotency check ──────────────────────────────────────────────────
  const [existingRows] = await conn.execute(
    'SELECT COUNT(*) as cnt FROM users WHERE email LIKE ?',
    ['%@testuser.soapies']
  );
  if (existingRows[0].cnt > 0) {
    console.log(`⚠️  Test users already exist (${existingRows[0].cnt} found). Skipping seed.`);
    console.log('   To re-seed, delete them first: DELETE FROM users WHERE email LIKE "%@testuser.soapies"');
    await conn.end();
    return;
  }

  // ── 2. Fetch real event IDs ───────────────────────────────────────────────
  const [eventRows] = await conn.execute(
    'SELECT id, title, startDate, status, capacity, communityId FROM events ORDER BY startDate DESC LIMIT 50'
  );
  if (eventRows.length === 0) {
    console.error('❌ No events found in database. Please seed events first.');
    await conn.end();
    return;
  }
  console.log(`📅 Found ${eventRows.length} events`);

  // Fetch admin user ID
  const [adminRows] = await conn.execute(
    "SELECT id FROM users WHERE email = 'admin@soapiesplaygrp.club' LIMIT 1"
  );
  const adminUserId = adminRows[0]?.id ?? 1;

  // Track counts for summary
  const insertCounts = {};
  function track(table, n = 1) {
    insertCounts[table] = (insertCounts[table] || 0) + n;
  }

  // ── 3. Insert Users ───────────────────────────────────────────────────────
  const userIds = {};    // n -> userId
  const profileIds = {}; // n -> profileId

  console.log('\n👤 Inserting 30 test users...');
  for (const u of USER_DEFS) {
    const email = `user${u.n}@testuser.soapies`;
    const openId = `test_user_${u.n}`;
    const isSuspended = u.suspended ? 1 : 0;
    const role = u.role;

    const [res] = await conn.execute(
      `INSERT INTO users (openId, name, email, passwordHash, emailVerified, loginMethod, role, isSuspended, createdAt, updatedAt, lastSignedIn)
       VALUES (?, ?, ?, ?, 1, 'password', ?, ?, ?, ?, ?)`,
      [
        openId,
        `${u.firstName} ${u.lastName}`,
        email,
        PASSWORD_HASH,
        role,
        isSuspended,
        fmt(daysAgo(60 - u.n)),
        fmt(daysAgo(60 - u.n)),
        fmt(daysAgo(Math.floor(Math.random() * 5))),
      ]
    );
    userIds[u.n] = res.insertId;
    track('users');
  }
  console.log(`   ✓ ${USER_DEFS.length} users inserted`);

  // ── 4. Insert Profiles ────────────────────────────────────────────────────
  console.log('\n📋 Inserting profiles...');

  // Referral codes we'll use (for referred users)
  const REFERRAL_CODE_MAP = {
    1: 'SOAP-JR-001',
    4: 'GAYPE-PS-004',
    8: 'SOAP-CD-008',
    15: 'GAYPE-EC-015',
    18: 'GAYPE-IJ-018',
  };

  for (const u of USER_DEFS) {
    const isApproved = u.appStatus === 'approved';
    const approvedAt = isApproved ? fmt(daysAgo(45 - u.n)) : null;

    // Referred users: 2, 9, 13 were referred
    const referredByCode = u.n === 2 ? 'SOAP-JR-001'
                         : u.n === 9 ? 'GAYPE-PS-004'
                         : u.n === 13 ? 'SOAP-CD-008'
                         : null;
    const referredByUserId = u.n === 2 ? userIds[1]
                           : u.n === 9 ? userIds[4]
                           : u.n === 13 ? userIds[8]
                           : null;
    // User 9 has referralConverted = true
    const referralConverted = u.n === 9 ? 1 : 0;
    const referralConvertedAt = u.n === 9 ? fmt(daysAgo(30)) : null;

    const waiverSignedAt = isApproved ? fmt(daysAgo(44 - u.n)) : null;
    const appPhase = u.interviewScheduled ? 'interview_scheduled' : null;
    const preferences = JSON.stringify({
      membership: buildMembershipState(u.n, isApproved),
    });

    const [res] = await conn.execute(
      `INSERT INTO profiles
         (userId, displayName, bio, gender, orientation, communityId, memberRole, applicationStatus,
          applicationPhase, isProfileComplete, approvedAt, approvedBy, waiverSignedAt, waiverVersion,
          profileSetupComplete, referredByCode, referredByUserId, referralConverted, referralConvertedAt,
          preferences, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userIds[u.n],
        `${u.firstName} ${u.lastName.charAt(0)}.`,
        `Hi, I'm ${u.firstName}! ${isApproved ? 'Excited to be part of this community.' : 'Looking forward to joining!'}`,
        u.gender,
        u.orientation,
        u.community,
        u.memberRole,
        u.appStatus,
        appPhase,
        isApproved ? 1 : 0,
        approvedAt,
        isApproved ? adminUserId : null,
        waiverSignedAt,
        isApproved ? '1.0' : null,
        isApproved ? 1 : 0,
        referredByCode,
        referredByUserId,
        referralConverted,
        referralConvertedAt,
        preferences,
        fmt(daysAgo(60 - u.n)),
        fmt(daysAgo(5)),
      ]
    );
    profileIds[u.n] = res.insertId;
    track('profiles');
  }
  console.log(`   ✓ ${USER_DEFS.length} profiles inserted`);

  // ── 5. Application workflow data (non-approved users) ─────────────────────
  console.log('\n📝 Inserting application workflow data...');

  const nonApprovedUsers = USER_DEFS.filter(u => u.appStatus !== 'approved');
  let appPhotosCount = 0;
  let appLogsCount = 0;
  let introCallsCount = 0;

  for (const u of nonApprovedUsers) {
    const pid = profileIds[u.n];

    // Application photos (2-3)
    const photoCount = u.n <= 24 ? 2 : 3;
    for (let i = 0; i < photoCount; i++) {
      const photoStatus = u.appStatus === 'rejected' ? 'rejected' : 'pending';
      await conn.execute(
        `INSERT INTO application_photos (profileId, photoUrl, sortOrder, status, createdAt)
         VALUES (?, ?, ?, ?, ?)`,
        [
          pid,
          `https://storage.soapies.app/test/app-photos/user${u.n}-photo${i + 1}.jpg`,
          i,
          photoStatus,
          fmt(daysAgo(20 - u.n + 21)),
        ]
      );
      appPhotosCount++;
    }

    // Application logs
    const logActions = u.appStatus === 'submitted'
      ? [{ action: 'application_submitted', prev: 'draft', next: 'submitted' }]
      : u.appStatus === 'under_review'
      ? [
          { action: 'application_submitted', prev: 'draft', next: 'submitted' },
          { action: 'moved_to_review', prev: 'submitted', next: 'under_review' },
        ]
      : u.appStatus === 'rejected'
      ? [
          { action: 'application_submitted', prev: 'draft', next: 'submitted' },
          { action: 'application_rejected', prev: 'submitted', next: 'rejected', performedBy: adminUserId },
        ]
      : u.appStatus === 'waitlisted'
      ? [
          { action: 'application_submitted', prev: 'draft', next: 'submitted' },
          { action: 'moved_to_waitlist', prev: 'submitted', next: 'waitlisted', performedBy: adminUserId },
        ]
      : [];

    for (const log of logActions) {
      await conn.execute(
        `INSERT INTO application_logs (profileId, action, performedBy, notes, previousStatus, newStatus, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          pid,
          log.action,
          log.performedBy ?? null,
          log.performedBy ? `Admin reviewed and ${log.action.replace(/_/g, ' ')}` : 'Applicant submitted their application',
          log.prev,
          log.next,
          fmt(daysAgo(15 - u.n + 22)),
        ]
      );
      appLogsCount++;
    }

    // Intro call slots for under_review users
    if (u.appStatus === 'under_review') {
      const slotStatus = u.interviewScheduled ? 'booked' : 'booked';
      await conn.execute(
        `INSERT INTO intro_call_slots (profileId, scheduledAt, duration, status, notes, conductedBy, createdAt)
         VALUES (?, ?, 30, ?, ?, ?, ?)`,
        [
          pid,
          fmt(daysAgo(-3 + (u.n - 25))), // future date
          slotStatus,
          u.interviewScheduled ? 'Interview scheduled — applicant confirmed' : 'Intro call booked',
          adminUserId,
          fmt(daysAgo(5)),
        ]
      );
      introCallsCount++;
    }
  }

  track('application_photos', appPhotosCount);
  track('application_logs', appLogsCount);
  track('intro_call_slots', introCallsCount);

  console.log(`   ✓ ${appPhotosCount} application photos`);
  console.log(`   ✓ ${appLogsCount} application logs`);
  console.log(`   ✓ ${introCallsCount} intro call slots`);

  // ── 6. Referral codes (5 approved users) ─────────────────────────────────
  console.log('\n🔗 Inserting referral codes...');
  for (const [uid, code] of Object.entries(REFERRAL_CODE_MAP)) {
    const n = parseInt(uid);
    // User 1 has 1 referral converted (user 9)
    const totalReferrals = n === 1 ? 2 : n === 4 ? 1 : n === 8 ? 1 : 0;
    const totalEarned = totalReferrals * 25;
    await conn.execute(
      `INSERT INTO referral_codes (userId, code, totalReferrals, totalEarned, isActive, createdAt)
       VALUES (?, ?, ?, ?, 1, ?)`,
      [userIds[n], code, totalReferrals, totalEarned.toFixed(2), fmt(daysAgo(50 - n))]
    );
    track('referral_codes');
  }

  // ── 7. Signed waivers (all approved users) ────────────────────────────────
  console.log('\n📜 Inserting signed waivers...');
  const approvedUsers = USER_DEFS.filter(u => u.appStatus === 'approved');
  for (const u of approvedUsers) {
    await conn.execute(
      `INSERT INTO signed_waivers (userId, waiverType, waiverVersion, signedAt, ipAddress, signature)
       VALUES (?, 'membership', '1.0', ?, '192.168.1.${u.n}', ?)`,
      [
        userIds[u.n],
        fmt(daysAgo(44 - u.n)),
        `Signed by ${u.firstName} ${u.lastName}`,
      ]
    );
    track('signed_waivers');
  }

  // ── 8. Wall posts ─────────────────────────────────────────────────────────
  console.log('\n📰 Inserting wall posts...');
  const postContents = [
    'Had an amazing time at the last event! The energy was incredible ✨',
    'Anyone else excited for the upcoming festival? Can\'t wait to see everyone!',
    'Friendly reminder: consent is everything. Let\'s keep our space safe and welcoming 💜',
    'Just got my wristband ready! Who else is coming this weekend?',
    'Shoutout to the hosts for creating such a welcoming environment 🙌',
    'First time attending — any tips for newcomers?',
    'The community here is unlike anything I\'ve experienced. Truly special people.',
    'Reminder to test before you attend! Stay safe everyone 💪',
    'Looking for duo partners for the festival — dm me if interested!',
    'The after-party was everything omg 😂',
  ];

  const wallPostIds = [];
  let postIdx = 0;

  for (const u of approvedUsers) {
    const count = 2 + (u.n % 3); // 2-4 posts
    for (let i = 0; i < count; i++) {
      const content = postContents[(postIdx++) % postContents.length];
      const likes = Math.floor(Math.random() * 15);
      const comments = Math.floor(Math.random() * 5);
      const communities = ['soapies', 'groupus', 'gaypeez'];
      const community = communities[(u.n + i) % 3];

      const [res] = await conn.execute(
        `INSERT INTO wall_posts (authorId, communityId, content, visibility, isPinned, likesCount, commentsCount, createdAt, updatedAt)
         VALUES (?, ?, ?, 'members', 0, ?, ?, ?, ?)`,
        [
          userIds[u.n],
          community,
          content,
          likes,
          comments,
          fmt(daysAgo(30 - u.n - i)),
          fmt(daysAgo(30 - u.n - i)),
        ]
      );
      wallPostIds.push({ id: res.insertId, authorUserId: userIds[u.n], authorN: u.n });
      track('wall_posts');
    }
  }
  console.log(`   ✓ ${insertCounts['wall_posts']} wall posts`);

  // ── 9. Wall post likes (cross-user) ───────────────────────────────────────
  console.log('\n❤️  Inserting wall post likes...');
  const likedCombos = new Set();
  for (let i = 0; i < 60; i++) {
    const post = wallPostIds[i % wallPostIds.length];
    const liker = approvedUsers[(i * 3 + 7) % approvedUsers.length];
    if (liker.n === post.authorN) continue;
    const key = `${post.id}-${userIds[liker.n]}`;
    if (likedCombos.has(key)) continue;
    likedCombos.add(key);
    await conn.execute(
      `INSERT INTO wall_post_likes (postId, userId, createdAt) VALUES (?, ?, ?)`,
      [post.id, userIds[liker.n], fmt(daysAgo(25 - (i % 20)))]
    );
    track('wall_post_likes');
  }
  console.log(`   ✓ ${insertCounts['wall_post_likes']} wall post likes`);

  // ── 10. Wall post comments ─────────────────────────────────────────────────
  console.log('\n💬 Inserting wall post comments...');
  const commentTexts = [
    'Same!! This community is the best 💜',
    'So excited for this! See you there!',
    'Thanks for the reminder, super important 🙏',
    'Count me in! DM me for details',
    'Couldn\'t agree more — amazing vibes always',
    'Welcome!! You\'re going to love it here',
  ];
  for (let i = 0; i < 20; i++) {
    const post = wallPostIds[(i * 5 + 2) % wallPostIds.length];
    const commenter = approvedUsers[(i * 4 + 3) % approvedUsers.length];
    if (commenter.n === post.authorN) continue;
    await conn.execute(
      `INSERT INTO wall_post_comments (postId, authorId, content, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)`,
      [
        post.id,
        userIds[commenter.n],
        commentTexts[i % commentTexts.length],
        fmt(daysAgo(20 - (i % 15))),
        fmt(daysAgo(20 - (i % 15))),
      ]
    );
    track('wall_post_comments');
  }
  console.log(`   ✓ ${insertCounts['wall_post_comments']} wall post comments`);

  // ── 11. Reservations ──────────────────────────────────────────────────────
  console.log('\n🎟️  Inserting reservations...');

  const ticketTypes = ['single_female', 'single_male', 'couple', 'group'];
  const paymentMethods = ['stripe', 'venmo', 'cash'];
  const wristbandColors = ['purple', 'blue', 'pink', 'rainbow', null, null];

  const reservationIds = []; // { id, userId, eventId, paymentStatus, status }

  for (const u of approvedUsers) {
    const count = 1 + (u.n % 3); // 1-3 reservations
    for (let i = 0; i < count; i++) {
      const event = eventRows[(u.n + i) % eventRows.length];
      const ticketType = ticketTypes[(u.n + i) % 4];
      const payMethod = paymentMethods[(u.n + i) % 3];
      const wristband = wristbandColors[(u.n + i) % 6];
      const isQueerPlay = (u.n + i) % 5 === 0 ? 1 : 0;

      // Determine statuses based on user index
      let payStatus, resStatus;
      if (i === 0 && u.n === 3) {
        // Scenario D: venmo pending
        payStatus = 'pending'; resStatus = 'pending';
        ADMIN_WORKFLOW_NOTES['D'] = `user${u.n}@testuser.soapies — venmo pending reservation`;
      } else if (payMethod === 'venmo' && i === 1) {
        payStatus = 'pending'; resStatus = 'pending';
      } else if ((u.n + i) % 7 === 0) {
        payStatus = 'failed'; resStatus = 'cancelled';
      } else if ((u.n + i) % 4 === 0) {
        payStatus = 'paid'; resStatus = 'checked_in';
      } else {
        payStatus = 'paid'; resStatus = 'confirmed';
      }

      const totalAmount = (45 + (u.n % 6) * 10).toFixed(2);
      const amountPaid = payStatus === 'paid' ? totalAmount : '0.00';
      const testResultSubmitted = (u.n + i) % 6 === 0 ? 1 : 0;
      const testResultApproved = testResultSubmitted && (u.n + i) % 3 !== 0 ? 1 : 0;
      const checkedInAt = resStatus === 'checked_in' ? fmt(daysAgo(1)) : null;

      const [res] = await conn.execute(
        `INSERT INTO reservations
           (eventId, userId, profileId, ticketType, quantity, totalAmount, amountPaid,
            paymentMethod, paymentStatus, status, checkedInAt, wristbandColor, isQueerPlay,
            testResultSubmitted, testResultApproved, testResultSubmittedAt, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          event.id,
          userIds[u.n],
          profileIds[u.n],
          ticketType,
          totalAmount,
          amountPaid,
          payMethod,
          payStatus,
          resStatus,
          checkedInAt,
          wristband,
          isQueerPlay,
          testResultSubmitted,
          testResultApproved,
          testResultSubmitted ? fmt(daysAgo(5)) : null,
          fmt(daysAgo(25 - u.n - i)),
          fmt(daysAgo(25 - u.n - i)),
        ]
      );
      const resId = res.insertId;
      reservationIds.push({ id: resId, userId: userIds[u.n], userN: u.n, eventId: event.id, paymentStatus: payStatus, status: resStatus });
      track('reservations');

      // Insert ticket for paid+confirmed/checked_in
      if (payStatus === 'paid' && (resStatus === 'confirmed' || resStatus === 'checked_in')) {
        await conn.execute(
          `INSERT INTO tickets (reservationId, userId, qrCode, isUsed, usedAt, createdAt)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            resId,
            userIds[u.n],
            `QR-${userIds[u.n]}-${event.id}-${resId}`,
            resStatus === 'checked_in' ? 1 : 0,
            resStatus === 'checked_in' ? fmt(daysAgo(1)) : null,
            fmt(daysAgo(24 - u.n - i)),
          ]
        );
        track('tickets');
      }
    }
  }
  console.log(`   ✓ ${insertCounts['reservations']} reservations`);
  console.log(`   ✓ ${insertCounts['tickets'] || 0} tickets`);

  // ── 12. Cancellation requests ─────────────────────────────────────────────
  console.log('\n🚫 Inserting cancellation requests...');
  const cancelRes = reservationIds.filter(r => r.status === 'confirmed' || r.status === 'pending').slice(0, 3);
  const cancelStatuses = ['pending', 'approved', 'denied'];
  for (let i = 0; i < Math.min(3, cancelRes.length); i++) {
    const r = cancelRes[i];
    const status = cancelStatuses[i];
    if (i === 0) ADMIN_WORKFLOW_NOTES['F'] = `user${r.userN}@testuser.soapies — pending cancellation request`;
    await conn.execute(
      `INSERT INTO cancellation_requests
         (reservationId, userId, reason, status, refundAmount, refundMethod, processedBy, processedAt, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.id,
        r.userId,
        `Reason ${i + 1}: ${['Schedule conflict — can no longer attend this date', 'Family emergency came up', 'Duplicate booking made by mistake'][i]}`,
        status,
        status === 'approved' ? '45.00' : null,
        status === 'approved' ? 'venmo' : null,
        status !== 'pending' ? adminUserId : null,
        status !== 'pending' ? fmt(daysAgo(2)) : null,
        fmt(daysAgo(5 - i)),
      ]
    );
    track('cancellation_requests');
  }
  console.log(`   ✓ ${insertCounts['cancellation_requests']} cancellation requests`);

  // ── 13. Event feedback ────────────────────────────────────────────────────
  console.log('\n⭐ Inserting event feedback...');
  const feedbackComments = [
    'Absolutely loved the vibe! Perfect balance of energy and safety.',
    'Great event but the venue was a bit small for the crowd.',
    'Hosts were incredibly welcoming. 10/10 would recommend.',
    'Music selection was on point! Amazing night.',
    null,
    'Amazing community, felt so safe and respected all evening.',
    'Had a blast! Already signed up for the next one.',
  ];
  for (let i = 0; i < 7; i++) {
    const u = approvedUsers[i % approvedUsers.length];
    const event = eventRows[i % eventRows.length];
    await conn.execute(
      `INSERT INTO event_feedback (eventId, userId, rating, comment, isAnonymous, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        event.id,
        userIds[u.n],
        1 + (i % 5),
        feedbackComments[i],
        i % 3 === 0 ? 1 : 0,
        fmt(daysAgo(10 - i)),
      ]
    );
    track('event_feedback');
  }
  console.log(`   ✓ ${insertCounts['event_feedback']} event feedback rows`);

  // ── 14. DM conversations ──────────────────────────────────────────────────
  console.log('\n💌 Inserting DM conversations...');
  const dmPairs = [
    [approvedUsers[0], approvedUsers[1]],
    [approvedUsers[2], approvedUsers[3]],
    [approvedUsers[4], approvedUsers[5]],
    [approvedUsers[6], approvedUsers[7]],
    [approvedUsers[8], approvedUsers[9]],
  ];
  const dmMessages = [
    ['Hey! Loved your post on the wall 😊', 'Thanks!! Are you coming to the next event?', 'Definitely! Can\'t wait 🎉', 'Same! Let\'s meet up there'],
    ['Quick question — what time does the event start?', 'Doors open at 9pm I think', 'Perfect, thanks! See you there', 'For sure! 💜'],
    ['Did you see the new announcement?', 'Yes!! So excited about the festival', 'Me too, already got my outfit planned 😂', 'Haha same honestly'],
    ['Hey newcomer here, any tips?', 'Welcome!! Just be yourself and have fun', 'That\'s great advice, thank you 🙏', 'You\'re going to love it here', 'Can\'t wait!'],
    ['Are you going to the next soapies event?', 'Yes!! Are you?', 'Of course', 'Let\'s go together!'],
  ];

  for (let i = 0; i < dmPairs.length; i++) {
    const [uA, uB] = dmPairs[i];
    const [convRes] = await conn.execute(
      `INSERT INTO conversations (type, createdBy, createdAt, updatedAt) VALUES ('dm', ?, ?, ?)`,
      [userIds[uA.n], fmt(daysAgo(15 - i * 2)), fmt(daysAgo(1))]
    );
    const convId = convRes.insertId;
    track('conversations');

    // Participants
    for (const u of [uA, uB]) {
      await conn.execute(
        `INSERT INTO conversation_participants (conversationId, userId, role, lastReadAt, joinedAt)
         VALUES (?, ?, 'member', ?, ?)`,
        [convId, userIds[u.n], fmt(daysAgo(1)), fmt(daysAgo(15 - i * 2))]
      );
      track('conversation_participants');
    }

    // Messages
    const msgs = dmMessages[i];
    for (let m = 0; m < msgs.length; m++) {
      const sender = m % 2 === 0 ? uA : uB;
      await conn.execute(
        `INSERT INTO messages (conversationId, senderId, content, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?)`,
        [convId, userIds[sender.n], msgs[m], fmt(daysAgo(15 - i * 2 - m)), fmt(daysAgo(15 - i * 2 - m))]
      );
      track('messages');
    }
  }
  console.log(`   ✓ ${insertCounts['conversations']} conversations`);
  console.log(`   ✓ ${insertCounts['conversation_participants']} participants`);
  console.log(`   ✓ ${insertCounts['messages']} messages`);

  // ── 15. Member credits ────────────────────────────────────────────────────
  console.log('\n💰 Inserting member credits...');
  const creditUsers = [
    { n: 2, type: 'referral', amount: 25, desc: 'Referral bonus — friend joined via your code' },
    { n: 7, type: 'admin_grant', amount: 50, desc: 'Thank you gift from admin team for community contribution' },
    { n: 14, type: 'cancellation', amount: 45, desc: 'Credit issued for approved cancellation request' },
  ];
  for (const c of creditUsers) {
    await conn.execute(
      `INSERT INTO member_credits (userId, amount, type, description, balance, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userIds[c.n], c.amount.toFixed(2), c.type, c.desc, c.amount.toFixed(2), fmt(daysAgo(10))]
    );
    track('member_credits');
  }
  ADMIN_WORKFLOW_NOTES['J'] = `user2@testuser.soapies, user7@testuser.soapies, user14@testuser.soapies — have member credits`;
  console.log(`   ✓ ${insertCounts['member_credits']} member credits`);

  // ── 16. Profile change requests ───────────────────────────────────────────
  console.log('\n✏️  Inserting profile change requests...');
  const pcrData = [
    { n: 5, field: 'displayName', current: 'Dante C.', requested: 'D. Cruz (he/him)', status: 'pending' },
    { n: 12, field: 'bio', current: 'Hi, I\'m Luna!', requested: 'Queer femme 💜 lover of community and connection. She/her.', status: 'pending' },
    { n: 17, field: 'displayName', current: 'Luca F.', requested: 'Luca Ferrari', status: 'approved' },
  ];
  for (const r of pcrData) {
    await conn.execute(
      `INSERT INTO profile_change_requests
         (profileId, fieldName, currentValue, requestedValue, status, reviewedBy, reviewedAt, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        profileIds[r.n],
        r.field,
        r.current,
        r.requested,
        r.status,
        r.status === 'approved' ? adminUserId : null,
        r.status === 'approved' ? fmt(daysAgo(2)) : null,
        fmt(daysAgo(5)),
      ]
    );
    track('profile_change_requests');
  }
  ADMIN_WORKFLOW_NOTES['G'] = `user5@testuser.soapies, user12@testuser.soapies — pending profile change requests`;
  console.log(`   ✓ ${insertCounts['profile_change_requests']} profile change requests`);

  // ── 17. Test result submissions ───────────────────────────────────────────
  console.log('\n🧪 Inserting test result submissions...');
  const testResultData = [
    { n: 3, status: 'pending' },
    { n: 8, status: 'approved' },
    { n: 11, status: 'rejected' },
  ];
  for (const t of testResultData) {
    // Use first reservation for this user
    const userRes = reservationIds.find(r => r.userN === t.n);
    if (!userRes) continue;
    await conn.execute(
      `INSERT INTO test_result_submissions
         (userId, reservationId, eventId, resultUrl, status, submittedAt, reviewedAt, reviewedBy, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userIds[t.n],
        userRes.id,
        userRes.eventId,
        `https://storage.soapies.app/test/results/user${t.n}-test-result.pdf`,
        t.status,
        fmt(daysAgo(7)),
        t.status !== 'pending' ? fmt(daysAgo(3)) : null,
        t.status !== 'pending' ? adminUserId : null,
        t.status === 'rejected' ? 'Image quality insufficient, please resubmit' : null,
      ]
    );
    track('test_result_submissions');
  }
  ADMIN_WORKFLOW_NOTES['E'] = `user3@testuser.soapies — pending test result submission`;
  console.log(`   ✓ ${insertCounts['test_result_submissions']} test result submissions`);

  // ── 18. Notifications ─────────────────────────────────────────────────────
  console.log('\n🔔 Inserting notifications...');
  const notifTypes = [
    { type: 'new_message', title: 'New message from {name}', body: 'You have a new direct message' },
    { type: 'event_reminder', title: 'Event tonight!', body: 'Don\'t forget — your event is tonight. Doors open at 9pm.' },
    { type: 'application_status', title: 'Application update', body: 'Your membership application has been approved! Welcome aboard 💜' },
    { type: 'payment_confirmed', title: 'Payment received', body: 'Your payment has been confirmed. See you there!' },
  ];
  for (const u of approvedUsers) {
    const count = 2 + (u.n % 2); // 2-3
    for (let i = 0; i < count; i++) {
      const notif = notifTypes[(u.n + i) % notifTypes.length];
      await conn.execute(
        `INSERT INTO notifications (userId, type, title, body, isRead, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          userIds[u.n],
          notif.type,
          notif.title.replace('{name}', 'Soapies Team'),
          notif.body,
          i === 0 ? 0 : 1,
          fmt(daysAgo(3 - i)),
        ]
      );
      track('notifications');
    }
  }
  console.log(`   ✓ ${insertCounts['notifications']} notifications`);

  // ── 19. Single male invite codes ──────────────────────────────────────────
  console.log('\n🔑 Inserting single male invite codes...');
  const singleMaleCodes = [
    { code: 'SMALE-TEST-001', isUsed: false, usedBy: null },
    { code: 'SMALE-TEST-002', isUsed: false, usedBy: null },
    { code: 'SMALE-TEST-003', isUsed: true, usedBy: userIds[3] }, // Marcus (male) used it
  ];
  for (const c of singleMaleCodes) {
    await conn.execute(
      `INSERT INTO single_male_invite_codes (code, createdBy, usedBy, isUsed, expiresAt, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [c.code, adminUserId, c.usedBy, c.isUsed ? 1 : 0, fmt(daysAgo(-30)), fmt(daysAgo(20))]
    );
    track('single_male_invite_codes');
  }
  console.log(`   ✓ ${insertCounts['single_male_invite_codes']} invite codes`);

  // ── 20. Waitlist entries ──────────────────────────────────────────────────
  console.log('\n⏳ Inserting waitlist entries...');
  const waitlistEvent = eventRows[0]; // Use first event for waitlist scenario
  const waitlistUsers = [approvedUsers[9], approvedUsers[10]];
  for (let i = 0; i < waitlistUsers.length; i++) {
    const u = waitlistUsers[i];
    await conn.execute(
      `INSERT INTO waitlist (eventId, userId, status, position, createdAt)
       VALUES (?, ?, 'waiting', ?, ?)`,
      [waitlistEvent.id, userIds[u.n], i + 1, fmt(daysAgo(3 - i))]
    );
    track('waitlist');
  }
  console.log(`   ✓ ${insertCounts['waitlist']} waitlist entries`);

  // ── 21. Blocked users ────────────────────────────────────────────────────
  console.log('\n🚷 Inserting blocked users...');
  await conn.execute(
    `INSERT INTO blocked_users (blockerId, blockedId, createdAt) VALUES (?, ?, ?)`,
    [userIds[5], userIds[13], fmt(daysAgo(8))]
  );
  track('blocked_users');
  console.log(`   ✓ 1 blocked user record`);

  // ── 22. Admin audit logs ──────────────────────────────────────────────────
  console.log('\n📋 Inserting admin audit logs...');
  const auditLogs = [
    { action: 'approve_user', targetType: 'profile', targetId: profileIds[1], details: { message: 'Application approved' } },
    { action: 'approve_user', targetType: 'profile', targetId: profileIds[4], details: { message: 'Application approved after intro call' } },
    { action: 'reject_user', targetType: 'profile', targetId: profileIds[28], details: { reason: 'Does not meet community guidelines', notes: 'Incomplete application, unresponsive' } },
    { action: 'suspend_user', targetType: 'user', targetId: userIds[6], details: { reason: 'Violation of consent policy at last event', duration: '30 days' } },
    { action: 'update_event', targetType: 'event', targetId: eventRows[0].id, details: { field: 'capacity', old: 50, new: 60 } },
    { action: 'grant_credits', targetType: 'user', targetId: userIds[7], details: { amount: 50, reason: 'Community contribution' } },
    { action: 'process_refund', targetType: 'reservation', targetId: reservationIds[0]?.id, details: { amount: '45.00', method: 'venmo' } },
  ];
  for (const log of auditLogs) {
    if (!log.targetId) continue;
    await conn.execute(
      `INSERT INTO admin_audit_logs (adminId, action, targetType, targetId, details, ipAddress, createdAt)
       VALUES (?, ?, ?, ?, ?, '10.0.0.1', ?)`,
      [adminUserId, log.action, log.targetType, log.targetId, JSON.stringify(log.details), fmt(daysAgo(Math.floor(Math.random() * 20)))]
    );
    track('admin_audit_logs');
  }
  console.log(`   ✓ ${insertCounts['admin_audit_logs']} audit log entries`);

  // ── 23. Announcements ─────────────────────────────────────────────────────
  console.log('\n📢 Inserting announcements...');
  const announcements = [
    {
      title: '🎉 Festival Season is Here!',
      content: 'We\'re thrilled to announce our summer festival lineup! Dates and details dropping soon. Stay tuned 💜',
      community: null,
      pinned: true,
    },
    {
      title: 'Safety Reminder: Testing Required for Upcoming Events',
      content: 'As a reminder, all attendees must submit a recent (within 14 days) STI test result before attending. Please upload through your profile before the event.',
      community: 'soapies',
      pinned: false,
    },
  ];
  for (const a of announcements) {
    await conn.execute(
      `INSERT INTO announcements (title, content, communityId, authorId, isPinned, isActive, publishedAt, targetAudience, dismissible, createdAt)
       VALUES (?, ?, ?, ?, ?, 1, ?, 'all', 1, ?)`,
      [a.title, a.content, a.community, adminUserId, a.pinned ? 1 : 0, fmt(daysAgo(3)), fmt(daysAgo(3))]
    );
    track('announcements');
  }
  console.log(`   ✓ ${insertCounts['announcements']} announcements`);

  // ── 24. Expenses ──────────────────────────────────────────────────────────
  console.log('\n💵 Inserting expenses...');
  const expenseData = [
    { eventIdx: 0, category: 'venue', desc: 'Venue rental deposit', amount: '500.00' },
    { eventIdx: 1, category: 'supplies', desc: 'Wristbands and welcome kit supplies', amount: '125.50' },
    { eventIdx: 2, category: 'entertainment', desc: 'DJ equipment rental', amount: '350.00' },
  ];
  for (const e of expenseData) {
    const event = eventRows[e.eventIdx % eventRows.length];
    await conn.execute(
      `INSERT INTO expenses (eventId, category, description, amount, paidBy, status, createdAt)
       VALUES (?, ?, ?, ?, ?, 'approved', ?)`,
      [event.id, e.category, e.desc, e.amount, adminUserId, fmt(daysAgo(15))]
    );
    track('expenses');
  }
  console.log(`   ✓ ${insertCounts['expenses']} expenses`);

  // ── 25. Event addons ──────────────────────────────────────────────────────
  console.log('\n🎁 Inserting event addons...');
  const addonEvent = eventRows[0];
  const addonIds = [];
  const addons = [
    { name: 'VIP Lounge Access', desc: 'Access to the exclusive VIP lounge area', price: '25.00' },
    { name: 'Locker Rental', desc: 'Secure locker for your belongings all night', price: '10.00' },
  ];
  for (const a of addons) {
    const [res] = await conn.execute(
      `INSERT INTO event_addons (eventId, name, description, price, maxQuantity, isActive, createdAt)
       VALUES (?, ?, ?, ?, 50, 1, ?)`,
      [addonEvent.id, a.name, a.desc, a.price, fmt(daysAgo(30))]
    );
    addonIds.push(res.insertId);
    track('event_addons');
  }

  // Reservation addons for a few reservations
  const addonReservations = reservationIds.filter(r => r.eventId === addonEvent.id).slice(0, 3);
  for (let i = 0; i < addonReservations.length && i < addonIds.length + 1; i++) {
    const r = addonReservations[i];
    const addon = addonIds[i % addonIds.length];
    const price = addons[i % addons.length].price;
    await conn.execute(
      `INSERT INTO reservation_addons (reservationId, addonId, quantity, unitPrice, totalPrice, createdAt)
       VALUES (?, ?, 1, ?, ?, ?)`,
      [r.id, addon, price, price, fmt(daysAgo(20))]
    );
    track('reservation_addons');
  }
  console.log(`   ✓ ${insertCounts['event_addons']} event addons, ${insertCounts['reservation_addons'] || 0} reservation addons`);

  // ── 26. Fill in remaining admin workflow notes ─────────────────────────────
  ADMIN_WORKFLOW_NOTES['A'] = `user21@testuser.soapies (Harper Singh) — submitted application, 2 pending photos, intro call slot available`;
  ADMIN_WORKFLOW_NOTES['B'] = `user25@testuser.soapies (Zoe Laurent) — under_review, interview_scheduled, photos pending`;
  ADMIN_WORKFLOW_NOTES['C'] = `user6@testuser.soapies (Sofia Mendez) — approved but isSuspended=true`;
  if (!ADMIN_WORKFLOW_NOTES['D']) ADMIN_WORKFLOW_NOTES['D'] = `user3@testuser.soapies (Marcus Webb) — venmo pending reservation`;
  ADMIN_WORKFLOW_NOTES['H'] = `user30@testuser.soapies (Phoenix Gray) — applicationStatus=waitlisted`;
  ADMIN_WORKFLOW_NOTES['I'] = `user2, user9, user13 — referred users; user1, user4, user8 have referral codes`;

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('✅ SEED COMPLETE — Row counts per table:');
  console.log('═'.repeat(60));
  for (const [table, count] of Object.entries(insertCounts).sort()) {
    console.log(`  ${table.padEnd(35)} ${count}`);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('🎭 ADMIN WORKFLOW TEST SCENARIOS:');
  console.log('═'.repeat(60));
  for (const [scenario, info] of Object.entries(ADMIN_WORKFLOW_NOTES).sort()) {
    console.log(`  ${scenario}: ${info}`);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('🔐 Login credentials for all test users:');
  console.log('   Password: TestPass123!');
  console.log('   Email format: user{N}@testuser.soapies  (N = 1–30)');
  console.log('═'.repeat(60));

  await conn.end();
  console.log('\n✅ Database connection closed.');
}

main().catch(err => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
