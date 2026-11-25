import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { AccessibleButton } from '../components/AccessibleButton';
import { BeyondTimeLogo } from '../components/BeyondTimeLogo';
import {
  CheckIcon,
  CloseXIcon,
  HeartIcon,
  MapPinIcon,
  MessageCircleIcon,
  RefreshIcon,
  ShieldCheckIcon,
} from '../components/Icons';
import {
  getHobbyLabelById,
  rankProfilesByAffinity,
  SEED_DISCOVERY_PROFILES,
} from '../services/discoveryService';
import { useTheme } from '../theme/ThemeContext';
import type { RankedDiscoveryProfile } from '../types/social';

interface DiscoverScreenProps {
  userName?: string;
  userCity: string;
  userHobbies: string[];
  blockedProfileIds?: string[];
  onMutualConnection: (profile: RankedDiscoveryProfile, openChatNow: boolean) => void;
}

/**
 * Tela Descobrir — Conexões por Afinidade:
 * - Ordenação: 1) Mesma cidade, 2) Mesma região (Sergipe), 3) Mais hobbies em comum.
 * - Card com foto grande + gradiente escuro na base + bio + interesses em comum.
 * - Botões grandes e explícitos "Passar" e "Curtir" (>= 60dp), sem dependência de swipe.
 */
export function DiscoverScreen({
  userName = 'Você',
  userCity,
  userHobbies,
  blockedProfileIds,
  onMutualConnection,
}: DiscoverScreenProps) {
  const { palette, fs } = useTheme();

  const rankedProfiles = useMemo(() => {
    const list = rankProfilesByAffinity(SEED_DISCOVERY_PROFILES, userCity, userHobbies);
    if (!blockedProfileIds || blockedProfileIds.length === 0) return list;
    const blockedSet = new Set(blockedProfileIds);
    return list.filter((p) => !blockedSet.has(p.id));
  }, [userCity, userHobbies, blockedProfileIds]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageErrorMap, setImageErrorMap] = useState<Record<string, boolean>>({});
  const [matchedProfile, setMatchedProfile] = useState<RankedDiscoveryProfile | null>(null);

  useEffect(() => {
    setCurrentIndex((prev) => {
      if (rankedProfiles.length === 0) return 0;
      return prev >= rankedProfiles.length ? rankedProfiles.length - 1 : prev;
    });
  }, [rankedProfiles.length]);

  // Animação da tela de conexão: os dois perfis deslizam um em direção ao outro até se juntarem
  const leftAvatarX = useRef(new Animated.Value(-84)).current;
  const rightAvatarX = useRef(new Animated.Value(84)).current;
  const avatarsOpacity = useRef(new Animated.Value(0)).current;
  const centerHeartScale = useRef(new Animated.Value(0.3)).current;
  const centerHeartOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!matchedProfile) return;

    let active = true;
    const animateMeet = async () => {
      const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
      if (!active) return;

      if (reduceMotion) {
        leftAvatarX.setValue(10);
        rightAvatarX.setValue(-10);
        avatarsOpacity.setValue(1);
        centerHeartScale.setValue(1);
        centerHeartOpacity.setValue(1);
        return;
      }

      leftAvatarX.setValue(-84);
      rightAvatarX.setValue(84);
      avatarsOpacity.setValue(0.2);
      centerHeartScale.setValue(0.3);
      centerHeartOpacity.setValue(0);

      Animated.sequence([
        Animated.parallel([
          Animated.timing(avatarsOpacity, {
            toValue: 1,
            duration: 320,
            useNativeDriver: true,
          }),
          Animated.timing(leftAvatarX, {
            toValue: 10,
            duration: 720,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(rightAvatarX, {
            toValue: -10,
            duration: 720,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(centerHeartOpacity, {
            toValue: 1,
            duration: 260,
            useNativeDriver: true,
          }),
          Animated.spring(centerHeartScale, {
            toValue: 1,
            friction: 6,
            tension: 80,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    };

    void animateMeet();
    return () => {
      active = false;
    };
  }, [
    avatarsOpacity,
    centerHeartOpacity,
    centerHeartScale,
    leftAvatarX,
    matchedProfile,
    rightAvatarX,
  ]);

  const currentProfile = rankedProfiles[currentIndex] ?? null;

  const advanceCard = () => {
    setCurrentIndex((prev) => prev + 1);
  };

  const handlePass = () => {
    if (!currentProfile) return;
    advanceCard();
  };

  const handleLike = () => {
    if (!currentProfile) return;
    if (currentProfile.likesCurrentUser) {
      setMatchedProfile(currentProfile);
      onMutualConnection(currentProfile, false);
    } else {
      advanceCard();
    }
  };

  const handleRestartDeck = () => {
    setCurrentIndex(0);
  };

  const renderInitialsAvatar = (name: string, size: number) => {
    const initials = name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
    return (
      <View
        style={[
          styles.fallbackAvatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: palette.primarySoft,
            borderColor: palette.border,
          },
        ]}
      >
        <Text
          style={[
            styles.fallbackInitials,
            { color: palette.primaryText, fontSize: Math.round(size * 0.34) },
          ]}
        >
          {initials}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.background }]}>
      {/* Cabeçalho limpo */}
      <View
        style={[
          styles.topBar,
          { backgroundColor: palette.surface, borderBottomColor: palette.border },
        ]}
      >
        <BeyondTimeLogo symbolSize={36} wordmarkSize={20} />
        <View
          style={[
            styles.cityPill,
            { backgroundColor: palette.primarySoft, borderColor: palette.border },
          ]}
        >
          <MapPinIcon size={16} color={palette.primaryText} />
          <Text
            style={[
              styles.cityPillText,
              { color: palette.primaryText, fontSize: fs(14) },
            ]}
          >
            {(userCity || 'Aracaju, SE').split(',')[0]}
          </Text>
        </View>
      </View>

      {currentProfile ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Card Principal com Foto Grande */}
          <View
            style={[
              styles.profileCard,
              { backgroundColor: palette.surface, borderColor: palette.border },
            ]}
          >
            {/* Área da Foto + Gradiente Escuro na Base */}
            <View style={styles.photoContainer}>
              {!imageErrorMap[currentProfile.id] ? (
                <Image
                  source={{ uri: currentProfile.photoUrl }}
                  style={styles.photo}
                  resizeMode="cover"
                  onError={() =>
                    setImageErrorMap((prev) => ({ ...prev, [currentProfile.id]: true }))
                  }
                  accessibilityLabel={`Foto de perfil de ${currentProfile.fullName}, ${currentProfile.age} anos`}
                />
              ) : (
                <View
                  style={[
                    styles.photoFallbackBox,
                    { backgroundColor: palette.primarySoft },
                  ]}
                >
                  {renderInitialsAvatar(currentProfile.fullName, 110)}
                </View>
              )}

              {/* Gradiente escuro na base para contraste AAA do texto sobre foto */}
              <Svg
                width="100%"
                height={180}
                style={styles.photoGradient}
                pointerEvents="none"
              >
                <Defs>
                  <LinearGradient id="cardPhotoScrim" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor="#140A0E" stopOpacity="0" />
                    <Stop offset="45%" stopColor="#140A0E" stopOpacity="0.62" />
                    <Stop offset="100%" stopColor="#140A0E" stopOpacity="0.92" />
                  </LinearGradient>
                </Defs>
                <Rect x="0" y="0" width="100%" height="180" fill="url(#cardPhotoScrim)" />
              </Svg>

              {/* Selo de Perfil Verificado no topo esquerdo da foto */}
              {currentProfile.verified ? (
                <View
                  style={[
                    styles.verifiedPill,
                    { backgroundColor: palette.verifiedBg },
                  ]}
                >
                  <ShieldCheckIcon size={16} color={palette.verifiedText} />
                  <Text
                    style={[
                      styles.verifiedPillText,
                      { color: palette.verifiedText, fontSize: fs(13) },
                    ]}
                  >
                    Verificado
                  </Text>
                </View>
              ) : null}

              {/* Nome, idade, cidade e afinidade sobre o gradiente escuro */}
              <View style={styles.photoOverlayInfo}>
                <Text style={[styles.profileName, { fontSize: fs(26) }]}>
                  {currentProfile.fullName}, {currentProfile.age}
                </Text>

                <View style={styles.locationRow}>
                  <MapPinIcon size={17} color="#FFFFFF" />
                  <Text style={[styles.locationText, { fontSize: fs(15) }]}>
                    {currentProfile.locationLabel} • {currentProfile.compatibilityPercent}% em comum
                  </Text>
                </View>
              </View>
            </View>

            {/* Corpo do card: bio curta + interesses destacando gostos em comum */}
            <View style={styles.cardBody}>
              <Text
                style={[
                  styles.bioText,
                  { color: palette.textPrimary, fontSize: fs(16) },
                ]}
              >
                {currentProfile.bio}
              </Text>

              <View style={styles.hobbiesSection}>
                <Text
                  style={[
                    styles.hobbiesTitle,
                    { color: palette.textSecondary, fontSize: fs(15) },
                  ]}
                >
                  {currentProfile.sharedHobbyIds.length > 0
                    ? `${currentProfile.sharedHobbyIds.length} ${
                        currentProfile.sharedHobbyIds.length === 1
                          ? 'interesse em comum'
                          : 'interesses em comum'
                      }`
                    : 'Interesses deste perfil'}
                </Text>

                <View style={styles.chipsWrap}>
                  {currentProfile.hobbies.map((hobbyId) => {
                    const isShared = currentProfile.sharedHobbyIds.includes(hobbyId);
                    return (
                      <View
                        key={hobbyId}
                        style={[
                          styles.hobbyChip,
                          {
                            backgroundColor: isShared
                              ? palette.primarySoft
                              : palette.background,
                            borderColor: isShared ? palette.primary : palette.border,
                          },
                        ]}
                      >
                        {isShared ? (
                          <CheckIcon size={15} color={palette.primaryText} />
                        ) : null}
                        <Text
                          style={[
                            styles.hobbyChipText,
                            {
                              color: isShared
                                ? palette.primaryText
                                : palette.textPrimary,
                              fontWeight: isShared ? '700' : '600',
                              fontSize: fs(14),
                            },
                          ]}
                        >
                          {getHobbyLabelById(hobbyId)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          </View>

          {/* Dois botões grandes e explícitos (>= 60dp) na base */}
          <View style={styles.actionButtonsRow}>
            <AccessibleButton
              label="Passar"
              variant="outline"
              onPress={handlePass}
              iconLeft={<CloseXIcon size={22} color={palette.textPrimary} />}
              style={styles.actionBtn}
              accessibilityHint="Avança para a próxima pessoa"
            />
            <AccessibleButton
              label="Curtir"
              variant="primary"
              onPress={handleLike}
              iconLeft={<HeartIcon size={22} color={palette.textOnPrimary} filled />}
              style={styles.actionBtn}
              accessibilityHint="Demonstra interesse neste perfil"
            />
          </View>
        </ScrollView>
      ) : (
        <View style={styles.emptyState}>
          <View
            style={[
              styles.emptyIconCircle,
              { backgroundColor: palette.primarySoft, borderColor: palette.border },
            ]}
          >
            <HeartIcon size={34} color={palette.primaryText} />
          </View>
          <Text
            style={[
              styles.emptyTitle,
              { color: palette.textPrimary, fontSize: fs(22) },
            ]}
          >
            Você já viu todos os perfis por enquanto
          </Text>
          <Text
            style={[
              styles.emptyDesc,
              { color: palette.textSecondary, fontSize: fs(16) },
            ]}
          >
            Assim que novas pessoas da sua cidade chegarem, elas aparecerão aqui para você.
          </Text>
          <AccessibleButton
            label="Ver perfis novamente"
            variant="primary"
            onPress={handleRestartDeck}
            iconLeft={<RefreshIcon size={20} color={palette.textOnPrimary} />}
            style={styles.emptyBtn}
          />
        </View>
      )}

      {/* Modal gentil de Conexão Mútua */}
      <Modal
        visible={matchedProfile !== null}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setMatchedProfile(null);
          advanceCard();
        }}
      >
        <View style={[styles.modalOverlay, { backgroundColor: palette.overlay }]}>
          {matchedProfile ? (
            <View
              style={[
                styles.matchSheet,
                { backgroundColor: palette.surface, borderColor: palette.border },
              ]}
            >
              <View
                style={[
                  styles.matchHeartBadge,
                  { backgroundColor: palette.primarySoft },
                ]}
              >
                <HeartIcon size={30} color={palette.primaryText} filled />
              </View>

              <Text
                style={[
                  styles.matchTitle,
                  { color: palette.textPrimary, fontSize: fs(24) },
                ]}
              >
                Vocês se conectaram
              </Text>

              <Text
                style={[
                  styles.matchSubtitle,
                  { color: palette.textSecondary, fontSize: fs(16) },
                ]}
              >
                Você e {matchedProfile.fullName.split(' ')[0]} curtiram um ao outro e compartilham
                gostos parecidos.
              </Text>

              {/* Dois perfis deslizando um em direção ao outro até se encontrarem */}
              <View style={styles.matchMeetStage}>
                <Animated.View
                  style={[
                    styles.matchProfileItem,
                    {
                      opacity: avatarsOpacity,
                      transform: [{ translateX: leftAvatarX }],
                    },
                  ]}
                >
                  {renderInitialsAvatar(userName || 'Você', 92)}
                  <Text
                    style={[
                      styles.matchAvatarLabel,
                      { color: palette.textSecondary, fontSize: fs(13) },
                    ]}
                  >
                    Você
                  </Text>
                </Animated.View>

                <Animated.View
                  style={[
                    styles.matchCenterHeart,
                    {
                      backgroundColor: palette.primary,
                      borderColor: palette.surface,
                      opacity: centerHeartOpacity,
                      transform: [{ scale: centerHeartScale }],
                    },
                  ]}
                >
                  <HeartIcon size={20} color="#FFFFFF" filled />
                </Animated.View>

                <Animated.View
                  style={[
                    styles.matchProfileItem,
                    {
                      opacity: avatarsOpacity,
                      transform: [{ translateX: rightAvatarX }],
                    },
                  ]}
                >
                  {!imageErrorMap[matchedProfile.id] ? (
                    <Image
                      source={{ uri: matchedProfile.photoUrl }}
                      style={[styles.matchAvatar, { borderColor: palette.primary }]}
                      accessibilityLabel={`Foto de ${matchedProfile.fullName}`}
                    />
                  ) : (
                    renderInitialsAvatar(matchedProfile.fullName, 92)
                  )}
                  <Text
                    style={[
                      styles.matchAvatarLabel,
                      { color: palette.textSecondary, fontSize: fs(13) },
                    ]}
                  >
                    {matchedProfile.fullName.split(' ')[0]}
                  </Text>
                </Animated.View>
              </View>

              <View style={styles.matchActions}>
                <AccessibleButton
                  label="Enviar mensagem"
                  variant="primary"
                  onPress={() => {
                    const target = matchedProfile;
                    setMatchedProfile(null);
                    advanceCard();
                    onMutualConnection(target, true);
                  }}
                  iconLeft={<MessageCircleIcon size={20} color={palette.textOnPrimary} />}
                />
                <AccessibleButton
                  label="Continuar descobrindo"
                  variant="outline"
                  onPress={() => {
                    setMatchedProfile(null);
                    advanceCard();
                  }}
                />
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  cityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  cityPillText: {
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
    gap: 16,
  },
  profileCard: {
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  photoContainer: {
    width: '100%',
    height: 390,
    position: 'relative',
    backgroundColor: '#2A1A20',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoFallbackBox: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackAvatar: {
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackInitials: {
    fontWeight: '700',
  },
  photoGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  verifiedPill: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
  },
  verifiedPillText: {
    fontWeight: '700',
  },
  photoOverlayInfo: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 18,
    gap: 6,
  },
  profileName: {
    color: '#FFFFFF',
    fontWeight: '800',
    lineHeight: 32,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1,
  },
  cardBody: {
    padding: 18,
    gap: 14,
  },
  bioText: {
    lineHeight: 24,
  },
  hobbiesSection: {
    gap: 10,
  },
  hobbiesTitle: {
    fontWeight: '700',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hobbyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.2,
  },
  hobbyChipText: {},
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  emptyIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 30,
  },
  emptyDesc: {
    textAlign: 'center',
    lineHeight: 24,
  },
  emptyBtn: {
    width: '100%',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  matchSheet: {
    width: '100%',
    borderRadius: 24,
    borderWidth: 1.5,
    padding: 24,
    alignItems: 'center',
    gap: 14,
  },
  matchHeartBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchTitle: {
    fontWeight: '800',
    textAlign: 'center',
  },
  matchSubtitle: {
    textAlign: 'center',
    lineHeight: 24,
  },
  matchMeetStage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: 126,
    marginVertical: 6,
    position: 'relative',
  },
  matchProfileItem: {
    alignItems: 'center',
    gap: 6,
  },
  matchAvatarLabel: {
    fontWeight: '700',
  },
  matchCenterHeart: {
    position: 'absolute',
    top: 32,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  matchAvatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 3,
  },
  matchActions: {
    width: '100%',
    gap: 10,
    marginTop: 4,
  },
});
