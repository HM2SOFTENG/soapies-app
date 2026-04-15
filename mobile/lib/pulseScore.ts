/**
 * Pulse Match Score Calculator
 *
 * Calculates compatibility score between two members based on 9 weighted factors:
 * 1. Gender Match (0–25 points)
 * 2. Orientation Compatibility (0–20 points)
 * 3. Same Community (0–15 points)
 * 4. Shared Interests (0–20 points, up to 5 per shared interest)
 * 5. Signal Alignment (0–10 points, both actively looking)
 * 6. Queer Friendly (0–10 points, conditional)
 * 7. Proximity (0–25 points, distance-based)
 * 8. Relationship Style (0–10 points)
 * 9. Looking For Match (0–10 points, overlapping goals)
 *
 * Maximum total raw points: 145 (normalized to 0–100%)
 */

export interface MatchFactor {
  key: string;
  label: string;
  emoji: string;
  points: number;
  maxPoints: number;
  matched: boolean;
  detail?: string;
}

/**
 * Capitalize the first letter of a string.
 */
function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

/**
 * Calculates the detailed breakdown of match factors between two members.
 *
 * @param member - The member being evaluated
 * @param myProfile - Current user's profile
 * @param myPrefs - Current user's preferences
 * @param mySignalType - Current user's signal type ('looking', 'available', etc.)
 * @param seekingGender - Array of genders the current user is seeking
 * @param maxDistance - Maximum acceptable distance in km
 * @returns Array of MatchFactor objects detailing each of the 9 scoring factors
 */
export function calculateMatchBreakdown(
  member: any,
  myProfile: any,
  myPrefs: any,
  mySignalType: string,
  seekingGender: string[],
  maxDistance: number,
): MatchFactor[] {
  const factors: MatchFactor[] = [];

  // 1. Gender Match — multi-select: 'any' alone means open to all
  const sgList = seekingGender.map(s => s.toLowerCase());
  const hasAny = sgList.length === 0 || sgList.includes('any');
  const memberGender = (member.gender ?? '').toLowerCase();
  const genderMatched = hasAny || sgList.includes(memberGender);
  factors.push({
    key: 'gender',
    label: 'Gender Match',
    emoji: '👤',
    points: genderMatched ? 25 : 0,
    maxPoints: 25,
    matched: genderMatched,
    detail: hasAny
      ? 'Open to anyone'
      : genderMatched
        ? `Seeking ${sgList.join(' or ')} · they're ${memberGender || 'unknown'}`
        : `Seeking ${sgList.join(' or ')} · they're ${memberGender || 'unknown'}`,
  });

  // 2. Orientation Compatibility
  const myOrientation = (myProfile?.orientation ?? '').toLowerCase();
  const theirOrientation = (member.orientation ?? '').toLowerCase();
  const biPanSet = new Set(['bisexual', 'pansexual']);
  const orientMatched = !!myOrientation && !!theirOrientation && (
    myOrientation === theirOrientation ||
    biPanSet.has(myOrientation) ||
    biPanSet.has(theirOrientation)
  );
  let orientDetail: string;
  if (!myOrientation || !theirOrientation) {
    orientDetail = 'Orientation not set';
  } else if (myOrientation === theirOrientation) {
    orientDetail = `Both ${myOrientation}`;
  } else {
    orientDetail = `You're ${myOrientation} · they're ${theirOrientation}`;
  }
  factors.push({
    key: 'orientation',
    label: 'Orientation Compat',
    emoji: '💞',
    points: orientMatched ? 20 : 0,
    maxPoints: 20,
    matched: orientMatched,
    detail: orientDetail,
  });

  // 3. Same Community
  const sameCommunity = !!(myProfile?.communityId && member.communityId === myProfile.communityId);
  factors.push({
    key: 'community',
    label: 'Same Community',
    emoji: '🎉',
    points: sameCommunity ? 15 : 0,
    maxPoints: 15,
    matched: sameCommunity,
    detail: sameCommunity ? 'Both in the same community' : 'Different communities',
  });

  // 4. Shared Interests
  const myInterests: string[] = Array.isArray(myPrefs?.interests) ? myPrefs.interests : [];
  let theirPrefs: any = {};
  try {
    theirPrefs = typeof member.preferences === 'string'
      ? JSON.parse(member.preferences || '{}')
      : (member.preferences ?? {});
  } catch {}
  const theirInterests: string[] = Array.isArray(theirPrefs?.interests) ? theirPrefs.interests : [];
  const sharedInterests = myInterests.filter((i: string) => theirInterests.includes(i));
  const interestPoints = Math.min(sharedInterests.length * 5, 20);
  factors.push({
    key: 'interests',
    label: 'Shared Interests',
    emoji: '✨',
    points: interestPoints,
    maxPoints: 20,
    matched: sharedInterests.length > 0,
    detail: sharedInterests.length > 0
      ? `${sharedInterests.length} shared: ${sharedInterests.slice(0, 3).join(', ')}`
      : 'No overlap found',
  });

  // 5. Signal Alignment
  const bothLooking = mySignalType === 'looking' && member.signalType === 'looking';
  const signalDetail =
    mySignalType === 'looking' && member.signalType === 'looking' ? 'Both actively looking' :
    mySignalType === 'available' && member.signalType === 'looking' ? "You're available · they're looking" :
    mySignalType === 'looking' && member.signalType === 'available' ? "You're looking · they're available" :
    `You: ${mySignalType} · Them: ${member.signalType ?? 'unknown'}`;
  factors.push({
    key: 'signal',
    label: 'Signal Alignment',
    emoji: '📡',
    points: bothLooking ? 10 : 0,
    maxPoints: 10,
    matched: bothLooking,
    detail: signalDetail,
  });

  // 6. Queer Friendly — skip if myProfile.orientation === 'straight'
  if (myOrientation !== 'straight') {
    const queerFriendly = !!(member.isQueerFriendly);
    factors.push({
      key: 'queer',
      label: 'Queer Friendly',
      emoji: '🏳️‍🌈',
      points: queerFriendly ? 10 : 0,
      maxPoints: 10,
      matched: queerFriendly,
      detail: queerFriendly ? "They're queer friendly" : 'Not marked queer friendly',
    });
  }

  // 7. Proximity
  let proximityPoints = 0;
  let proximityDetail = 'Location unavailable';
  if (member.distance != null) {
    const d = parseFloat(String(member.distance));
    if (d < maxDistance / 4) {
      proximityPoints = 25;
      proximityDetail = `${d.toFixed(1)} km away 🔥`;
    } else if (d < 5) {
      proximityPoints = 15;
      proximityDetail = `${d.toFixed(1)} km away`;
    } else if (d < 20) {
      proximityPoints = 5;
      proximityDetail = `${d.toFixed(1)} km away`;
    } else {
      proximityPoints = 0;
      proximityDetail = `${d.toFixed(1)} km away`;
    }
  }
  factors.push({
    key: 'proximity',
    label: 'Proximity',
    emoji: '📍',
    points: proximityPoints,
    maxPoints: 25,
    matched: proximityPoints > 0,
    detail: proximityDetail,
  });

  // 8. Relationship Style
  const myRelStyle = (myPrefs?.relationshipStatus ?? '').toLowerCase();
  const theirRelStyle = (theirPrefs?.relationshipStatus ?? '').toLowerCase();
  const openEnmSet = new Set(['open relationship', 'ethically non-monogamous', 'enm']);
  const relMatched = !!myRelStyle && !!theirRelStyle && (
    myRelStyle === theirRelStyle ||
    (openEnmSet.has(myRelStyle) && openEnmSet.has(theirRelStyle))
  );
  factors.push({
    key: 'relstyle',
    label: 'Relationship Style',
    emoji: '💑',
    points: relMatched ? 10 : 0,
    maxPoints: 10,
    matched: relMatched,
    detail: relMatched
      ? `Both ${myRelStyle}`
      : myRelStyle && theirRelStyle
        ? `${cap(myRelStyle)} × ${cap(theirRelStyle)}`
        : 'Style not set',
  });

  // 9. Looking For Match
  const myLookingFor: string[] = Array.isArray(myPrefs?.lookingFor) ? myPrefs.lookingFor : [];
  const theirLookingFor: string[] = Array.isArray(theirPrefs?.lookingFor) ? theirPrefs.lookingFor : [];
  const lookingOverlap = myLookingFor.filter((l: string) => theirLookingFor.includes(l));
  factors.push({
    key: 'lookingfor',
    label: 'Looking For Match',
    emoji: '🎯',
    points: lookingOverlap.length > 0 ? 10 : 0,
    maxPoints: 10,
    matched: lookingOverlap.length > 0,
    detail: lookingOverlap.length > 0
      ? `Both want: ${lookingOverlap.slice(0, 3).join(', ')}`
      : 'No overlap',
  });

  return factors;
}

/**
 * Calculates a normalized 0–100 match score between two members.
 *
 * @param member - The member being evaluated
 * @param myProfile - Current user's profile
 * @param myPrefs - Current user's preferences
 * @param mySignalType - Current user's signal type
 * @param seekingGender - Array of genders the current user is seeking
 * @param maxDistance - Maximum acceptable distance in km
 * @returns A percentage score from 0 to 100
 */
export function calculateMatchScore(
  member: any,
  myProfile: any,
  myPrefs: any,
  mySignalType: string,
  seekingGender: string[],
  maxDistance: number,
): number {
  const factors = calculateMatchBreakdown(member, myProfile, myPrefs, mySignalType, seekingGender, maxDistance);
  const raw = factors.reduce((s, f) => s + f.points, 0);
  return Math.min(Math.round((raw / 145) * 100), 100);
}
