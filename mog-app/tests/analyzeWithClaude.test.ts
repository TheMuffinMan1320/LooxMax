/**
 * Tests for the analyze-face edge function integration.
 *
 * Run with: npx jest tests/analyzeWithClaude.test.ts
 *
 * Requires TEST_USER_EMAIL and TEST_USER_PASSWORD env vars for auth-gated tests.
 * Set them in .env.local or export before running.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const EXPECTED_FEATURE_KEYS = ['jawline', 'cheekbones', 'canthal-tilt', 'skin', 'symmetry', 'hair'];
const HAS_CREDENTIALS = !!(process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD);

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: process.env.TEST_USER_EMAIL!,
    password: process.env.TEST_USER_PASSWORD!,
  });
  if (error || !data.session) throw new Error(`Auth failed: ${error?.message}`);
  return { Authorization: `Bearer ${data.session.access_token}` };
}

function loadTestImageAsBase64(): string {
  const imagePath = path.join(__dirname, 'fixtures', 'test-face.jpg');
  if (!fs.existsSync(imagePath)) {
    throw new Error('Test fixture missing. Add a front-facing JPEG at tests/fixtures/test-face.jpg');
  }
  return fs.readFileSync(imagePath).toString('base64');
}

describe('analyze-face edge function', () => {
  (HAS_CREDENTIALS ? test : test.skip)(
    'returns scores for all expected feature keys',
    async () => {
      const authHeaders = await getAuthHeader();
      const imageBase64 = loadTestImageAsBase64();

      const { data, error } = await supabase.functions.invoke('analyze-face', {
        body: { imageBase64, mediaType: 'image/jpeg' },
        headers: authHeaders,
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.scores).toBeDefined();

      for (const key of EXPECTED_FEATURE_KEYS) {
        expect(data.scores).toHaveProperty(key);
        expect(typeof data.scores[key]).toBe('number');
        expect(data.scores[key]).toBeGreaterThanOrEqual(0);
        expect(data.scores[key]).toBeLessThanOrEqual(10);
      }
    },
    30000,
  );

  (HAS_CREDENTIALS ? test : test.skip)(
    'returns error when body is missing',
    async () => {
      const authHeaders = await getAuthHeader();

      const { error } = await supabase.functions.invoke('analyze-face', {
        body: {},
        headers: authHeaders,
      });

      expect(error).not.toBeNull();
    },
    10000,
  );

  test('returns error when body is empty', async () => {
    const { error } = await supabase.functions.invoke('analyze-face', {
      body: {},
    });

    expect(error).not.toBeNull();
  }, 10000);
});
