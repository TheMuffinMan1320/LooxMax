import { FEATURES } from '@/constants/features';
import { Module } from '@/types';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

function scoreColor(score: number): string {
  if (score >= 8) return '#4ade80';
  if (score >= 6) return '#facc15';
  return '#f87171';
}

function ModuleCard({ module }: { module: Module }) {
  return (
    <View style={styles.moduleCard}>
      <Text style={styles.moduleTitle}>{module.title}</Text>
      <Text style={styles.moduleBody}>{module.body}</Text>
    </View>
  );
}

export default function FeatureScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const feature = FEATURES.find(f => f.id === id);

  if (!feature) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFound}>Feature not found.</Text>
      </SafeAreaView>
    );
  }

  const color = scoreColor(feature.score);
  const fillPercent = (feature.score / 10) * 100;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Back button */}
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        {/* Score header */}
        <View style={styles.scoreCard}>
          <Text style={styles.featureName}>{feature.name}</Text>
          <Text style={[styles.scoreNumber, { color }]}>{feature.score.toFixed(1)}</Text>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${fillPercent}%` as any, backgroundColor: color }]} />
          </View>
          <Text style={styles.description}>{feature.description}</Text>
        </View>

        {/* Modules */}
        <Text style={styles.sectionTitle}>How to Improve</Text>
        {feature.modules.map(module => (
          <ModuleCard key={module.id} module={module} />
        ))}
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
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: 20,
  },
  backText: {
    color: '#8e8e93',
    fontSize: 16,
  },
  scoreCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
    padding: 24,
    marginBottom: 28,
  },
  featureName: {
    color: '#8e8e93',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  scoreNumber: {
    fontSize: 56,
    fontWeight: '800',
    lineHeight: 60,
    marginBottom: 14,
  },
  barTrack: {
    width: '100%',
    height: 8,
    backgroundColor: '#3a3a3c',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  description: {
    color: '#aeaeb2',
    fontSize: 15,
    lineHeight: 22,
  },
  sectionTitle: {
    color: '#8e8e93',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  moduleCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 14,
    padding: 18,
    marginBottom: 10,
  },
  moduleTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  moduleBody: {
    color: '#aeaeb2',
    fontSize: 14,
    lineHeight: 21,
  },
  notFound: {
    color: '#8e8e93',
    textAlign: 'center',
    marginTop: 40,
  },
});
