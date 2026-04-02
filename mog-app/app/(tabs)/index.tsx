import FeatureCard from '@/components/FeatureCard';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { FEATURES } from '@/constants/features';
import { useAuth } from '@/context/auth';
import { useProfile } from '@/context/ProfileContext';
import { supabase } from '@/lib/supabase';
import { Feature } from '@/types';
import { bmiToScore } from '@/utils/scoring';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function overallScore(features: Feature[]): number {
  return features.reduce((acc, f) => acc + f.score, 0) / features.length;
}

function scoreLabel(score: number): string {
  if (score >= 8.5) return 'Elite';
  if (score >= 7.5) return 'High Tier';
  if (score >= 6.5) return 'Above Average';
  if (score >= 5.5) return 'Average';
  return 'Below Average';
}

function cmToFtIn(cm: number): { feet: string; inches: string } {
  const totalInches = cm / 2.54;
  return {
    feet: String(Math.floor(totalInches / 12)),
    inches: String(Math.round(totalInches % 12)),
  };
}

function ftInToCm(feet: string, inches: string): number {
  return (parseFloat(feet) || 0) * 30.48 + (parseFloat(inches) || 0) * 2.54;
}

function kgToLbs(kg: number): string {
  return String(Math.round(kg * 2.20462));
}

function lbsToKg(lbs: string): number {
  return (parseFloat(lbs) || 0) / 2.20462;
}

export default function StatsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, updateProfile } = useProfile();

  const [feet, setFeet] = useState('');
  const [inches, setInches] = useState('');
  const [weight, setWeight] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [latestScanScores, setLatestScanScores] = useState<Record<string, number> | null>(null);

  const heightCm = feet || inches ? ftInToCm(feet, inches) : 0;
  const weightKg = weight ? lbsToKg(weight) : 0;
  const computedBmi = heightCm > 0 && weightKg > 0 ? weightKg / Math.pow(heightCm / 100, 2) : 0;
  const bodyCompScore = computedBmi > 0 ? bmiToScore(computedBmi) : undefined;

  const displayFeatures = FEATURES.map(f => {
    if (f.id === 'body-composition' && bodyCompScore !== undefined)
      return { ...f, score: bodyCompScore };
    if (latestScanScores?.[f.id] !== undefined)
      return { ...f, score: latestScanScores[f.id] };
    return f;
  });
  const overall = overallScore(displayFeatures);

  useEffect(() => {
    if (user) {
      supabase
        .from('scans')
        .select('scores')
        .eq('user_id', user.id)
        .order('scanned_at', { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.scores) setLatestScanScores(data.scores as Record<string, number>);
        });
    }
  }, [user?.id]);

  useEffect(() => {
    if (profile) {
      if (profile.heightCm) {
        const { feet: f, inches: i } = cmToFtIn(profile.heightCm);
        setFeet(f);
        setInches(i);
      }
      if (profile.weightKg) setWeight(kgToLbs(profile.weightKg));
      if (profile.city) setCity(profile.city);
      if (profile.state) setState(profile.state);
    }
  }, [profile?.id]);

  const handleFeaturePress = (feature: Feature) => {
    router.push(`/feature/${feature.id}?score=${feature.score.toFixed(1)}`);
  };

  const handleDetectLocation = async () => {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Allow location access to auto-fill your city and state.');
        return;
      }
      const coords = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [place] = await Location.reverseGeocodeAsync({
        latitude: coords.coords.latitude,
        longitude: coords.coords.longitude,
      });
      const detectedCity = place?.city ?? place?.subregion ?? '';
      const detectedState = place?.region ?? '';
      if (detectedCity) setCity(detectedCity);
      if (detectedState) setState(detectedState);

      const err = await updateProfile({
        latitude: coords.coords.latitude,
        longitude: coords.coords.longitude,
        city: detectedCity || city,
        state: detectedState || state,
      });
      if (err) Alert.alert('Could not save location', err);
    } catch {
      Alert.alert('Error', 'Could not detect location. Enter it manually.');
    } finally {
      setLocating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const err = await updateProfile({
      heightCm: feet || inches ? ftInToCm(feet, inches) : null,
      weightKg: weight ? lbsToKg(weight) : null,
      city: city.trim() || null,
      state: state.trim() || null,
      latitude: profile?.latitude ?? null,
      longitude: profile?.longitude ?? null,
    });
    setSaving(false);
    if (err) {
      Alert.alert('Save failed', err);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>
            {user?.user_metadata?.full_name?.split(' ')[0] ?? 'Your'} Stats
          </Text>
          <Text style={styles.subtitle}>Tap any feature to start improving</Text>
        </View>

        {/* Overall score card */}
        <View style={styles.overallCard}>
          <Text style={styles.overallLabel}>Overall Rating</Text>
          <Text style={styles.overallScore}>{overall.toFixed(1)}</Text>
          <Text style={styles.overallTier}>{scoreLabel(overall)}</Text>
          <View style={styles.overallBarTrack}>
            <View style={[styles.overallBarFill, { width: `${(overall / 10) * 100}%` as any }]} />
          </View>
        </View>

        {/* Feature list */}
        <Text style={styles.sectionTitle}>Features</Text>
        {latestScanScores === null ? (
          <View style={styles.noScanCard}>
            <Text style={styles.noScanText}>Scan to see results</Text>
            <Text style={styles.noScanSub}>Upload a photo on the Scan tab to rate your traits</Text>
          </View>
        ) : (
          displayFeatures.map(feature => (
            <FeatureCard key={feature.id} feature={feature} onPress={handleFeaturePress} />
          ))
        )}

        {/* Body Stats */}
        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Body Stats</Text>
        <View style={styles.profileCard}>
          <Text style={styles.fieldLabel}>Height</Text>
          <View style={styles.row}>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={feet}
                onChangeText={setFeet}
                placeholder="ft"
                placeholderTextColor="#555"
                keyboardType="number-pad"
                maxLength={1}
              />
              <Text style={styles.inputUnit}>ft</Text>
            </View>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                value={inches}
                onChangeText={setInches}
                placeholder="in"
                placeholderTextColor="#555"
                keyboardType="number-pad"
                maxLength={2}
              />
              <Text style={styles.inputUnit}>in</Text>
            </View>
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Weight</Text>
          <View style={styles.row}>
            <View style={[styles.inputWrap, { flex: 1 }]}>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                placeholder="lbs"
                placeholderTextColor="#555"
                keyboardType="number-pad"
                maxLength={4}
              />
              <Text style={styles.inputUnit}>lbs</Text>
            </View>
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Location</Text>
          <View style={styles.row}>
            <View style={[styles.inputWrap, { flex: 2 }]}>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="City"
                placeholderTextColor="#555"
                autoCorrect={false}
              />
            </View>
            <View style={[styles.inputWrap, { flex: 1 }]}>
              <TextInput
                style={styles.input}
                value={state}
                onChangeText={setState}
                placeholder="State"
                placeholderTextColor="#555"
                autoCorrect={false}
                maxLength={2}
                autoCapitalize="characters"
              />
            </View>
            <TouchableOpacity
              style={styles.gpsButton}
              onPress={handleDetectLocation}
              disabled={locating}
            >
              {locating ? (
                <ActivityIndicator size="small" color="#facc15" />
              ) : (
                <IconSymbol name="pin.fill" size={20} color="#facc15" />
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.saveButtonText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scroll: {
    padding: 20,
    paddingBottom: 48,
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#8e8e93',
    fontSize: 14,
    marginTop: 4,
  },
  overallCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 28,
  },
  overallLabel: {
    color: '#8e8e93',
    fontSize: 13,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  overallScore: {
    color: '#fff',
    fontSize: 64,
    fontWeight: '800',
    lineHeight: 68,
  },
  overallTier: {
    color: '#facc15',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 16,
  },
  overallBarTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#3a3a3c',
    borderRadius: 4,
    overflow: 'hidden',
  },
  overallBarFill: {
    height: '100%',
    backgroundColor: '#facc15',
    borderRadius: 4,
  },
  noScanCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  noScanText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 6,
  },
  noScanSub: {
    color: '#8e8e93',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  sectionTitle: {
    color: '#8e8e93',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  profileCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
    padding: 20,
  },
  fieldLabel: {
    color: '#8e8e93',
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    padding: 0,
  },
  inputUnit: {
    color: '#555',
    fontSize: 14,
    fontWeight: '500',
  },
  gpsButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#2c2c2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    marginTop: 20,
    backgroundColor: '#facc15',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});
