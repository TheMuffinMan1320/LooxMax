import { Feature } from '@/types';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface FeatureCardProps {
  feature: Feature;
  onPress: (feature: Feature) => void;
}

function scoreColor(score: number): string {
  if (score >= 8) return '#4ade80';
  if (score >= 6) return '#facc15';
  return '#f87171';
}

export default function FeatureCard({ feature, onPress }: FeatureCardProps) {
  const color = scoreColor(feature.score);
  const fillPercent = (feature.score / 10) * 100;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(feature)}
    >
      <View style={styles.left}>
        <IconSymbol name={feature.icon as any} size={22} color={color} />
        <Text style={styles.name}>{feature.name}</Text>
      </View>

      <View style={styles.right}>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${fillPercent}%` as any, backgroundColor: color }]} />
        </View>
        <Text style={[styles.score, { color }]}>{feature.score.toFixed(1)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1c1c1e',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  cardPressed: {
    opacity: 0.7,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  name: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  barTrack: {
    width: 80,
    height: 6,
    backgroundColor: '#3a3a3c',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  score: {
    fontSize: 15,
    fontWeight: '700',
    width: 28,
    textAlign: 'right',
  },
});
