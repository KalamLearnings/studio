/**
 * API Client for Curriculum operations
 * All functions throw on error - wrap in try/catch
 */

import type {
  Curriculum,
  Topic,
  Node,
  Article,
  CreateCurriculum,
  CreateTopic,
  CreateNode,
  CreateArticle,
  UpdateCurriculum,
  UpdateTopic,
  UpdateNode,
  UpdateArticle,
  BatchReorder,
  ActivityTemplate,
  CreateActivityTemplate,
  UpdateActivityTemplate,
  InstantiateTemplate,
} from '@/lib/schemas/curriculum';

// ============================================================================
// HELPERS
// ============================================================================

import { getPersistedEnvironment, getConfigForEnvironment } from '@/lib/stores/environmentStore';
import { getClientForEnv } from '@/lib/supabase/client';

async function fetchWithAuth<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const env = getPersistedEnvironment();
  const config = getConfigForEnvironment(env);
  const token = await getAuthToken();

  const res = await fetch(`${config.url}/functions/v1${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: config.anonKey,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  const json = await res.json();
  return json.data?.data || json.data || json;
}

async function getAuthToken(): Promise<string> {
  if (typeof window === 'undefined') {
    throw new Error('Auth token only available client-side');
  }

  const env = getPersistedEnvironment();
  const supabase = getClientForEnv(env);

  // Try the client's cached session first
  let {
    data: { session },
  } = await supabase.auth.getSession();

  // If the client hasn't loaded from storage yet, hydrate it manually.
  // This handles the race where the singleton was just created and its
  // async _initialize() hasn't completed reading localStorage yet.
  if (!session) {
    const storageKey = `kalam-auth-${env}`;
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      try {
        const stored = JSON.parse(raw);
        const accessToken = stored?.access_token;
        const refreshToken = stored?.refresh_token;
        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (!error) {
            session = data.session;
          }
        }
      } catch {
        // ignore parse errors
      }
    }
  }

  if (!session) {
    throw new Error('NOT_AUTHENTICATED_FOR_ENV');
  }

  // If the access token is expired or about to expire (within 60s), refresh it
  const expiresAt = session.expires_at ?? 0; // unix seconds
  const nowSec = Math.floor(Date.now() / 1000);

  if (expiresAt - nowSec < 60) {
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (error || !refreshed.session) {
      throw new Error('NOT_AUTHENTICATED_FOR_ENV');
    }
    return refreshed.session.access_token;
  }

  return session.access_token;
}

// ============================================================================
// CURRICULUM
// ============================================================================

export async function listCurricula(): Promise<Curriculum[]> {
  // CMS uses /list/all to include drafts, mobile app uses /list for published only
  return fetchWithAuth<Curriculum[]>('/curriculum/list/all');
}

export async function getCurriculum(id: string): Promise<Curriculum> {
  return fetchWithAuth<Curriculum>(`/curriculum/${id}`);
}

export async function createCurriculum(
  data: CreateCurriculum
): Promise<Curriculum> {
  return fetchWithAuth<Curriculum>('/curriculum', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCurriculum(
  id: string,
  data: UpdateCurriculum
): Promise<Curriculum> {
  return fetchWithAuth<Curriculum>(`/curriculum/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteCurriculum(id: string): Promise<void> {
  return fetchWithAuth<void>(`/curriculum/${id}`, { method: 'DELETE' });
}

// ============================================================================
// TOPICS
// ============================================================================

export async function listTopics(curriculumId: string): Promise<Topic[]> {
  return fetchWithAuth<Topic[]>(`/curriculum/${curriculumId}/topics`);
}

export async function getTopic(
  curriculumId: string,
  topicId: string
): Promise<Topic> {
  return fetchWithAuth<Topic>(`/curriculum/${curriculumId}/topics/${topicId}`);
}

export async function createTopic(
  curriculumId: string,
  data: CreateTopic
): Promise<Topic> {
  return fetchWithAuth<Topic>(`/curriculum/${curriculumId}/topics`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTopic(
  curriculumId: string,
  topicId: string,
  data: UpdateTopic
): Promise<Topic> {
  return fetchWithAuth<Topic>(
    `/curriculum/${curriculumId}/topics/${topicId}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    }
  );
}

export async function deleteTopic(
  curriculumId: string,
  topicId: string
): Promise<void> {
  return fetchWithAuth<void>(`/curriculum/${curriculumId}/topics/${topicId}`, {
    method: 'DELETE',
  });
}

export async function duplicateTopic(
  curriculumId: string,
  topicId: string,
  targetLetterId: string
): Promise<Topic> {
  return fetchWithAuth<Topic>(
    `/curriculum/${curriculumId}/topics/${topicId}/duplicate`,
    {
      method: 'POST',
      body: JSON.stringify({ target_letter_id: targetLetterId }),
    }
  );
}

// ============================================================================
// NODES
// ============================================================================

export async function listNodes(
  curriculumId: string,
  topicId: string | null
): Promise<Node[]> {
  // If topicId is null, fetch all nodes across all topics
  const path = topicId
    ? `/curriculum/${curriculumId}/topics/${topicId}/nodes`
    : `/curriculum/${curriculumId}/nodes`;

  return fetchWithAuth<Node[]>(path);
}

export async function getNode(
  curriculumId: string,
  topicId: string,
  nodeId: string
): Promise<Node> {
  return fetchWithAuth<Node>(
    `/curriculum/${curriculumId}/topics/${topicId}/nodes/${nodeId}`
  );
}

export async function createNode(
  curriculumId: string,
  topicId: string,
  data: CreateNode
): Promise<Node> {
  return fetchWithAuth<Node>(
    `/curriculum/${curriculumId}/topics/${topicId}/nodes`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
}

export async function updateNode(
  curriculumId: string,
  topicId: string,
  nodeId: string,
  data: UpdateNode
): Promise<Node> {
  return fetchWithAuth<Node>(
    `/curriculum/${curriculumId}/topics/${topicId}/nodes/${nodeId}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    }
  );
}

export async function deleteNode(
  curriculumId: string,
  topicId: string,
  nodeId: string
): Promise<void> {
  return fetchWithAuth<void>(
    `/curriculum/${curriculumId}/nodes/${nodeId}`,
    {
      method: 'DELETE',
    }
  );
}

/**
 * Batch reorder topics within a curriculum
 */
export async function reorderTopics(
  curriculumId: string,
  data: BatchReorder
): Promise<void> {
  return fetchWithAuth<void>(
    `/curriculum/${curriculumId}/topics/reorder`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
}

/**
 * Batch reorder nodes within a topic
 */
export async function reorderNodes(
  curriculumId: string,
  topicId: string,
  data: BatchReorder
): Promise<void> {
  return fetchWithAuth<void>(
    `/curriculum/${curriculumId}/topics/${topicId}/nodes/reorder`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
}

// ============================================================================
// ARTICLES (Activities)
// ============================================================================

export async function listArticles(
  curriculumId: string,
  nodeId: string
): Promise<Article[]> {
  return fetchWithAuth<Article[]>(
    `/curriculum/${curriculumId}/nodes/${nodeId}/activities`
  );
}

export async function createArticle(
  curriculumId: string,
  data: CreateArticle & { node_id: string }
): Promise<Article> {
  return fetchWithAuth<Article>(`/curriculum/${curriculumId}/activities`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateArticle(
  curriculumId: string,
  articleId: string,
  data: UpdateArticle
): Promise<Article> {
  return fetchWithAuth<Article>(
    `/curriculum/${curriculumId}/activities/${articleId}`,
    {
      method: 'PUT',
      body: JSON.stringify(data),
    }
  );
}

export async function deleteArticle(
  curriculumId: string,
  articleId: string
): Promise<void> {
  return fetchWithAuth<void>(
    `/curriculum/${curriculumId}/activities/${articleId}`,
    {
      method: 'DELETE',
    }
  );
}

/**
 * Batch reorder articles within a node
 */
export async function reorderArticles(
  curriculumId: string,
  nodeId: string,
  data: BatchReorder
): Promise<void> {
  return fetchWithAuth<void>(
    `/curriculum/${curriculumId}/nodes/${nodeId}/activities/reorder`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
}

// ============================================================================
// ACTIVITY TEMPLATES
// ============================================================================

/**
 * List all activity templates
 */
export async function listActivityTemplates(params?: {
  type?: string;
  category?: string;
}): Promise<ActivityTemplate[]> {
  const searchParams = new URLSearchParams();
  if (params?.type) searchParams.append('type', params.type);
  if (params?.category) searchParams.append('category', params.category);

  const query = searchParams.toString();
  return fetchWithAuth<ActivityTemplate[]>(
    `/curriculum/templates${query ? `?${query}` : ''}`
  );
}

/**
 * Get a single activity template by ID
 */
export async function getActivityTemplate(id: string): Promise<ActivityTemplate> {
  return fetchWithAuth<ActivityTemplate>(`/curriculum/templates/${id}`);
}

/**
 * Create a new activity template
 */
export async function createActivityTemplate(
  data: CreateActivityTemplate
): Promise<ActivityTemplate> {
  return fetchWithAuth<ActivityTemplate>('/curriculum/templates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Update an existing activity template
 */
export async function updateActivityTemplate(
  id: string,
  data: UpdateActivityTemplate
): Promise<ActivityTemplate> {
  return fetchWithAuth<ActivityTemplate>(`/curriculum/templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * Delete an activity template
 */
export async function deleteActivityTemplate(id: string): Promise<void> {
  return fetchWithAuth<void>(`/curriculum/templates/${id}`, {
    method: 'DELETE',
  });
}

/**
 * Instantiate a template with variables
 */
export async function instantiateTemplate(
  data: InstantiateTemplate
): Promise<Article> {
  return fetchWithAuth<Article>('/curriculum/templates/instantiate', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================================================
// ACTIVITIES BY TYPE (for CMS "view by type" feature)
// ============================================================================

export interface ActivityByType {
  id: string;
  node_id: string;
  sequence_number: number;
  type: string;
  instruction: { en: string; ar?: string; audio_url?: string };
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  topic: { id: string; title: { en: string; ar?: string }; sequence_number: number };
  node: { id: string; title: { en: string; ar?: string }; sequence_number: number };
}

export interface ActivityTypeGroup {
  type: string;
  count: number;
  activities: ActivityByType[];
}

/**
 * List all activities in a curriculum grouped by type
 * Used for the CMS "view by type" feature
 */
export async function listActivitiesByType(
  curriculumId: string
): Promise<ActivityTypeGroup[]> {
  return fetchWithAuth<ActivityTypeGroup[]>(
    `/curriculum/${curriculumId}/activities/by-type`
  );
}

// ============================================================================
// AI GENERATION
// ============================================================================

export interface GenerateTopicRequest {
  curriculum_id: string;
  topic_title: { en: string; ar?: string };
  learning_objective: string;
  letter_id?: string;
  reference_topic_id?: string;
  node_count?: number;
  activities_per_node_min?: number;
  activities_per_node_max?: number;
}

export interface GeneratedActivity {
  type: string;
  instruction: { en: string; ar?: string };
  config: Record<string, unknown>;
}

export interface GeneratedNode {
  type: 'intro' | 'lesson' | 'practice' | 'review' | 'boss';
  title: { en: string; ar?: string };
  activities: GeneratedActivity[];
}

export interface GeneratedTopic {
  title: { en: string; ar?: string };
  description?: { en: string; ar?: string };
  nodes: GeneratedNode[];
}

export interface GenerateTopicResponse {
  generated: GeneratedTopic;
  validation: {
    warnings: string[];
  };
}

/**
 * Generate a topic preview using AI. Does NOT save to database.
 * Returns generated content for human review and editing.
 */
export async function generateTopicPreview(
  data: GenerateTopicRequest
): Promise<GenerateTopicResponse> {
  return fetchWithAuth<GenerateTopicResponse>('/ai/generate-topic', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
