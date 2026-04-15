import mysql from 'mysql2/promise';

const DB_URL = process.env.DATABASE_URL;

// San Diego area coordinates with slight variation per user
const SD_COORDS = [
  { lat: 32.7157, lon: -117.1611 }, // Downtown SD
  { lat: 32.7325, lon: -117.1490 }, // North Park
  { lat: 32.7999, lon: -117.2522 }, // Pacific Beach
  { lat: 32.7462, lon: -117.1680 }, // Hillcrest
  { lat: 32.8328, lon: -117.2712 }, // La Jolla
  { lat: 32.7503, lon: -117.1335 }, // City Heights
  { lat: 32.7700, lon: -117.1690 }, // Mission Hills
  { lat: 32.8157, lon: -117.1350 }, // Kearny Mesa
  { lat: 32.7174, lon: -117.1628 }, // Barrio Logan
  { lat: 32.7831, lon: -117.2356 }, // Mission Bay
  { lat: 32.7681, lon: -117.2143 }, // Ocean Beach
  { lat: 32.7564, lon: -117.1290 }, // Mid-City
  { lat: 32.7050, lon: -117.0625 }, // Chula Vista
  { lat: 33.1959, lon: -117.3795 }, // Oceanside
  { lat: 33.0369, lon: -117.2919 }, // Encinitas
  { lat: 36.1699, lon: -115.1398 }, // Las Vegas
  { lat: 34.0522, lon: -118.2437 }, // Los Angeles
  { lat: 34.0901, lon: -118.3617 }, // West Hollywood
  { lat: 33.7701, lon: -118.1937 }, // Long Beach
  { lat: 32.8500, lon: -117.2740 }, // Mira Mesa
];

// Signal scenarios - mix of types for realistic Members Zone display
const SIGNAL_SCENARIOS = [
  // Available signals (active, showing up in zone)
  { signalType: 'available', seekingGender: 'female', seekingDynamic: 'connection', message: 'Down for a chat and maybe something more 🌊', isQueerFriendly: false },
  { signalType: 'available', seekingGender: 'any', seekingDynamic: 'friends', message: 'Looking to meet new people at the next event 💜', isQueerFriendly: true },
  { signalType: 'available', seekingGender: 'male', seekingDynamic: 'play', message: 'Checking out the vibe tonight ✨', isQueerFriendly: false },
  { signalType: 'available', seekingGender: 'any', seekingDynamic: 'connection', message: 'Open to meeting amazing humans 🫶', isQueerFriendly: true },
  { signalType: 'available', seekingGender: 'female', seekingDynamic: 'friends', message: 'New to the community, excited to explore 🌸', isQueerFriendly: true },
  { signalType: 'available', seekingGender: 'couple', seekingDynamic: 'play', message: 'Looking for like-minded people 💫', isQueerFriendly: false },
  { signalType: 'available', seekingGender: 'any', seekingDynamic: 'adventure', message: 'Say hi! I don\'t bite 😂', isQueerFriendly: true },
  { signalType: 'available', seekingGender: 'male', seekingDynamic: 'connection', message: 'Energy is right tonight 🔥', isQueerFriendly: false },
  { signalType: 'available', seekingGender: 'female', seekingDynamic: 'play', message: 'Let\'s make tonight memorable 🥂', isQueerFriendly: false },
  { signalType: 'available', seekingGender: 'any', seekingDynamic: 'chat', message: 'Just vibing, come say hi 🌙', isQueerFriendly: true },

  // Looking signals
  { signalType: 'looking', seekingGender: 'female', seekingDynamic: 'connection', message: 'Actively looking for the right vibe 💗', isQueerFriendly: false },
  { signalType: 'looking', seekingGender: 'any', seekingDynamic: 'play', message: 'Ready for a good time tonight 🎉', isQueerFriendly: true },
  { signalType: 'looking', seekingGender: 'male', seekingDynamic: 'friends', message: 'Here for the people and the music 🎵', isQueerFriendly: false },
  { signalType: 'looking', seekingGender: 'couple', seekingDynamic: 'adventure', message: 'Let\'s see where the night takes us 🌟', isQueerFriendly: true },
  { signalType: 'looking', seekingGender: 'female', seekingDynamic: 'chat', message: 'Checking out who else is around 👀', isQueerFriendly: true },

  // Busy signals (still visible but shows as busy)
  { signalType: 'busy', seekingGender: null, seekingDynamic: null, message: 'Catching up with friends, back later 🌙', isQueerFriendly: false },
  { signalType: 'busy', seekingGender: null, seekingDynamic: null, message: 'On the dance floor — catch me after 💃', isQueerFriendly: true },
  { signalType: 'busy', seekingGender: null, seekingDynamic: null, message: 'In my zone rn, dm me for later ✌️', isQueerFriendly: false },

  // Offline signals (left the zone)
  { signalType: 'offline', seekingGender: null, seekingDynamic: null, message: null, isQueerFriendly: false },
  { signalType: 'offline', seekingGender: null, seekingDynamic: null, message: null, isQueerFriendly: false },
];

function addJitter(coord, index) {
  // Add ~0-2km random offset so pins don't stack
  return {
    lat: coord.lat + (Math.sin(index * 7.3) * 0.018),
    lon: coord.lon + (Math.cos(index * 5.1) * 0.018),
  };
}

function futureExpiry(hoursFromNow) {
  const d = new Date(Date.now() + hoursFromNow * 60 * 60 * 1000);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

async function main() {
  const conn = await mysql.createConnection({ uri: DB_URL, ssl: { rejectUnauthorized: false } });
  console.log('[Pulse Seed] Connected to DB');

  // Get approved test users only (signals are for active members)
  const [testUsers] = await conn.execute(
    `SELECT u.id, u.email, p.id as profileId, p.communityId
     FROM users u
     JOIN profiles p ON p.userId = u.id
     WHERE u.email LIKE '%@testuser.soapies'
       AND p.applicationStatus = 'approved'
       AND u.isSuspended = 0
     ORDER BY u.id ASC`
  );

  console.log(`[Pulse Seed] Found ${testUsers.length} approved test users`);

  // Check if already seeded
  const [existing] = await conn.execute(
    `SELECT COUNT(*) as cnt FROM member_signals WHERE userId IN (${testUsers.map(u => u.id).join(',')})`
  );
  if (existing[0].cnt > 0) {
    console.log(`[Pulse Seed] Already have ${existing[0].cnt} signals — clearing and re-seeding`);
    await conn.execute(
      `DELETE FROM member_signals WHERE userId IN (${testUsers.map(u => u.id).join(',')})`
    );
  }

  let inserted = 0;
  const summary = { available: 0, looking: 0, busy: 0, offline: 0 };

  for (let i = 0; i < testUsers.length; i++) {
    const user = testUsers[i];
    const scenario = SIGNAL_SCENARIOS[i % SIGNAL_SCENARIOS.length];
    const coordBase = SD_COORDS[i % SD_COORDS.length];
    const { lat, lon } = addJitter(coordBase, i);

    // Offline users don't get coordinates (they've left)
    const isOffline = scenario.signalType === 'offline';
    const latitude = isOffline ? null : lat.toFixed(7);
    const longitude = isOffline ? null : lon.toFixed(7);

    // Expiry: available/looking = 2-4h, busy = 1-2h, offline = expired (1 min from now for cleanup)
    let expiryHours = 72; // 3 days for test data
    if (scenario.signalType === 'looking') expiryHours = 72;
    if (scenario.signalType === 'busy') expiryHours = 72;
    if (scenario.signalType === 'offline') expiryHours = -1; // already expired

    const expiresAt = futureExpiry(expiryHours);

    await conn.execute(
      `INSERT INTO member_signals
         (userId, signalType, seekingGender, seekingDynamic, message, isQueerFriendly, latitude, longitude, expiresAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        scenario.signalType,
        scenario.seekingGender ?? null,
        scenario.seekingDynamic ?? null,
        scenario.message ?? null,
        scenario.isQueerFriendly ? 1 : 0,
        latitude,
        longitude,
        expiresAt,
      ]
    );

    summary[scenario.signalType]++;
    inserted++;
    console.log(`  [${i + 1}/${testUsers.length}] user${i + 1} → ${scenario.signalType}${scenario.seekingGender ? ` (seeking: ${scenario.seekingGender})` : ''}`);
  }

  console.log('\n[Pulse Seed] ✅ Done!');
  console.log(`  Total signals inserted: ${inserted}`);
  console.log(`  Available: ${summary.available}`);
  console.log(`  Looking:   ${summary.looking}`);
  console.log(`  Busy:      ${summary.busy}`);
  console.log(`  Offline:   ${summary.offline}`);

  // Verify
  const [counts] = await conn.execute(
    `SELECT signalType, COUNT(*) as cnt FROM member_signals
     WHERE userId IN (${testUsers.map(u => u.id).join(',')})
     GROUP BY signalType`
  );
  console.log('\n[Pulse Seed] DB verification:');
  counts.forEach(r => console.log(`  ${r.signalType}: ${r.cnt}`));

  await conn.end();
}

main().catch(err => { console.error('[Pulse Seed] Error:', err); process.exit(1); });
