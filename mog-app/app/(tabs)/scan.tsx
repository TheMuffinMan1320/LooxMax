import { useAuth } from '@/context/auth';
import { FEATURES } from '@/constants/features';
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const FACE_FEATURE_IDS = ['jawline', 'cheekbones', 'canthal-tilt', 'skin', 'symmetry', 'hair'];
const DOW_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

type AnalysisResult = Record<string, number>;

type ScanRecord = {
  id: string;
  scores: AnalysisResult;
  overallScore: number;
  scannedAt: Date;
};

function imageMediaType(uri: string): string {
  const ext = uri.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
}

async function analyzeWithClaude(imageBase64: string, imageUri: string): Promise<AnalysisResult> {
  const mediaType = imageMediaType(imageUri);

  const { data: { session } } = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke('analyze-face', {
    body: { imageBase64, mediaType },
    headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
  });

  if (error) throw new Error(error.message);

  const scores = data?.scores as Record<string, number> | undefined;
  if (!scores) throw new Error('No scores returned from analysis.');

  return scores;
}

function scoreColor(score: number): string {
  if (score >= 8) return '#4ade80';
  if (score >= 6.5) return '#facc15';
  if (score >= 5) return '#fb923c';
  return '#f87171';
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildCalendarCells(year: number, month: number) {
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ day: number | null; key: string | null }> = [];
  for (let i = 0; i < firstDow; i++) cells.push({ day: null, key: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push({ day: d, key });
  }
  return cells;
}

export default function ScanScreen() {
  const { user } = useAuth();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [calDate, setCalDate] = useState(() => new Date());

  useEffect(() => {
    if (user) loadScans();
  }, [user?.id]);

  const loadScans = async () => {
    const { data } = await supabase
      .from('scans')
      .select('id, scores, overall_score, scanned_at')
      .eq('user_id', user!.id)
      .order('scanned_at', { ascending: false });
    if (data) {
      setScans(
        data.map(row => ({
          id: row.id,
          scores: row.scores as AnalysisResult,
          overallScore: row.overall_score,
          scannedAt: new Date(row.scanned_at),
        })),
      );
    }
  };

  const saveScan = async (scores: AnalysisResult) => {
    if (!user) return;
    const overall =
      Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length;
    await supabase.from('scans').insert({
      user_id: user.id,
      scores,
      overall_score: parseFloat(overall.toFixed(2)),
    });
    await loadScans();
  };

  // Build date → best overall score map for the calendar
  const scanMap = useMemo(() => {
    const map: Record<string, number> = {};
    scans.forEach(s => {
      const k = toDateKey(s.scannedAt);
      if (map[k] === undefined || s.overallScore > map[k]) map[k] = s.overallScore;
    });
    return map;
  }, [scans]);

  const pickImage = async (fromCamera: boolean) => {
    const { status } = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const picked = fromCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.85,
          base64: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.85,
          base64: true,
        });
    if (!picked.canceled && picked.assets[0]) {
      setImageUri(picked.assets[0].uri);
      setImageBase64(picked.assets[0].base64 ?? null);
      setResults(null);
    }
  };

  const handleAnalyze = async () => {
    if (!imageUri || !imageBase64) return;
    setAnalyzing(true);
    try {
      const scores = await analyzeWithClaude(imageBase64, imageUri);
      setResults(scores);
      await saveScan(scores);
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setImageUri(null);
    setImageBase64(null);
    setResults(null);
  };

  const prevMonth = () =>
    setCalDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () =>
    setCalDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const todayKey = toDateKey(new Date());
  const cells = buildCalendarCells(calDate.getFullYear(), calDate.getMonth());
  const faceFeatures = FEATURES.filter(f => FACE_FEATURE_IDS.includes(f.id));

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Face Scan</Text>
          <Text style={styles.subtitle}>Upload a front-facing photo to score your traits</Text>
        </View>

        {/* ── Calendar ── */}
        <View style={styles.calCard}>
          <View style={styles.calHeader}>
            <TouchableOpacity onPress={prevMonth} hitSlop={14} style={styles.calNavBtn}>
              <Text style={styles.calNavArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.calMonthTitle}>
              {MONTH_NAMES[calDate.getMonth()]} {calDate.getFullYear()}
            </Text>
            <TouchableOpacity onPress={nextMonth} hitSlop={14} style={styles.calNavBtn}>
              <Text style={styles.calNavArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Day-of-week labels */}
          <View style={styles.calDowRow}>
            {DOW_LABELS.map(d => (
              <View key={d} style={styles.calDowCell}>
                <Text style={styles.calDowLabel}>{d}</Text>
              </View>
            ))}
          </View>

          {/* Day grid */}
          <View style={styles.calGrid}>
            {cells.map((cell, i) => {
              const score = cell.key ? scanMap[cell.key] : undefined;
              const isToday = cell.key === todayKey;
              return (
                <View key={i} style={styles.calCell}>
                  {cell.day !== null && (
                    <>
                      <View
                        style={[
                          styles.calDayCircle,
                          isToday && styles.calDayCircleToday,
                          score !== undefined && {
                            backgroundColor: scoreColor(score) + '22',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.calDayNum,
                            isToday && styles.calDayNumToday,
                            score !== undefined && { color: scoreColor(score) },
                          ]}
                        >
                          {cell.day}
                        </Text>
                      </View>
                      {score !== undefined && (
                        <Text style={[styles.calScore, { color: scoreColor(score) }]}>
                          {score.toFixed(1)}
                        </Text>
                      )}
                    </>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Scan interface ── */}
        {imageUri ? (
          <View style={styles.photoWrap}>
            <Image source={{ uri: imageUri }} style={styles.photo} />
            <TouchableOpacity style={styles.retakeBtn} onPress={reset}>
              <Text style={styles.retakeBtnText}>Retake</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.uploadArea}>
            <View style={styles.uploadIconWrap}>
              <Text style={styles.uploadIconGlyph}>􀒑</Text>
            </View>
            <Text style={styles.uploadTitle}>Upload a Photo</Text>
            <Text style={styles.uploadHint}>
              Front-facing · good lighting · neutral expression
            </Text>
            <View style={styles.uploadButtons}>
              <TouchableOpacity style={styles.primaryBtn} onPress={() => pickImage(true)}>
                <Text style={styles.primaryBtnText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => pickImage(false)}>
                <Text style={styles.secondaryBtnText}>Library</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {imageUri && !results && (
          <TouchableOpacity
            style={[styles.analyzeBtn, analyzing && styles.analyzeBtnDisabled]}
            onPress={handleAnalyze}
            disabled={analyzing}
          >
            {analyzing ? (
              <View style={styles.analyzingRow}>
                <ActivityIndicator size="small" color="#000" />
                <Text style={styles.analyzeBtnText}>Analyzing…</Text>
              </View>
            ) : (
              <Text style={styles.analyzeBtnText}>Analyze Face</Text>
            )}
          </TouchableOpacity>
        )}

        {results && (
          <>
            <Text style={styles.sectionLabel}>Results</Text>
            {faceFeatures.map(feature => {
              const score = results[feature.id] ?? 0;
              return (
                <View key={feature.id} style={styles.resultRow}>
                  <Text style={styles.resultName}>{feature.name}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${(score / 10) * 100}%` as any,
                          backgroundColor: scoreColor(score),
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.resultScore, { color: scoreColor(score) }]}>
                    {score.toFixed(1)}
                  </Text>
                </View>
              );
            })}
            <TouchableOpacity style={styles.rescanBtn} onPress={reset}>
              <Text style={styles.rescanBtnText}>Scan Again</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { padding: 20, paddingBottom: 48 },
  header: { marginBottom: 24 },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { color: '#8e8e93', fontSize: 14, marginTop: 4 },

  // Calendar
  calCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calNavBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calNavArrow: {
    color: '#8e8e93',
    fontSize: 24,
    fontWeight: '300',
    lineHeight: 28,
  },
  calMonthTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  calDowRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  calDowCell: {
    width: '14.285714%',
    alignItems: 'center',
    paddingVertical: 4,
  },
  calDowLabel: {
    color: '#636366',
    fontSize: 12,
    fontWeight: '500',
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calCell: {
    width: '14.285714%',
    alignItems: 'center',
    paddingVertical: 3,
    height: 52,
    justifyContent: 'flex-start',
  },
  calDayCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDayCircleToday: {
    borderWidth: 1.5,
    borderColor: '#facc15',
  },
  calDayNum: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '400',
  },
  calDayNumToday: {
    color: '#facc15',
    fontWeight: '600',
  },
  calScore: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },

  // Upload idle state
  uploadArea: {
    backgroundColor: '#1c1c1e',
    borderRadius: 24,
    paddingVertical: 44,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  uploadIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#2c2c2e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  uploadIconGlyph: { fontSize: 32, color: '#facc15' },
  uploadTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  uploadHint: { color: '#8e8e93', fontSize: 13, textAlign: 'center', marginBottom: 28 },
  uploadButtons: { flexDirection: 'row', gap: 12 },
  primaryBtn: {
    backgroundColor: '#facc15',
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 13,
  },
  primaryBtnText: { color: '#000', fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    backgroundColor: '#2c2c2e',
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 13,
  },
  secondaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  // Photo preview
  photoWrap: { position: 'relative', marginBottom: 20 },
  photo: { width: '100%', aspectRatio: 1, borderRadius: 20, backgroundColor: '#1c1c1e' },
  retakeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  retakeBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Analyze button
  analyzeBtn: {
    backgroundColor: '#facc15',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 28,
  },
  analyzeBtnDisabled: { opacity: 0.7 },
  analyzeBtnText: { color: '#000', fontSize: 17, fontWeight: '700' },
  analyzingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  // Results
  sectionLabel: {
    color: '#8e8e93',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 14,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    gap: 12,
  },
  resultName: { color: '#fff', fontSize: 14, fontWeight: '500', width: 112 },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#3a3a3c',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 4 },
  resultScore: { fontSize: 15, fontWeight: '700', width: 36, textAlign: 'right' },

  rescanBtn: {
    marginTop: 20,
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  rescanBtnText: { color: '#8e8e93', fontSize: 16, fontWeight: '600' },
});
