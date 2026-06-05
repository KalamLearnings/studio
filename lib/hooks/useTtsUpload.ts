/**
 * useTtsUpload
 *
 * Generates TTS audio for a piece of text and uploads it to the
 * `curriculum-audio` storage bucket, returning the public URL.
 *
 * Used by the book page editor (and reusable elsewhere) to produce
 * narration audio that gets stored on a record's `audio_url` field.
 */

import { useState, useCallback } from "react";
import { toast } from "sonner";

interface GenerateAndUploadArgs {
  text: string;
  voiceId: string;
  /** Storage sub-folder within the curriculum-audio bucket. */
  folder?: string;
}

export function useTtsUpload() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateAndUpload = useCallback(
    async ({
      text,
      voiceId,
      folder = "books",
    }: GenerateAndUploadArgs): Promise<string | null> => {
      const trimmed = text.trim();
      if (!trimmed) {
        toast.error("Please enter text for audio generation");
        return null;
      }

      setIsGenerating(true);
      try {
        const { createClient, getEnvironmentBaseUrl, getEdgeFunctionAuthHeaders } =
          await import("@/lib/supabase/client");
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.access_token) {
          throw new Error("Not authenticated. Please log in.");
        }

        const response = await fetch(
          `${getEnvironmentBaseUrl()}/functions/v1/tts`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...getEdgeFunctionAuthHeaders(session.access_token),
            },
            body: JSON.stringify({ text: trimmed, voice_id: voiceId }),
          }
        );

        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || "Failed to generate audio");
        }

        const json = await response.json();
        const data = json.data || json;

        // base64 -> blob
        const binary = atob(data.audio_data);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], {
          type: data.content_type || "audio/mpeg",
        });

        const fileName = `${folder}/tts-${Date.now()}.mp3`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("curriculum-audio")
          .upload(fileName, blob, {
            contentType: "audio/mpeg",
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        const {
          data: { publicUrl },
        } = supabase.storage
          .from("curriculum-audio")
          .getPublicUrl(uploadData.path);

        toast.success("Audio generated and uploaded!");
        return publicUrl;
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to generate audio"
        );
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  return { isGenerating, generateAndUpload };
}
