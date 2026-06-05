/**
 * Activity Request
 *
 * A placeholder activity type that allows curriculum creators to describe
 * activities they want built. This helps capture requirements and ideas
 * for future implementation.
 *
 * @example
 * ```
 * {
 *   type: 'activity_request',
 *   config: {
 *     description: 'Students match letter sounds with pictures of objects that start with that letter',
 *     notes: 'Should have audio playback for each letter sound'
 *   }
 * }
 * ```
 */

import { z } from 'zod';
import { BaseActivitySchema } from '../base';

/**
 * Configuration for Activity Request
 */
export const ActivityRequestConfigSchema = z.object({
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .describe('Description of the activity to be built'),

  notes: z.string()
    .optional()
    .describe('Additional notes, requirements, or implementation details'),
});

/**
 * Complete Activity Request schema
 */
export const ActivityRequestActivitySchema = BaseActivitySchema.extend({
  type: z.literal('activity_request'),
  config: ActivityRequestConfigSchema,
});

// Type exports
export type ActivityRequestConfig = z.infer<typeof ActivityRequestConfigSchema>;
export type ActivityRequestActivity = z.infer<typeof ActivityRequestActivitySchema>;
