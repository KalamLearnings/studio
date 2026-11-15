/**
 * Audio Letter Match: hear a sound, pick the letter that makes it. A letter
 * hunt (`letter_hunt.ts`) with an option to play the sound on start (CM-B7).
 *
 * The sound is the target letter's own (letters own their audio, design 3.1;
 * S3 makes it the letter's take, with `madd: true` where the file is a long
 * vowel). So a save sends no audio: `targetLetterAudioUrl` is a v1 hint the
 * server writes, and the legacy `targetLetterAudioId` (an audio library id)
 * is read but no longer written.
 */

import { z } from 'zod';
import { BaseActivitySchema } from '../base.ts';
import { makeLetterHuntReadSchema, makeLetterHuntWriteSchema } from './letter_hunt.ts';

export const AudioLetterMatchConfigSchema = makeLetterHuntWriteSchema({
  playAudioOnStart: z.boolean().optional(),
});

export const AudioLetterMatchReadSchema = makeLetterHuntReadSchema();

export const AudioLetterMatchActivitySchema = BaseActivitySchema.extend({
  type: z.literal('audio_letter_match'),
  config: AudioLetterMatchConfigSchema,
});
