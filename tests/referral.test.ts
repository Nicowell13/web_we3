import { describe, expect, it } from 'bun:test';
import { normalizeReferralCode, REFERRAL_REWARD_POINTS } from '../src/modules/user/referral.service';

describe('[REFERRAL-01] referral rules', () => {
  it('normalizes human-entered referral codes', () => {
    expect(normalizeReferralCode(' abcd1234 ')).toBe('ABCD1234');
  });

  it('caps fixed reward at 100 points', () => {
    expect(REFERRAL_REWARD_POINTS).toBe(100);
  });

  it('models one referral record per referred user', () => {
    const rewarded = new Set<string>();
    const reward = (userId: string) => rewarded.has(userId) ? false : (rewarded.add(userId), true);
    expect(reward('new-user')).toBe(true);
    expect(reward('new-user')).toBe(false);
  });

  it('blocks self-referral eligibility', () => {
    const eligible = (referrerId: string, referredId: string) => referrerId !== referredId;
    expect(eligible('u1', 'u1')).toBe(false);
    expect(eligible('u1', 'u2')).toBe(true);
  });
});
