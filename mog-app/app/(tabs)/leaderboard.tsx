import { useAuth } from '@/context/auth';
import { useProfile } from '@/context/ProfileContext';
import { supabase } from '@/lib/supabase';
import { LeaderboardGroup, LeaderboardUser } from '@/types';
import { haversineDistance } from '@/utils/distance';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Placeholder data — replace with Supabase query once scores are stored
const NATIONAL_LEADERBOARD: LeaderboardUser[] = [
  { id: '1', name: 'Alex R.', avatarInitials: 'AR', overallScore: 8.9, rank: 1 },
  { id: '2', name: 'Marcus T.', avatarInitials: 'MT', overallScore: 8.4, rank: 2 },
  { id: '3', name: 'Jordan K.', avatarInitials: 'JK', overallScore: 8.1, rank: 3 },
  { id: '4', name: 'Liam V.', avatarInitials: 'LV', overallScore: 7.9, rank: 4 },
  { id: '5', name: 'Noah S.', avatarInitials: 'NS', overallScore: 7.6, rank: 5 },
  { id: '6', name: 'Ethan B.', avatarInitials: 'EB', overallScore: 7.4, rank: 6 },
  { id: '7', name: 'Ryan C.', avatarInitials: 'RC', overallScore: 7.1, rank: 7 },
  { id: '8', name: 'Tyler M.', avatarInitials: 'TM', overallScore: 6.8, rank: 8 },
  { id: '9', name: 'Caleb W.', avatarInitials: 'CW', overallScore: 6.5, rank: 9 },
  { id: '10', name: 'Dylan P.', avatarInitials: 'DP', overallScore: 6.2, rank: 10 },
];

type FilterType = 'national' | 'local' | 'group';

function rankBadgeColor(rank: number): string {
  if (rank === 1) return '#FFD700';
  if (rank === 2) return '#C0C0C0';
  if (rank === 3) return '#CD7F32';
  return '#3a3a3c';
}

function rankTextColor(rank: number): string {
  return rank <= 3 ? '#000' : '#8e8e93';
}

function initials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface LeaderboardListProps {
  data: LeaderboardUser[];
  currentUserId?: string;
}

function LeaderboardList({ data, currentUserId }: LeaderboardListProps) {
  if (data.length === 0) return null;
  const top3 = data.slice(0, 3);
  const rest = data.slice(3);

  return (
    <>
      <View style={styles.podium}>
        {top3.map(user => (
          <View key={user.id} style={[styles.podiumItem, user.rank === 1 && styles.podiumFirst]}>
            <View style={[styles.podiumAvatar, { borderColor: rankBadgeColor(user.rank) }]}>
              <Text style={styles.podiumInitials}>{user.avatarInitials}</Text>
            </View>
            <Text style={[styles.podiumRank, { color: rankBadgeColor(user.rank) }]}>
              #{user.rank}
            </Text>
            <Text style={styles.podiumName}>{user.name.split(' ')[0]}</Text>
            <Text style={[styles.podiumScore, { color: rankBadgeColor(user.rank) }]}>
              {user.overallScore.toFixed(1)}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Rankings</Text>
      {data.map(u => {
        const isMe = u.id === currentUserId;
        return (
          <View key={u.id} style={[styles.row, isMe && styles.rowHighlight]}>
            <View style={[styles.rankBadge, { backgroundColor: rankBadgeColor(u.rank) }]}>
              <Text style={[styles.rankText, { color: rankTextColor(u.rank) }]}>{u.rank}</Text>
            </View>
            <View style={[styles.avatar, isMe && styles.avatarHighlight]}>
              <Text style={styles.avatarInitials}>{u.avatarInitials}</Text>
            </View>
            <Text style={[styles.name, isMe && styles.nameHighlight]}>{u.name}</Text>
            {isMe && <Text style={styles.youBadge}>You</Text>}
            <Text style={[styles.score, isMe && { color: '#facc15' }]}>
              {u.overallScore > 0 ? u.overallScore.toFixed(1) : '—'}
            </Text>
          </View>
        );
      })}
    </>
  );
}

export default function LeaderboardScreen() {
  const { user } = useAuth();
  const { profile } = useProfile();

  const [activeFilter, setActiveFilter] = useState<FilterType>('national');
  const [userGroups, setUserGroups] = useState<LeaderboardGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<LeaderboardUser[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [userEntry, setUserEntry] = useState<LeaderboardUser | null>(null);

  const mergedNational = useMemo(() => {
    if (!userEntry) return NATIONAL_LEADERBOARD;
    const without = NATIONAL_LEADERBOARD.filter(u => u.id !== userEntry.id);
    return [...without, userEntry]
      .sort((a, b) => b.overallScore - a.overallScore)
      .map((u, i) => ({ ...u, rank: i + 1 }));
  }, [userEntry]);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'join' | 'invite'>('create');
  const [groupNameInput, setGroupNameInput] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [createdInviteCode, setCreatedInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadUserGroups();
    supabase
      .from('scans')
      .select('overall_score')
      .eq('user_id', user.id)
      .order('scanned_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const name = user.user_metadata?.full_name ?? 'You';
        setUserEntry({
          id: user.id,
          name,
          avatarInitials: initials(name),
          overallScore: data?.overall_score ?? 0,
          rank: 0,
        });
      });
  }, [user?.id]);

  useEffect(() => {
    if (selectedGroupId) loadGroupMembers(selectedGroupId);
  }, [selectedGroupId]);

  const loadUserGroups = async () => {
    if (!user) return;
    setLoadingGroups(true);
    try {
      const { data } = await supabase
        .from('group_members')
        .select('group_id, leaderboard_groups(id, name, invite_code, created_by)')
        .eq('user_id', user.id);

      if (data) {
        const groups: LeaderboardGroup[] = data
          .map((row: any) => row.leaderboard_groups)
          .filter(Boolean)
          .map((g: any) => ({
            id: g.id,
            name: g.name,
            inviteCode: g.invite_code,
            createdBy: g.created_by,
          }));
        setUserGroups(groups);
        if (groups.length > 0 && !selectedGroupId) {
          setSelectedGroupId(groups[0].id);
        }
      }
    } finally {
      setLoadingGroups(false);
    }
  };

  const loadGroupMembers = async (groupId: string) => {
    setLoadingMembers(true);
    try {
      const [{ data: membersData }, { data: scoreData }] = await Promise.all([
        supabase.from('group_members').select('user_id, joined_at').eq('group_id', groupId),
        supabase
          .from('scans')
          .select('overall_score')
          .eq('user_id', user!.id)
          .order('scanned_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (!membersData || membersData.length === 0) {
        setGroupMembers([]);
        return;
      }

      const myScore = scoreData?.overall_score ?? 0;

      const members: LeaderboardUser[] = membersData
        .map((row: any, i: number) => {
          const isMe = row.user_id === user?.id;
          const name = isMe ? (user?.user_metadata?.full_name ?? 'You') : `Member ${i + 1}`;
          return {
            id: row.user_id,
            name,
            avatarInitials: initials(name),
            overallScore: isMe ? myScore : 0,
            rank: 0,
          };
        })
        .sort((a: LeaderboardUser, b: LeaderboardUser) => b.overallScore - a.overallScore)
        .map((u: LeaderboardUser, i: number) => ({ ...u, rank: i + 1 }));

      setGroupMembers(members);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!user || !groupNameInput.trim()) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('leaderboard_groups')
        .insert({ name: groupNameInput.trim(), created_by: user.id })
        .select('id, invite_code')
        .single();

      if (error) throw error;

      await supabase.from('group_members').insert({ group_id: data.id, user_id: user.id });

      setCreatedInviteCode(data.invite_code);
      setGroupNameInput('');
      setModalMode('invite');
      await loadUserGroups();
      setSelectedGroupId(data.id);
    } catch {
      Alert.alert('Error', 'Could not create group. Try again.');
      setModalVisible(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!user || !inviteCodeInput.trim()) return;
    setSubmitting(true);
    try {
      const { data: group, error } = await supabase
        .from('leaderboard_groups')
        .select('id')
        .eq('invite_code', inviteCodeInput.trim().toUpperCase())
        .single();

      if (error || !group) {
        Alert.alert('Invalid code', 'No group found with that invite code.');
        return;
      }

      const { error: joinError } = await supabase
        .from('group_members')
        .insert({ group_id: group.id, user_id: user.id });

      if (joinError && joinError.code !== '23505') {
        Alert.alert('Error', 'Could not join group. Try again.');
        return;
      }

      setInviteCodeInput('');
      setModalVisible(false);
      await loadUserGroups();
      setSelectedGroupId(group.id);
    } finally {
      setSubmitting(false);
    }
  };

  const hasLocation = !!(profile?.latitude && profile?.longitude) || !!(profile?.city || profile?.state);
  const hasGPS = !!(profile?.latitude && profile?.longitude);

  const renderContent = () => {
    if (activeFilter === 'national') {
      return <LeaderboardList data={mergedNational} currentUserId={user?.id} />;
    }

    if (activeFilter === 'local') {
      if (!hasLocation) {
        return (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No location set</Text>
            <Text style={styles.emptySubtitle}>
              Go to My Stats and enter your location to see people near you.
            </Text>
          </View>
        );
      }

      const locationLabel = profile?.city
        ? `${profile.city}${profile.state ? `, ${profile.state}` : ''}`
        : 'your location';

      return (
        <>
          <View style={styles.localBanner}>
            <Text style={styles.localBannerText}>
              {hasGPS
                ? `Showing users within 100 miles of ${locationLabel}`
                : `Showing local rankings near ${locationLabel} · Use GPS pin for precise filtering`}
            </Text>
          </View>
          <LeaderboardList data={mergedNational} currentUserId={user?.id} />
        </>
      );
    }

    // Groups filter
    return (
      <>
        {/* Group selector bar */}
        {userGroups.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.groupBar}
            contentContainerStyle={styles.groupBarContent}
          >
            {userGroups.map(g => (
              <TouchableOpacity
                key={g.id}
                style={[styles.groupChip, selectedGroupId === g.id && styles.groupChipActive]}
                onPress={() => setSelectedGroupId(g.id)}
              >
                <Text
                  style={[styles.groupChipText, selectedGroupId === g.id && styles.groupChipTextActive]}
                >
                  {g.name}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.addGroupChip}
              onPress={() => { setModalMode('create'); setModalVisible(true); }}
            >
              <Text style={styles.addGroupChipText}>+ Group</Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {loadingGroups || loadingMembers ? (
          <ActivityIndicator color="#facc15" style={{ marginTop: 40 }} />
        ) : userGroups.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No groups yet</Text>
            <Text style={styles.emptySubtitle}>
              Create a group and share the invite code with friends.
            </Text>
            <View style={styles.emptyActions}>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() => { setModalMode('create'); setModalVisible(true); }}
              >
                <Text style={styles.emptyButtonText}>Create Group</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.emptyButton, styles.emptyButtonSecondary]}
                onPress={() => { setModalMode('join'); setModalVisible(true); }}
              >
                <Text style={[styles.emptyButtonText, styles.emptyButtonTextSecondary]}>
                  Join with Code
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : selectedGroupId && groupMembers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Just you so far</Text>
            <Text style={styles.emptySubtitle}>
              Share invite code{' '}
              <Text style={styles.inviteCodeInline}>
                {userGroups.find(g => g.id === selectedGroupId)?.inviteCode}
              </Text>{' '}
              to grow this group.
            </Text>
          </View>
        ) : (
          <LeaderboardList data={groupMembers} currentUserId={user?.id} />
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Leaderboard</Text>
          <Text style={styles.subtitle}>Top rated users this week</Text>
        </View>

        {/* Filter pills */}
        <View style={styles.filterBar}>
          {(['national', 'local', 'group'] as FilterType[]).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterPill, activeFilter === f && styles.filterPillActive]}
              onPress={() => setActiveFilter(f)}
            >
              <Text style={[styles.filterPillText, activeFilter === f && styles.filterPillTextActive]}>
                {f === 'national' ? 'National' : f === 'local' ? 'Local' : 'Groups'}
              </Text>
            </TouchableOpacity>
          ))}
          {activeFilter === 'group' && userGroups.length > 0 && (
            <TouchableOpacity
              style={styles.joinPill}
              onPress={() => { setModalMode('join'); setModalVisible(true); }}
            >
              <Text style={styles.joinPillText}>Join</Text>
            </TouchableOpacity>
          )}
        </View>

        {renderContent()}
      </ScrollView>

      {/* Create / Join / Invite Code Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {modalMode === 'invite' ? (
              <>
                <Text style={styles.modalTitle}>Group Created!</Text>
                <Text style={styles.modalSubtitle}>Share this code with friends to invite them.</Text>
                <View style={styles.inviteCodeBox}>
                  <Text style={styles.inviteCodeText}>{createdInviteCode}</Text>
                </View>
                <TouchableOpacity
                  style={styles.modalButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalButtonText}>Done</Text>
                </TouchableOpacity>
              </>
            ) : modalMode === 'create' ? (
              <>
                <Text style={styles.modalTitle}>Create Group</Text>
                <TextInput
                  style={styles.modalInput}
                  value={groupNameInput}
                  onChangeText={setGroupNameInput}
                  placeholder="Group name"
                  placeholderTextColor="#555"
                  autoFocus
                  maxLength={40}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonSecondary]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={[styles.modalButtonText, styles.modalButtonTextSecondary]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, !groupNameInput.trim() && styles.modalButtonDisabled]}
                    onPress={handleCreateGroup}
                    disabled={submitting || !groupNameInput.trim()}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <Text style={styles.modalButtonText}>Create</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Join Group</Text>
                <TextInput
                  style={styles.modalInput}
                  value={inviteCodeInput}
                  onChangeText={setInviteCodeInput}
                  placeholder="Enter invite code"
                  placeholderTextColor="#555"
                  autoCapitalize="characters"
                  autoFocus
                  maxLength={8}
                />
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonSecondary]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={[styles.modalButtonText, styles.modalButtonTextSecondary]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, !inviteCodeInput.trim() && styles.modalButtonDisabled]}
                    onPress={handleJoinGroup}
                    disabled={submitting || !inviteCodeInput.trim()}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#000" />
                    ) : (
                      <Text style={styles.modalButtonText}>Join</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  header: {
    marginBottom: 20,
  },
  title: {
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

  // Filter bar
  filterBar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1c1c1e',
  },
  filterPillActive: {
    backgroundColor: '#facc15',
  },
  filterPillText: {
    color: '#8e8e93',
    fontSize: 14,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#000',
  },
  joinPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2c2c2e',
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  joinPillText: {
    color: '#8e8e93',
    fontSize: 14,
    fontWeight: '600',
  },

  // Local banner
  localBanner: {
    backgroundColor: '#1c1c1e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  localBannerText: {
    color: '#8e8e93',
    fontSize: 13,
    textAlign: 'center',
  },

  // Group bar
  groupBar: {
    marginBottom: 20,
  },
  groupBarContent: {
    gap: 8,
    paddingRight: 4,
  },
  groupChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#1c1c1e',
  },
  groupChipActive: {
    backgroundColor: '#facc15',
  },
  groupChipText: {
    color: '#8e8e93',
    fontSize: 14,
    fontWeight: '600',
  },
  groupChipTextActive: {
    color: '#000',
  },
  addGroupChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#2c2c2e',
    borderWidth: 1,
    borderColor: '#3a3a3c',
  },
  addGroupChipText: {
    color: '#facc15',
    fontSize: 14,
    fontWeight: '600',
  },

  // Podium
  podium: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 12,
    marginBottom: 32,
  },
  podiumItem: {
    alignItems: 'center',
    flex: 1,
  },
  podiumFirst: {
    marginBottom: 12,
  },
  podiumAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1c1c1e',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  podiumInitials: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  podiumRank: {
    fontWeight: '700',
    fontSize: 13,
  },
  podiumName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  podiumScore: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },

  // List
  sectionTitle: {
    color: '#8e8e93',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  rowHighlight: {
    borderWidth: 1,
    borderColor: '#facc15',
    backgroundColor: '#1c1c1e',
  },
  avatarHighlight: {
    backgroundColor: '#3a3000',
  },
  nameHighlight: {
    color: '#facc15',
  },
  youBadge: {
    color: '#000',
    backgroundColor: '#facc15',
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: {
    fontSize: 13,
    fontWeight: '700',
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2c2c2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  name: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  score: {
    color: '#facc15',
    fontSize: 16,
    fontWeight: '700',
  },

  // Empty states
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#8e8e93',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  emptyButton: {
    backgroundColor: '#facc15',
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyButtonSecondary: {
    backgroundColor: '#1c1c1e',
  },
  emptyButtonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyButtonTextSecondary: {
    color: '#fff',
  },
  inviteCodeInline: {
    color: '#facc15',
    fontWeight: '700',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#1c1c1e',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    gap: 16,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: '#8e8e93',
    fontSize: 14,
    lineHeight: 20,
    marginTop: -8,
  },
  modalInput: {
    backgroundColor: '#2c2c2e',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    backgroundColor: '#facc15',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalButtonSecondary: {
    backgroundColor: '#2c2c2e',
  },
  modalButtonDisabled: {
    opacity: 0.4,
  },
  modalButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  modalButtonTextSecondary: {
    color: '#fff',
  },
  inviteCodeBox: {
    backgroundColor: '#2c2c2e',
    borderRadius: 14,
    paddingVertical: 20,
    alignItems: 'center',
  },
  inviteCodeText: {
    color: '#facc15',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 6,
  },
});
