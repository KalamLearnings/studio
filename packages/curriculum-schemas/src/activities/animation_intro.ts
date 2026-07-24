/**
 * Animation Intro Activity
 *
 * Plays an uploaded Rive (.riv) animation — e.g. a mascot scene — as passive
 * intro content. Narration comes from the base instruction audio, which gates
 * the Continue button like other intro-style activities.
 *
 * @example
 * ```
 * {
 *   type: 'animation_intro',
 *   config: {
 *     animationUrl: 'https://.../storage/v1/object/public/curriculum-animations/activities/mascot__123.riv',
 *     loop: true
 *   }
 * }
 * ```
 */

import { z } from 'zod';
import { BaseActivitySchema } from '../base';

/**
 * Configuration for Animation Intro activity
 */
export const AnimationIntroConfigSchema = z.object({
  animationUrl: z.string().url()
    .describe('Public URL of the Rive (.riv) file in the curriculum-animations bucket'),

  loop: z.boolean()
    .default(true)
    .describe('Loop the animation while the activity is on screen'),
});

/**
 * Complete Animation Intro activity schema
 */
export const AnimationIntroActivitySchema = BaseActivitySchema.extend({
  type: z.literal('animation_intro'),
  config: AnimationIntroConfigSchema,
});

// Type exports
export type AnimationIntroConfig = z.infer<typeof AnimationIntroConfigSchema>;
export type AnimationIntroActivity = z.infer<typeof AnimationIntroActivitySchema>;
