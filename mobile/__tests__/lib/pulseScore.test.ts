import { describe, it, expect } from 'vitest';
import { calculateMatchScore, calculateMatchBreakdown } from '../../lib/pulseScore';

/**
 * Mock member and profile objects for testing
 */

// Perfect match scenario — all 9 factors aligned
const perfectMember = {
  userId: 'user-perfect',
  displayName: 'Alex Perfect',
  gender: 'female',
  orientation: 'lesbian',
  communityId: 'community-1',
  preferences: JSON.stringify({
    interests: ['hiking', 'cooking', 'art', 'music'],
    relationshipStatus: 'monogamous',
    lookingFor: ['relationship', 'dating'],
  }),
  signalType: 'looking',
  distance: 2,
  isQueerFriendly: true,
  avatarUrl: null,
};

const perfectProfile = {
  userId: 'user-current',
  orientation: 'lesbian',
  communityId: 'community-1',
};

const perfectPrefs = {
  interests: ['hiking', 'cooking', 'art', 'music', 'sports'],
  relationshipStatus: 'monogamous',
  lookingFor: ['relationship', 'dating'],
};

// Zero overlap scenario — no shared factors
const zerMember = {
  userId: 'user-zero',
  displayName: 'Bob Zero',
  gender: 'male',
  orientation: 'straight',
  communityId: 'community-2',
  preferences: JSON.stringify({
    interests: ['football', 'video-games'],
    relationshipStatus: 'single',
    lookingFor: ['casual'],
  }),
  signalType: 'offline',
  distance: 150,
  isQueerFriendly: false,
  avatarUrl: null,
};

const zeroProfile = {
  userId: 'user-current',
  orientation: 'lesbian',
  communityId: 'community-1',
};

const zeroPrefs = {
  interests: ['hiking', 'cooking', 'art'],
  relationshipStatus: 'monogamous',
  lookingFor: ['relationship'],
};

// Edge case members for factor-specific testing
const edgeDistanceMember = {
  userId: 'user-edge-distance',
  displayName: 'Close Person',
  gender: 'female',
  orientation: 'lesbian',
  communityId: 'community-1',
  preferences: JSON.stringify({
    interests: ['hiking'],
    relationshipStatus: 'monogamous',
    lookingFor: ['relationship'],
  }),
  signalType: 'looking',
  distance: 5, // Boundary: just below 5km threshold for 15 points
  isQueerFriendly: true,
  avatarUrl: null,
};

const edgeFarDistanceMember = {
  userId: 'user-edge-far',
  displayName: 'Far Person',
  gender: 'female',
  orientation: 'lesbian',
  communityId: 'community-1',
  preferences: JSON.stringify({
    interests: ['hiking'],
    relationshipStatus: 'monogamous',
    lookingFor: ['relationship'],
  }),
  signalType: 'looking',
  distance: 20, // Boundary: at 20km threshold
  isQueerFriendly: true,
  avatarUrl: null,
};

const bisexualMember = {
  userId: 'user-bisexual',
  displayName: 'Sam Bisexual',
  gender: 'female',
  orientation: 'bisexual',
  communityId: 'community-1',
  preferences: JSON.stringify({
    interests: ['hiking'],
    relationshipStatus: 'monogamous',
    lookingFor: ['relationship'],
  }),
  signalType: 'looking',
  distance: 10,
  isQueerFriendly: true,
  avatarUrl: null,
};

const straightProfile = {
  userId: 'user-straight',
  orientation: 'straight',
  communityId: 'community-1',
};

const straightPrefs = {
  interests: ['hiking'],
  relationshipStatus: 'monogamous',
  lookingFor: ['relationship'],
};

describe('Pulse Match Score Calculator', () => {
  describe('calculateMatchScore', () => {
    it('returns a number between 0 and 100', () => {
      const score = calculateMatchScore(zerMember, zeroProfile, zeroPrefs, 'looking', ['female'], 999);
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('perfect match scenario yields high score (≥80%)', () => {
      const score = calculateMatchScore(
        perfectMember,
        perfectProfile,
        perfectPrefs,
        'looking',
        ['female'],
        25,
      );
      expect(score).toBeGreaterThanOrEqual(80);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('zero overlap scenario yields very low score (≤20%)', () => {
      const score = calculateMatchScore(
        zerMember,
        zeroProfile,
        zeroPrefs,
        'looking',
        ['female'],
        25,
      );
      expect(score).toBeLessThanOrEqual(20);
    });

    it('score is capped at 100 even with max factors', () => {
      const score = calculateMatchScore(
        perfectMember,
        perfectProfile,
        perfectPrefs,
        'looking',
        ['female'],
        999,
      );
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateMatchBreakdown', () => {
    it('returns exactly 9 or 10 factors (skips queer-friendly if straight)', () => {
      const breakdownNonStraight = calculateMatchBreakdown(
        perfectMember,
        perfectProfile,
        perfectPrefs,
        'looking',
        ['female'],
        25,
      );
      expect(breakdownNonStraight.length).toBe(9); // All 9 factors

      const breakdownStraight = calculateMatchBreakdown(
        bisexualMember,
        straightProfile,
        straightPrefs,
        'looking',
        ['female'],
        25,
      );
      expect(breakdownStraight.length).toBe(8); // Queer-friendly skipped
    });

    it('all factors have expected structure', () => {
      const breakdown = calculateMatchBreakdown(
        perfectMember,
        perfectProfile,
        perfectPrefs,
        'looking',
        ['female'],
        25,
      );
      for (const factor of breakdown) {
        expect(factor).toHaveProperty('key');
        expect(factor).toHaveProperty('label');
        expect(factor).toHaveProperty('emoji');
        expect(factor).toHaveProperty('points');
        expect(factor).toHaveProperty('maxPoints');
        expect(factor).toHaveProperty('matched');
        expect(typeof factor.key).toBe('string');
        expect(typeof factor.label).toBe('string');
        expect(typeof factor.emoji).toBe('string');
        expect(typeof factor.points).toBe('number');
        expect(typeof factor.maxPoints).toBe('number');
        expect(typeof factor.matched).toBe('boolean');
      }
    });

    it('factor points are non-negative and <= maxPoints', () => {
      const breakdown = calculateMatchBreakdown(
        perfectMember,
        perfectProfile,
        perfectPrefs,
        'looking',
        ['female'],
        25,
      );
      for (const factor of breakdown) {
        expect(factor.points).toBeGreaterThanOrEqual(0);
        expect(factor.points).toBeLessThanOrEqual(factor.maxPoints);
      }
    });
  });

  describe('Factor: Gender Match', () => {
    it('awards 25 points for gender match', () => {
      const breakdown = calculateMatchBreakdown(
        perfectMember,
        perfectProfile,
        perfectPrefs,
        'looking',
        ['female'],
        25,
      );
      const genderFactor = breakdown.find(f => f.key === 'gender');
      expect(genderFactor?.points).toBe(25);
      expect(genderFactor?.matched).toBe(true);
    });

    it('awards 0 points for gender mismatch', () => {
      const breakdown = calculateMatchBreakdown(
        zerMember, // male
        zeroProfile,
        zeroPrefs,
        'looking',
        ['female'],
        25,
      );
      const genderFactor = breakdown.find(f => f.key === 'gender');
      expect(genderFactor?.points).toBe(0);
      expect(genderFactor?.matched).toBe(false);
    });

    it('awards 25 points when "any" is selected', () => {
      const breakdown = calculateMatchBreakdown(
        zerMember, // male
        zeroProfile,
        zeroPrefs,
        'looking',
        ['any'], // Open to anyone
        25,
      );
      const genderFactor = breakdown.find(f => f.key === 'gender');
      expect(genderFactor?.points).toBe(25);
    });
  });

  describe('Factor: Orientation Compatibility', () => {
    it('awards 20 points for matching orientation', () => {
      const breakdown = calculateMatchBreakdown(
        perfectMember, // lesbian
        perfectProfile, // lesbian
        perfectPrefs,
        'looking',
        ['female'],
        25,
      );
      const orientFactor = breakdown.find(f => f.key === 'orientation');
      expect(orientFactor?.points).toBe(20);
      expect(orientFactor?.matched).toBe(true);
    });

    it('awards 20 points when bisexual is involved', () => {
      const breakdown = calculateMatchBreakdown(
        bisexualMember, // bisexual
        perfectProfile, // lesbian
        perfectPrefs,
        'looking',
        ['female'],
        25,
      );
      const orientFactor = breakdown.find(f => f.key === 'orientation');
      expect(orientFactor?.points).toBe(20);
      expect(orientFactor?.matched).toBe(true);
    });

    it('awards 0 points for orientation mismatch', () => {
      const breakdown = calculateMatchBreakdown(
        zerMember, // straight
        perfectProfile, // lesbian
        perfectPrefs,
        'looking',
        ['female'],
        25,
      );
      const orientFactor = breakdown.find(f => f.key === 'orientation');
      expect(orientFactor?.points).toBe(0);
      expect(orientFactor?.matched).toBe(false);
    });
  });

  describe('Factor: Same Community', () => {
    it('awards 15 points for same community', () => {
      const breakdown = calculateMatchBreakdown(
        perfectMember,
        perfectProfile,
        perfectPrefs,
        'looking',
        ['female'],
        25,
      );
      const communityFactor = breakdown.find(f => f.key === 'community');
      expect(communityFactor?.points).toBe(15);
      expect(communityFactor?.matched).toBe(true);
    });

    it('awards 0 points for different community', () => {
      const breakdown = calculateMatchBreakdown(
        zerMember, // community-2
        zeroProfile, // community-1
        zeroPrefs,
        'looking',
        ['female'],
        25,
      );
      const communityFactor = breakdown.find(f => f.key === 'community');
      expect(communityFactor?.points).toBe(0);
      expect(communityFactor?.matched).toBe(false);
    });
  });

  describe('Factor: Shared Interests', () => {
    it('awards 5 points per shared interest (max 20)', () => {
      // Shared: hiking, cooking, art = 3 interests × 5 = 15 points
      const breakdown = calculateMatchBreakdown(
        perfectMember, // hiking, cooking, art, music
        perfectProfile,
        perfectPrefs, // hiking, cooking, art, music, sports
        'looking',
        ['female'],
        25,
      );
      const interestFactor = breakdown.find(f => f.key === 'interests');
      expect(interestFactor?.points).toBe(15);
      expect(interestFactor?.matched).toBe(true);
    });

    it('caps shared interests at 20 points', () => {
      const manyInterestsMember = {
        ...perfectMember,
        preferences: JSON.stringify({
          interests: ['hiking', 'cooking', 'art', 'music', 'dancing', 'reading', 'gaming'],
          relationshipStatus: 'monogamous',
          lookingFor: ['relationship'],
        }),
      };
      const breakdown = calculateMatchBreakdown(
        manyInterestsMember,
        perfectProfile,
        perfectPrefs,
        'looking',
        ['female'],
        25,
      );
      const interestFactor = breakdown.find(f => f.key === 'interests');
      expect(interestFactor?.points).toBeLessThanOrEqual(20);
    });

    it('awards 0 points for no shared interests', () => {
      const breakdown = calculateMatchBreakdown(
        zerMember, // interests: football, video-games
        zeroProfile,
        zeroPrefs, // interests: hiking, cooking, art
        'looking',
        ['female'],
        25,
      );
      const interestFactor = breakdown.find(f => f.key === 'interests');
      expect(interestFactor?.points).toBe(0);
      expect(interestFactor?.matched).toBe(false);
    });
  });

  describe('Factor: Signal Alignment', () => {
    it('awards 10 points when both are looking', () => {
      const breakdown = calculateMatchBreakdown(
        perfectMember, // looking
        perfectProfile,
        perfectPrefs,
        'looking', // looking
        ['female'],
        25,
      );
      const signalFactor = breakdown.find(f => f.key === 'signal');
      expect(signalFactor?.points).toBe(10);
      expect(signalFactor?.matched).toBe(true);
    });

    it('awards 0 points when only one is looking', () => {
      const breakdown = calculateMatchBreakdown(
        perfectMember, // looking
        perfectProfile,
        perfectPrefs,
        'available', // available
        ['female'],
        25,
      );
      const signalFactor = breakdown.find(f => f.key === 'signal');
      expect(signalFactor?.points).toBe(0);
      expect(signalFactor?.matched).toBe(false);
    });

    it('awards 0 points when neither is looking', () => {
      const busyMember = { ...perfectMember, signalType: 'busy' };
      const breakdown = calculateMatchBreakdown(
        busyMember,
        perfectProfile,
        perfectPrefs,
        'busy',
        ['female'],
        25,
      );
      const signalFactor = breakdown.find(f => f.key === 'signal');
      expect(signalFactor?.points).toBe(0);
      expect(signalFactor?.matched).toBe(false);
    });
  });

  describe('Factor: Proximity', () => {
    it('awards 25 points for very close distance (< maxDistance/4)', () => {
      const veryCloseMember = { ...perfectMember, distance: 2 };
      const breakdown = calculateMatchBreakdown(
        veryCloseMember,
        perfectProfile,
        perfectPrefs,
        'looking',
        ['female'],
        25, // maxDistance 25, so 25/4 = 6.25 threshold
      );
      const proximityFactor = breakdown.find(f => f.key === 'proximity');
      expect(proximityFactor?.points).toBe(25);
    });

    it('awards 15 points for distance < 5km', () => {
      const breakdown = calculateMatchBreakdown(
        edgeDistanceMember, // distance 5
        perfectProfile,
        perfectPrefs,
        'looking',
        ['female'],
        25,
      );
      const proximityFactor = breakdown.find(f => f.key === 'proximity');
      // 5 is not < 5, so should be 5 points for < 20
      expect(proximityFactor?.points).toBe(5);
    });

    it('awards 5 points for distance 5-20km', () => {
      const breakdown = calculateMatchBreakdown(
        { ...perfectMember, distance: 10 },
        perfectProfile,
        perfectPrefs,
        'looking',
        ['female'],
        25,
      );
      const proximityFactor = breakdown.find(f => f.key === 'proximity');
      expect(proximityFactor?.points).toBe(5);
    });

    it('awards 0 points for distance >= 20km', () => {
      const breakdown = calculateMatchBreakdown(
        edgeFarDistanceMember, // distance 20
        perfectProfile,
        perfectPrefs,
        'looking',
        ['female'],
        25,
      );
      const proximityFactor = breakdown.find(f => f.key === 'proximity');
      expect(proximityFactor?.points).toBe(0);
    });

    it('handles missing distance gracefully', () => {
      const noDistanceMember = { ...perfectMember, distance: null };
      const breakdown = calculateMatchBreakdown(
        noDistanceMember,
        perfectProfile,
        perfectPrefs,
        'looking',
        ['female'],
        25,
      );
      const proximityFactor = breakdown.find(f => f.key === 'proximity');
      expect(proximityFactor?.points).toBe(0);
      expect(proximityFactor?.detail).toBe('Location unavailable');
    });
  });

  describe('Factor: Relationship Style', () => {
    it('awards 10 points for matching relationship style', () => {
      const breakdown = calculateMatchBreakdown(
        perfectMember, // monogamous
        perfectProfile,
        perfectPrefs, // monogamous
        'looking',
        ['female'],
        25,
      );
      const relFactor = breakdown.find(f => f.key === 'relstyle');
      expect(relFactor?.points).toBe(10);
      expect(relFactor?.matched).toBe(true);
    });

    it('awards 10 points when both are open/ENM variants', () => {
      const enmMember = {
        ...perfectMember,
        preferences: JSON.stringify({
          interests: ['hiking'],
          relationshipStatus: 'ethically non-monogamous',
          lookingFor: ['relationship'],
        }),
      };
      const enmPrefs = { ...perfectPrefs, relationshipStatus: 'open relationship' };
      const breakdown = calculateMatchBreakdown(
        enmMember,
        perfectProfile,
        enmPrefs,
        'looking',
        ['female'],
        25,
      );
      const relFactor = breakdown.find(f => f.key === 'relstyle');
      expect(relFactor?.points).toBe(10);
      expect(relFactor?.matched).toBe(true);
    });

    it('awards 0 points for mismatched relationship style', () => {
      const breakdown = calculateMatchBreakdown(
        zerMember, // single
        zeroProfile,
        { ...zeroPrefs, relationshipStatus: 'monogamous' },
        'looking',
        ['female'],
        25,
      );
      const relFactor = breakdown.find(f => f.key === 'relstyle');
      expect(relFactor?.points).toBe(0);
      expect(relFactor?.matched).toBe(false);
    });
  });

  describe('Factor: Looking For Match', () => {
    it('awards 10 points for overlapping lookingFor goals', () => {
      const breakdown = calculateMatchBreakdown(
        perfectMember, // looking for: relationship, dating
        perfectProfile,
        perfectPrefs, // looking for: relationship, dating
        'looking',
        ['female'],
        25,
      );
      const lookingFactor = breakdown.find(f => f.key === 'lookingfor');
      expect(lookingFactor?.points).toBe(10);
      expect(lookingFactor?.matched).toBe(true);
    });

    it('awards 10 points for partial overlap in lookingFor', () => {
      const partialOverlapMember = {
        ...perfectMember,
        preferences: JSON.stringify({
          interests: ['hiking'],
          relationshipStatus: 'monogamous',
          lookingFor: ['dating', 'friendship'],
        }),
      };
      const breakdown = calculateMatchBreakdown(
        partialOverlapMember, // dating (overlaps)
        perfectProfile,
        perfectPrefs, // relationship, dating
        'looking',
        ['female'],
        25,
      );
      const lookingFactor = breakdown.find(f => f.key === 'lookingfor');
      expect(lookingFactor?.points).toBe(10);
      expect(lookingFactor?.matched).toBe(true);
    });

    it('awards 0 points for no lookingFor overlap', () => {
      const breakdown = calculateMatchBreakdown(
        zerMember, // looking for: casual
        zeroProfile,
        zeroPrefs, // looking for: relationship
        'looking',
        ['female'],
        25,
      );
      const lookingFactor = breakdown.find(f => f.key === 'lookingfor');
      expect(lookingFactor?.points).toBe(0);
      expect(lookingFactor?.matched).toBe(false);
    });
  });

  describe('Factor: Queer Friendly', () => {
    it('is included only for non-straight users', () => {
      // Lesbian user: should include queer-friendly factor
      const breakdownLesbian = calculateMatchBreakdown(
        perfectMember,
        perfectProfile, // lesbian
        perfectPrefs,
        'looking',
        ['female'],
        25,
      );
      const queerFactorLesbian = breakdownLesbian.find(f => f.key === 'queer');
      expect(queerFactorLesbian).toBeDefined();

      // Straight user: should NOT include queer-friendly factor
      const breakdownStraight = calculateMatchBreakdown(
        perfectMember,
        straightProfile, // straight
        straightPrefs,
        'looking',
        ['female'],
        25,
      );
      const queerFactorStraight = breakdownStraight.find(f => f.key === 'queer');
      expect(queerFactorStraight).toBeUndefined();
    });

    it('awards 10 points when member is queer friendly', () => {
      const breakdown = calculateMatchBreakdown(
        perfectMember, // isQueerFriendly: true
        perfectProfile,
        perfectPrefs,
        'looking',
        ['female'],
        25,
      );
      const queerFactor = breakdown.find(f => f.key === 'queer');
      expect(queerFactor?.points).toBe(10);
      expect(queerFactor?.matched).toBe(true);
    });

    it('awards 0 points when member is not queer friendly', () => {
      const notFriendlyMember = { ...perfectMember, isQueerFriendly: false };
      const breakdown = calculateMatchBreakdown(
        notFriendlyMember,
        perfectProfile,
        perfectPrefs,
        'looking',
        ['female'],
        25,
      );
      const queerFactor = breakdown.find(f => f.key === 'queer');
      expect(queerFactor?.points).toBe(0);
      expect(queerFactor?.matched).toBe(false);
    });
  });

  describe('Robustness: Edge Cases & Malformed Data', () => {
    it('handles undefined preferences gracefully', () => {
      const noPrefMember = {
        ...perfectMember,
        preferences: undefined,
      };
      expect(() => {
        calculateMatchBreakdown(noPrefMember, perfectProfile, perfectPrefs, 'looking', ['female'], 25);
      }).not.toThrow();
    });

    it('handles malformed JSON in preferences', () => {
      const badJsonMember = {
        ...perfectMember,
        preferences: 'not valid json {',
      };
      expect(() => {
        calculateMatchBreakdown(badJsonMember, perfectProfile, perfectPrefs, 'looking', ['female'], 25);
      }).not.toThrow();
    });

    it('handles missing profile or preferences fields', () => {
      const minimalProfile: any = {};
      const minimalPrefs: any = {};
      expect(() => {
        calculateMatchBreakdown(perfectMember, minimalProfile, minimalPrefs, 'looking', ['female'], 25);
      }).not.toThrow();
    });

    it('handles empty seekingGender array', () => {
      const breakdown = calculateMatchBreakdown(
        perfectMember,
        perfectProfile,
        perfectPrefs,
        'looking',
        [], // Empty array defaults to "any"
        25,
      );
      const genderFactor = breakdown.find(f => f.key === 'gender');
      expect(genderFactor?.points).toBe(25); // Should still match (open to anyone)
    });

    it('normalizes case-insensitive gender/orientation comparisons', () => {
      const memberCaseInsensitive = {
        ...perfectMember,
        gender: 'FEMALE',
        orientation: 'LESBIAN',
      };
      const breakdown = calculateMatchBreakdown(
        memberCaseInsensitive,
        perfectProfile,
        perfectPrefs,
        'looking',
        ['Female'], // Mixed case
        25,
      );
      const genderFactor = breakdown.find(f => f.key === 'gender');
      const orientFactor = breakdown.find(f => f.key === 'orientation');
      expect(genderFactor?.points).toBe(25);
      expect(orientFactor?.points).toBe(20);
    });
  });

  describe('Score Totals & Raw Points', () => {
    it('perfect match reaches near-maximum score', () => {
      const score = calculateMatchScore(
        perfectMember,
        perfectProfile,
        perfectPrefs,
        'looking',
        ['female'],
        25,
      );
      // With all 9 factors matched: 25+20+15+15+10+10+25+10+10 = 140
      // 140/145 * 100 = 96.55 → rounds to 97
      expect(score).toBeGreaterThanOrEqual(90);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('zero overlap yields minimal score', () => {
      const score = calculateMatchScore(
        zerMember,
        zeroProfile,
        zeroPrefs,
        'looking',
        ['female'],
        25,
      );
      expect(score).toBeLessThanOrEqual(15);
    });
  });
});
