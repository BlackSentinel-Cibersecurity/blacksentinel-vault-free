// ============================================================================
// BlackSentinel Vault — Free / Open-Source Edition
//
// Numbers come from BUSINESS-MODEL.md's own "Free" plan row (3 users, 10
// secrets). PAM, AI-powered risk analysis, and compliance reporting are
// paid-plan only and are not included in this repository's source at all
// (routes/pam.ts, routes/ai.ts, routes/compliance.ts, services/ai.ts) — see
// the full BlackSentinel Vault product for those.
// ============================================================================

export const FREE_LIMITS = {
  maxUsers: 3,
  maxSecrets: 10,
} as const;

export const editionConfig = {
  edition: 'free' as const,
  limits: FREE_LIMITS,
};
