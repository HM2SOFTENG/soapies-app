import mysql from 'mysql2/promise';

const DB_URI = process.env.DATABASE_URL;

function fmt(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

const avatarUrls = [
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1463453091185-61582044d556?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1488161628813-04466f872be2?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1527203561188-dae1bc1a417f?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1479936343636-73cdc5aae0c3?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1595152772835-219674b2a163?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1521119989659-a83eee488004?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1530268729831-4b0b9e170218?w=200&h=200&fit=crop&crop=face',
  'https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=200&h=200&fit=crop&crop=face',
];

const locations = [
  'San Diego, CA',
  'North Park, San Diego',
  'Pacific Beach, SD',
  'Hillcrest, San Diego',
  'La Jolla, CA',
  'Encinitas, CA',
  'Chula Vista, CA',
  'Oceanside, CA',
  'Las Vegas, NV',
  'Los Angeles, CA',
  'West Hollywood, CA',
  'Long Beach, CA',
  'San Diego, CA',
  'North Park, San Diego',
  'Pacific Beach, SD',
  'La Jolla, CA',
  'Las Vegas, NV',
  'West Hollywood, CA',
  'Encinitas, CA',
  'Hillcrest, San Diego',
  'Los Angeles, CA',
  'Oceanside, CA',
  'San Diego, CA',
  'Long Beach, CA',
  'Pacific Beach, SD',
  'Chula Vista, CA',
  'North Park, San Diego',
  'La Jolla, CA',
  'Las Vegas, NV',
  'San Diego, CA',
];

const bios = [
  "Life's too short for boring nights. You'll usually find me on the dance floor or plotting the next adventure. I love meeting new people and creating real connections. SD local, always down for a good time.",
  "Curious soul, adventure seeker, amateur chef. I joined Soapies because I wanted a community that gets it — real people, real vibes. Catch me at every rave and most house parties 💜",
  "Transplant from NYC, now fully converted to the SoCal life. Open-minded, genuine, and always down to explore. I believe the best connections happen when you let your guard down.",
  "Yoga by day, dancing by night. I'm all about good energy, real conversations, and people who show up fully. Here to find my people and make memories that actually matter.",
  "Fitness junkie, music lover, and chronic yes-person when it comes to new experiences. Pacific Beach is my backyard and the ocean is my reset button. Come find me at the next event 🌊",
  "Former wallflower, now certified social butterfly. Soapies gave me the confidence to be fully myself. Into deep conversations, spontaneous trips, and very loud music 🎶",
  "Creative at heart, adventurous by choice. I make art, cook elaborate meals, and will 100% convince you to join me for a midnight beach walk. Always genuine, never boring.",
  "Moved to San Diego for the weather, stayed for the community. I'm that person who knows everyone's name by the end of the night. Obsessed with live music and rooftop sunsets.",
  "Vegas native, thrill-seeker, lover of all things neon and loud. I bring the energy wherever I go and I expect it back. Good vibes only, no exceptions ✨",
  "Wellness coach meets party animal — yes, both can exist. I meditate at sunrise and dance until 3am. Here for authentic connections and everything in between 💜",
  "SoCal bred and sun-soaked. I'm passionate about travel, trying new restaurants, and anyone with a good story to tell. Real talk: I joined for the events and stayed for the people.",
  "Art director by day, certified night owl by weekend. I believe in dressing up, showing up, and never leaving a party without making at least one new friend. Let's vibe.",
  "Hillcrest local who loves this city deeply. Queer, proud, and always looking for the next great adventure. Into music, museums, midnight tacos, and genuine human beings.",
  "I came to Soapies on a dare from a friend and honestly? Best decision. The energy here is unlike anywhere else. Open-minded, low-drama, high-vibe. That's me in a nutshell.",
  "Athlete and aesthete — I love a good morning run as much as I love a killer outfit. If you see me at an event I'm probably on the dance floor or at the snack table. No shame.",
  "Moved here from Chicago and never looked back. The sun rewired my brain for joy. I'm into fitness, cooking, connecting, and laughing way too loud at everything.",
  "Serial adventurer living in LV but spending weekends in SD as often as possible. I chase good music, good food, and good people like it's a full-time job.",
  "WEHo vibes, big personality, genuine heart. I live for themed parties and spontaneous road trips. Here to meet real people who actually want to live their lives out loud.",
  "Encinitas is heaven and I will argue about it. Surfer energy, creative spirit, always barefoot when possible. I love this community because everyone here actually shows up.",
  "I've been called an extroverted introvert and honestly it tracks. Give me a solid crew and great music and I'll be there all night. Otherwise I'm home with my cat 😂",
  "Long Beach local, taco enthusiast, lover of loud music and quiet mornings. I like people who are real about who they are and what they want. No games, just good times.",
  "I came for the events and stayed for the connections. Former corporate drone, now living my best life with priorities in the right order. Soapies is my happy place 💜",
  "Fitness is my therapy, music is my religion, and this community is my church on weekends. Here to sweat, dance, laugh, and connect with humans who get it.",
  "Half introvert, half event queen — it depends on the vibe. Into photography, hiking, live sets, and any excuse to dress up. Looking for my partner in crime.",
  "Retired people-pleaser, current vibe curator. I only make time for things and people that fill me up. Soapies has been a game-changer for finding my tribe. 🌟",
  "Chula Vista raised, SD-proud forever. I work hard and play harder. Huge on loyalty, big on fun, and always the person who knows all the lyrics to every song.",
  "North Park is my neighborhood and the whole SD scene is my playground. I'm into art walks, craft cocktails, and anyone who can keep up with my conversation pace.",
  "La Jolla by address, chaotic by nature. I love beautiful things — sunsets, good food, great people. If you're here, you already have good taste. Let's hang.",
  "Vegas taught me to take risks and SoCal taught me to enjoy the ride. Now I split the difference and just say yes to everything that sounds fun. Life's too short 🥂",
  "Music producer, dog dad, and accidental extrovert. I started coming to these events for the music and kept coming back for the community. Genuinely one of the best decisions I've made.",
];

const postImages = [
  'https://images.unsplash.com/photo-1574259392081-cbf40e0c80d4?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1529543544282-ea669407fca3?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1506157786151-b8491531f063?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1549213783-8284d0336c4f?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1542601906897-d3e40a04e9e3?w=600&h=400&fit=crop',
  'https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=600&h=400&fit=crop',
];

function daysFromNow(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

function buildMembershipState(index, isApproved) {
  if (!isApproved) {
    return {
      tierKey: 'community',
      status: 'inactive',
      interval: null,
      currentPeriodEnd: null,
      activatedAt: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    };
  }

  const pattern = index % 12;
  const base = {
    activatedAt: fmt(daysAgo(45 - (index % 20))),
  };

  switch (pattern) {
    case 0:
      return {
        ...base,
        tierKey: 'inner_circle',
        status: 'complimentary',
        interval: 'month',
        currentPeriodEnd: fmt(daysFromNow(180)),
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      };
    case 1:
      return {
        ...base,
        tierKey: 'inner_circle',
        status: 'active',
        interval: 'year',
        currentPeriodEnd: fmt(daysFromNow(300)),
        stripeCustomerId: `cus_seed_${index + 1}`,
        stripeSubscriptionId: `sub_seed_inner_${index + 1}`,
      };
    case 2:
    case 11:
      return {
        ...base,
        tierKey: 'connect',
        status: 'active',
        interval: pattern === 11 ? 'year' : 'month',
        currentPeriodEnd: fmt(daysFromNow(pattern === 11 ? 240 : 26)),
        stripeCustomerId: `cus_seed_${index + 1}`,
        stripeSubscriptionId: `sub_seed_connect_${index + 1}`,
      };
    case 3:
      return {
        ...base,
        tierKey: 'connect',
        status: 'trialing',
        interval: 'month',
        currentPeriodEnd: fmt(daysFromNow(12)),
        stripeCustomerId: `cus_seed_${index + 1}`,
        stripeSubscriptionId: `sub_seed_trial_${index + 1}`,
      };
    case 5:
      return {
        ...base,
        tierKey: 'connect',
        status: 'past_due',
        interval: 'month',
        currentPeriodEnd: fmt(daysFromNow(3)),
        stripeCustomerId: `cus_seed_${index + 1}`,
        stripeSubscriptionId: `sub_seed_pastdue_${index + 1}`,
      };
    case 6:
      return {
        ...base,
        tierKey: 'inner_circle',
        status: 'active',
        interval: 'month',
        currentPeriodEnd: fmt(daysFromNow(21)),
        stripeCustomerId: `cus_seed_${index + 1}`,
        stripeSubscriptionId: `sub_seed_inner_${index + 1}`,
      };
    case 8:
      return {
        ...base,
        tierKey: 'connect',
        status: 'complimentary',
        interval: 'month',
        currentPeriodEnd: fmt(daysFromNow(90)),
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      };
    case 10:
      return {
        ...base,
        tierKey: 'inner_circle',
        status: 'canceled',
        interval: 'month',
        currentPeriodEnd: fmt(daysAgo(5)),
        stripeCustomerId: `cus_seed_${index + 1}`,
        stripeSubscriptionId: `sub_seed_canceled_${index + 1}`,
      };
    default:
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
}

// Varied post content pool — 50 unique entries
const postContents = [
  "Last night was absolutely electric ⚡ Can't believe how many amazing people I met. Already counting down to the next one 🥂",
  "The Barbie rave did not disappoint 💗 Shoutout to everyone who made it magical. See you all at the next one!",
  "Finally made it to Black's Beach with some incredible humans. The vibes were immaculate 🌊☀️",
  "New month, new energy. Grateful for this community and all the connections I've made here 💜",
  "Anyone else still riding the high from last weekend? Just me? Ok 😂🎉",
  "Reminder that life is short and you should always say yes to the adventure 🌟",
  "Officially obsessed with this community. Thank you all for being so welcoming and real 🫶",
  "Beach, sun, good people. Perfect Saturday ☀️🌊",
  "The outfits at last night's event were EVERYTHING. You all never disappoint 👏✨",
  "Just booked my spot for the next rave. Who else is going?? 🙋‍♀️💜",
  "If you weren't at last night's event, you genuinely missed out. The energy was unreal 🔥",
  "Woke up still smiling from yesterday. This community does something special to the soul 💛",
  "Three years in SD and I've never felt more at home than I do with these people. Soapies forever 🌴",
  "Sunsets hit different when you're surrounded by your people. Grateful today and every day 🌅",
  "Good music + good people = the only equation that matters. Solved it last night ✅🎶",
  "Hot take: the best part of any event is the people you end up talking to at 2am. Change my mind.",
  "I came to one event thinking it was a one-time thing. That was 8 months ago. I haven't left 😂💜",
  "Someone at last night's event told me I was 'aggressively fun' and honestly I'm keeping that forever.",
  "Beach day turned into sunset session turned into night out. Zero regrets, infinite memories 🌊🌙",
  "The playlist last night had no business being that good. My neck is still recovering 🎵🕺",
  "PSA: say yes to the thing. Whatever it is. You'll thank yourself later. Signed, someone who just did.",
  "I love how this community celebrates people for exactly who they are. So rare and so needed 💜",
  "Reconnected with three people I met months ago at the last event. That's the magic of this place.",
  "Just got home and already planning what to wear to the next one. No notes. 10/10. Would attend again.",
  "The fact that I went alone and left with a group of friends I adore says everything about this community 🫶",
  "Nothing beats a rooftop with the right crew and the right playlist. Last night was THAT night ✨",
  "Road trip to the next event incoming 🚗 Who else is making the drive? Let's convoy.",
  "Spent the evening at a Gaypeez mixer and left feeling like I could take on the world. Community matters 🌈",
  "The theme for last night's party was optional. Half of us went full send anyway. Icons, all of us 👑",
  "I live for the moments where you catch eyes with a stranger across the room and just KNOW the energy is right.",
  "Joined this app on a whim six months ago. Can confirm: best whim I've ever acted on 🥹💜",
  "Some of my closest friends right now are people I met through Soapies. Wild how that happens.",
  "Ended up staying three hours longer than planned. As per usual. I have no self-control when vibes are this good.",
  "Officially declaring this my favorite community on the internet and also in real life. No competition.",
  "Can we talk about how CLEAN the venue was last night?? The details were everything ✨🙌",
  "If you see me at an event I'm either on the dance floor or making friends in the bathroom line. There is no in-between.",
  "This time last year I would have never come to something like this alone. Growth looks good on me 💪💜",
  "The connections I've made here are the kind that feel effortless. Like we've known each other forever.",
  "Feeling grateful, energized, and very slightly sleep-deprived. Worth it. Always worth it 😴✨",
  "Someone please remind me to hydrate before the next event. Asking for a friend (the friend is me).",
  "Not to be dramatic but last weekend changed my life a little bit. The people. The music. ALL OF IT.",
  "Ran into someone I matched with here in the wild and it was the most wholesome thing. Small world 💛",
  "Dressed up, showed up, danced it out. Recipe for a perfect evening. Repeat weekly.",
  "Hot girl summer but make it community-based and emotionally fulfilling 💅💜",
  "The after-party was better than the party. Quote me on that.",
  "Every time I come to an event I wonder why I ever hesitated. Then I remember I was just scared. Growth.",
  "Manifesting more nights exactly like last night. The universe better be taking notes 📝✨",
  "Literally cannot stop telling people about this community. I've recruited three friends already 😂",
  "If you're on the fence about coming to the next event: get off it. Just come. You'll understand.",
  "Living proof that showing up for yourself leads to the most unexpected and beautiful connections 💜🌟",
];

async function main() {
  const conn = await mysql.createConnection({
    uri: DB_URI,
    ssl: { rejectUnauthorized: false },
  });

  console.log('Connected to DB ✓');

  // 1. Get all test users, ordered by email so user1, user2... maps to index 0, 1...
  const [users] = await conn.execute(
    `SELECT u.id, u.email, p.preferences, p.applicationStatus
     FROM users u
     LEFT JOIN profiles p ON p.userId = u.id
     WHERE u.email LIKE '%@testuser.soapies'
     ORDER BY u.email ASC`
  );
  console.log(`Found ${users.length} test users`);

  let profilesUpdated = 0;
  let membershipSeeded = 0;
  let postsUpdated = 0;
  let postsImageAdded = 0;

  // 2. Update profiles
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const avatarUrl = avatarUrls[i] || avatarUrls[i % avatarUrls.length];
    const location = locations[i] || locations[i % locations.length];
    const bio = bios[i] || bios[i % bios.length];

    const existingPreferences = (() => {
      try {
        if (!user.preferences) return {};
        return typeof user.preferences === 'string' ? JSON.parse(user.preferences) : user.preferences;
      } catch {
        return {};
      }
    })();
    const membership = buildMembershipState(i, user.applicationStatus === 'approved');
    const nextPreferences = {
      ...(existingPreferences || {}),
      membership,
    };

    const [result] = await conn.execute(
      'UPDATE profiles SET avatarUrl = ?, location = ?, bio = ?, preferences = ? WHERE userId = ?',
      [avatarUrl, location, bio, JSON.stringify(nextPreferences), user.id]
    );

    if (result.affectedRows > 0) {
      membershipSeeded++;
    }

    if (result.affectedRows > 0) {
      profilesUpdated++;
      console.log(`  ✓ Profile updated for ${user.email}`);
    } else {
      console.log(`  ⚠ No profile found for ${user.email} (userId=${user.id})`);
    }
  }

  // 3. Get all wall posts by test users
  const userIds = users.map(u => u.id);
  if (userIds.length === 0) {
    console.log('No users found, skipping post updates');
    await conn.end();
    return;
  }

  const placeholders = userIds.map(() => '?').join(',');
  const [posts] = await conn.execute(
    `SELECT id, authorId, content FROM wall_posts WHERE authorId IN (${placeholders}) ORDER BY id ASC`,
    userIds
  );
  console.log(`\nFound ${posts.length} wall posts`);

  // 4. Update posts: every 2nd or 3rd gets an image, all get enriched content
  let postContentIdx = 0;
  let imageIdx = 0;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const addImage = (i % 3 !== 0); // ~67% get images... let's do ~40%: every 2nd starting at index 1
    // Actually: add image if i % 2 === 1 OR i % 3 === 0 — target ~40%
    // Simple: add image if i % 5 < 2 (every 5 posts, 2 get images = 40%)
    const shouldAddImage = (i % 5 < 2);

    const newContent = postContents[postContentIdx % postContents.length];
    postContentIdx++;

    let mediaUrl = null;
    if (shouldAddImage) {
      mediaUrl = postImages[imageIdx % postImages.length];
      imageIdx++;
      postsImageAdded++;
    }

    await conn.execute(
      'UPDATE wall_posts SET content = ?, mediaUrl = ? WHERE id = ?',
      [newContent, mediaUrl, post.id]
    );
    postsUpdated++;
  }

  console.log(`\n=== Summary ===`);
  console.log(`Profiles updated: ${profilesUpdated}`);
  console.log(`Membership states seeded: ${membershipSeeded}`);
  console.log(`Wall posts content updated: ${postsUpdated}`);
  console.log(`Wall posts with new images: ${postsImageAdded}`);

  await conn.end();
  console.log('\nDone ✓');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
