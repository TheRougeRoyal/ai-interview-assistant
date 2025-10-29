/**
 * Feature Flags System
 * Centralized feature flag management with environment-based defaults
 */

import { env } from './env';

/**
 * Feature flag definitions
 */
export const FeatureFlags = {
  // AI & Machine Learning
  AI_SCORING: 'FEATURE_AI_SCORING',
  RESUME_PARSING: 'FEATURE_RESUME_PARSING',
  
  // Recording & Analytics
  SESSION_RECORDING: 'FEATURE_SESSION_RECORDING',
  
  // Notifications
  EMAIL_NOTIFICATIONS: 'FEATURE_EMAIL_NOTIFICATIONS',
  
  // Reporting
  EXPORT_REPORTS: 'FEATURE_EXPORT_REPORTS',
  
  // Upload
  BULK_UPLOAD: 'FEATURE_BULK_UPLOAD',
} as const;

export type FeatureFlag = typeof FeatureFlags[keyof typeof FeatureFlags];

/**
 * Feature flag state
 */
interface FeatureFlagState {
  [key: string]: boolean;
}

/**
 * Initialize feature flags from environment
 */
function initializeFlags(): FeatureFlagState {
  return {
    [FeatureFlags.AI_SCORING]: env.FEATURE_AI_SCORING === 'true',
    [FeatureFlags.RESUME_PARSING]: env.FEATURE_RESUME_PARSING === 'true',
    [FeatureFlags.SESSION_RECORDING]: env.FEATURE_SESSION_RECORDING === 'true',
    [FeatureFlags.EMAIL_NOTIFICATIONS]: env.FEATURE_EMAIL_NOTIFICATIONS === 'true',
    [FeatureFlags.EXPORT_REPORTS]: env.FEATURE_EXPORT_REPORTS === 'true',
    [FeatureFlags.BULK_UPLOAD]: env.FEATURE_BULK_UPLOAD === 'true',
  };
}

/**
 * Feature flags state (can be overridden at runtime)
 */
let featureFlags: FeatureFlagState = initializeFlags();

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return featureFlags[flag] ?? false;
}

/**
 * Enable a feature flag (runtime override)
 */
export function enableFeature(flag: FeatureFlag): void {
  featureFlags[flag] = true;
  console.log(`✅ Feature enabled: ${flag}`);
}

/**
 * Disable a feature flag (runtime override)
 */
export function disableFeature(flag: FeatureFlag): void {
  featureFlags[flag] = false;
  console.log(`❌ Feature disabled: ${flag}`);
}

/**
 * Toggle a feature flag (runtime override)
 */
export function toggleFeature(flag: FeatureFlag): boolean {
  featureFlags[flag] = !featureFlags[flag];
  console.log(`🔄 Feature toggled: ${flag} = ${featureFlags[flag]}`);
  return featureFlags[flag];
}

/**
 * Get all feature flags status
 */
export function getAllFeatures(): FeatureFlagState {
  return { ...featureFlags };
}

/**
 * Reset feature flags to environment defaults
 */
export function resetFeatures(): void {
  featureFlags = initializeFlags();
  console.log('🔄 Feature flags reset to environment defaults');
}

/**
 * Set multiple feature flags at once
 */
export function setFeatures(flags: Partial<Record<string, boolean>>): void {
  Object.entries(flags).forEach(([flag, enabled]) => {
    if (enabled !== undefined) {
      featureFlags[flag] = enabled;
    }
  });
  console.log('🔧 Feature flags updated');
}

/**
 * Print current feature flags status
 */
export function printFeatures(): void {
  console.log('🎯 Feature Flags:');
  Object.entries(featureFlags).forEach(([flag, enabled]) => {
    console.log(`   ${flag}: ${enabled ? '✅ enabled' : '❌ disabled'}`);
  });
  console.log('');
}

/**
 * React hook for checking feature flags (client-side)
 */
export function useFeature(flag: FeatureFlag): boolean {
  return isFeatureEnabled(flag);
}

/**
 * Decorator for feature-gated functions
 */
export function requireFeature(flag: FeatureFlag) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = function (...args: any[]) {
      if (!isFeatureEnabled(flag)) {
        throw new Error(`Feature ${flag} is not enabled`);
      }
      return originalMethod.apply(this, args);
    };
    
    return descriptor;
  };
}

/**
 * Middleware for feature-gated API routes
 */
export function featureGuard(flag: FeatureFlag) {
  return function (handler: Function) {
    return function (...args: any[]) {
      if (!isFeatureEnabled(flag)) {
        return new Response(
          JSON.stringify({
            error: 'Feature not available',
            message: `Feature ${flag} is not enabled`,
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      return handler(...args);
    };
  };
}

/**
 * Environment-specific feature presets
 */
export const FeaturePresets = {
  development: {
    [FeatureFlags.AI_SCORING]: true,
    [FeatureFlags.RESUME_PARSING]: true,
    [FeatureFlags.SESSION_RECORDING]: true,
    [FeatureFlags.EMAIL_NOTIFICATIONS]: false,
    [FeatureFlags.EXPORT_REPORTS]: true,
    [FeatureFlags.BULK_UPLOAD]: true,
  },
  staging: {
    [FeatureFlags.AI_SCORING]: true,
    [FeatureFlags.RESUME_PARSING]: true,
    [FeatureFlags.SESSION_RECORDING]: true,
    [FeatureFlags.EMAIL_NOTIFICATIONS]: true,
    [FeatureFlags.EXPORT_REPORTS]: true,
    [FeatureFlags.BULK_UPLOAD]: false,
  },
  production: {
    [FeatureFlags.AI_SCORING]: true,
    [FeatureFlags.RESUME_PARSING]: true,
    [FeatureFlags.SESSION_RECORDING]: false,
    [FeatureFlags.EMAIL_NOTIFICATIONS]: true,
    [FeatureFlags.EXPORT_REPORTS]: true,
    [FeatureFlags.BULK_UPLOAD]: false,
  },
};

/**
 * Apply environment preset
 */
export function applyPreset(environment: keyof typeof FeaturePresets): void {
  const preset = FeaturePresets[environment];
  if (preset) {
    setFeatures(preset);
    console.log(`✅ Applied ${environment} feature preset`);
  }
}
