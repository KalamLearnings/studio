/**
 * Generate instruction audio via the TTS edge function and upload it to storage.
 *
 * Shared by the activity form's auto-generate-on-save flow and the manual
 * "Regenerate" action so both produce identical results (same voice, same
 * bucket, same path scheme — with the activity id embedded in the filename when
 * available, for traceability).
 */

const BUCKET_NAME = "curriculum-audio";

/**
 * Letter fields used to resolve instruction template placeholders. Matches the
 * topic letter shape the builder form has on hand (note: the phonetic value is
 * `letter_sound` here, unlike the `transliteration` field on the API Letter
 * type used elsewhere).
 */
export interface TemplateLetter {
  letter?: string;
  name_arabic?: string;
  name_english?: string;
  letter_sound?: string;
}

/**
 * Resolve instruction template placeholders against the topic letter, matching
 * the v1 dashboard:
 *   {{letter}}       -> the Arabic character
 *   {{letter_name}}  -> Arabic name (falls back to English)
 *   {{letter_sound}} -> phonetic sound
 * Resolution happens at TTS time only — the stored instruction text keeps the
 * raw template. Unknown/missing values leave the placeholder untouched.
 */
export function resolveInstructionTemplates(
  text: string,
  letter: TemplateLetter | null | undefined,
): string {
  if (!letter || !text) return text;
  let out = text;
  if (letter.letter) out = out.replace(/\{\{letter\}\}/g, letter.letter);
  const name = letter.name_arabic || letter.name_english;
  if (name) out = out.replace(/\{\{letter_name\}\}/g, name);
  if (letter.letter_sound) {
    out = out.replace(/\{\{letter_sound\}\}/g, letter.letter_sound);
  }
  return out;
}

export interface GenerateInstructionAudioParams {
  /** Instruction text to voice (may contain {{...}} placeholders). */
  text: string;
  /** Topic letter used to resolve placeholders before TTS. */
  letter?: TemplateLetter | null;
  /** ElevenLabs voice id. Falls back to the backend default when omitted. */
  voiceId?: string;
  /** Activity id, embedded in the stored filename when present. */
  activityId?: string;
}

export interface GeneratedInstructionAudio {
  /** Relative storage path stored on the activity (instruction.audio_url). */
  filePath: string;
  /** The raw audio blob (e.g. for immediate local playback). */
  blob: Blob;
}

interface TTSResponse {
  data?: { audio_data: string; suggested_file_path: string; content_type?: string };
  audio_data?: string;
  suggested_file_path?: string;
  content_type?: string;
}

function base64ToBlob(base64: string, contentType = "audio/mpeg"): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: contentType });
}

/**
 * Calls /tts, uploads the result to the curriculum-audio bucket, and returns the
 * relative storage path (to persist as instruction.audio_url) plus the blob.
 * Throws on auth failure, TTS failure, or upload failure.
 */
export async function generateInstructionAudio(
  params: GenerateInstructionAudioParams,
): Promise<GeneratedInstructionAudio> {
  const { text, letter, voiceId, activityId } = params;

  // Resolve {{...}} placeholders so the audio voices the real values, not the
  // literal template. The stored instruction text keeps the raw template.
  const resolvedText = resolveInstructionTemplates(text, letter);

  const { createClient, getEnvironmentBaseUrl, getEdgeFunctionAuthHeaders } =
    await import("@/lib/supabase/client");
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error("Not authenticated. Please log in.");
  }

  const response = await fetch(`${getEnvironmentBaseUrl()}/functions/v1/tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getEdgeFunctionAuthHeaders(session.access_token),
    },
    body: JSON.stringify({
      text: resolvedText,
      language: "en",
      ...(voiceId ? { voice_id: voiceId } : {}),
      ...(activityId ? { activity_id: activityId } : {}),
    }),
  });

  if (!response.ok) {
    let message = "Failed to generate audio";
    try {
      const err = await response.json();
      message = err.error || message;
    } catch {
      // non-JSON error body
    }
    throw new Error(message);
  }

  const json: TTSResponse = await response.json();
  const data = json.data ?? json;
  const audioData = data.audio_data;
  const suggestedPath = data.suggested_file_path;

  if (!audioData) throw new Error("No audio data in TTS response");

  const blob = base64ToBlob(audioData, data.content_type);
  const filePath = suggestedPath ||
    `instructions/${activityId ?? "instruction"}_en_${Date.now()}.mp3`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, blob, {
      contentType: "audio/mpeg",
      cacheControl: "31536000",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  return { filePath, blob };
}
