import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';

interface BeyondTimeLogoProps {
  showWordmark?: boolean;
  symbolSize?: number;
  wordmarkSize?: number;
}

/**
 * Símbolo oficial do infinito do BeyondTime com degradê preservado
 * tanto no tema claro quanto no modo noturno (WCAG AAA > 15:1 no texto).
 */
export function BeyondTimeSymbol({ size = 44 }: { size?: number }) {
  const height = Math.round(size * 0.54);
  return (
    <Svg width={size} height={height} viewBox="0 0 100 54" fill="none">
      <Defs>
        <LinearGradient id="btGrad" x1="0" y1="27" x2="100" y2="27" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#6B1D2F" />
          <Stop offset="50%" stopColor="#A90025" />
          <Stop offset="100%" stopColor="#D64564" />
        </LinearGradient>
      </Defs>
      <Path
        d="M27 11C16.5 11 9 18 9 27C9 36 16.5 43 27 43C37.5 43 44.5 34.5 50 27C55.5 19.5 62.5 11 73 11C83.5 11 91 18 91 27C91 36 83.5 43 73 43C62.5 43 55.5 34.5 50 27C44.5 19.5 37.5 11 27 11Z"
        stroke="url(#btGrad)"
        strokeWidth={7.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BeyondTimeLogo({
  showWordmark = true,
  symbolSize = 44,
  wordmarkSize = 24,
}: BeyondTimeLogoProps) {
  const { palette } = useTheme();

  return (
    <View style={styles.row} accessible accessibilityLabel="BeyondTime">
      <BeyondTimeSymbol size={symbolSize} />
      {showWordmark && (
        <Text
          style={[
            styles.wordmark,
            {
              fontSize: wordmarkSize,
              color: palette.isDark ? '#FFFFFF' : palette.textPrimary,
            },
          ]}
        >
          Beyond<Text style={{ color: palette.primary }}>Time</Text>
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  wordmark: {
    fontWeight: '700',
    letterSpacing: -0.4,
  },
});
