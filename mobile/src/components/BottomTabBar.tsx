import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import type { MainTab } from '../types/social';
import { HeartIcon, MessageCircleIcon, UserIcon } from './Icons';

interface BottomTabBarProps {
  activeTab: MainTab;
  unreadCount: number;
  onSelectTab: (tab: MainTab) => void;
}

/**
 * Barra de navegação inferior fixa (altura >= 64dp):
 * Sempre exibe ícones SVG vetoriais limpos acompanhados de rótulo textual.
 */
export function BottomTabBar({
  activeTab,
  unreadCount,
  onSelectTab,
}: BottomTabBarProps) {
  const { palette, fs } = useTheme();

  const renderTab = (
    tab: MainTab,
    label: string,
    icon: React.ReactNode,
    badge?: number
  ) => {
    const active = activeTab === tab;
    return (
      <TouchableOpacity
        key={tab}
        onPress={() => onSelectTab(tab)}
        activeOpacity={0.8}
        accessibilityRole="tab"
        accessibilityState={{ selected: active }}
        accessibilityLabel={
          badge && badge > 0
            ? `${label}, ${badge} ${badge === 1 ? 'mensagem não lida' : 'mensagens não lidas'}`
            : label
        }
        style={[
          styles.tabItem,
          active && {
            backgroundColor: palette.primarySoft,
          },
        ]}
      >
        <View style={styles.iconWrap}>
          {icon}
          {badge && badge > 0 ? (
            <View style={[styles.badge, { backgroundColor: palette.primary }]}>
              <Text style={styles.badgeText}>{badge > 9 ? '9+' : String(badge)}</Text>
            </View>
          ) : null}
        </View>
        <Text
          style={[
            styles.tabLabel,
            {
              color: active ? palette.primaryText : palette.textSecondary,
              fontWeight: active ? '700' : '600',
              fontSize: fs(13),
            },
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
        },
      ]}
    >
      {renderTab(
        'discover',
        'Descobrir',
        <HeartIcon
          size={24}
          color={activeTab === 'discover' ? palette.primaryText : palette.textSecondary}
          filled={activeTab === 'discover'}
        />
      )}
      {renderTab(
        'conversations',
        'Conversas',
        <MessageCircleIcon
          size={24}
          color={activeTab === 'conversations' ? palette.primaryText : palette.textSecondary}
        />,
        unreadCount
      )}
      {renderTab(
        'profile',
        'Meu Perfil',
        <UserIcon
          size={24}
          color={activeTab === 'profile' ? palette.primaryText : palette.textSecondary}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1.5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
  },
  tabItem: {
    flex: 1,
    minHeight: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 4,
  },
  iconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -12,
    minWidth: 20,
    minHeight: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  tabLabel: {
    textAlign: 'center',
  },
});
