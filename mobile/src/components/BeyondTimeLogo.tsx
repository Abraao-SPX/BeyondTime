import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Mask,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';

interface BeyondTimeLogoProps {
  showWordmark?: boolean;
  symbolSize?: number;
  wordmarkSize?: number;
}

/**
 * Símbolo oficial do infinito com coração do BeyondTime (idêntico à marca oficial),
 * com degradê preservado tanto no tema claro quanto no modo noturno.
 */
export function BeyondTimeSymbol({ size = 48 }: { size?: number }) {
  const height = Math.round(size * (520 / 960));
  return (
    <Svg width={size} height={height} viewBox="0 0 960 520" fill="none">
      <Defs>
        <LinearGradient
          id="btInfinityHeartGrad"
          x1="40"
          y1="440"
          x2="920"
          y2="80"
          gradientUnits="userSpaceOnUse"
        >
          <Stop offset="0%" stopColor="#5A081D" />
          <Stop offset="48%" stopColor="#B80D29" />
          <Stop offset="100%" stopColor="#F01432" />
        </LinearGradient>
        <Mask id="btCrossingGap">
          <Rect x="0" y="0" width="960" height="520" fill="#FFFFFF" />
          {/* Recorte limpo no cruzamento central onde a fita esquerda passa por cima */}
          <Path
            d="M 380 390 L 580 190"
            stroke="#000000"
            strokeWidth={102}
            strokeLinecap="round"
          />
          {/* Recortes limpos nas entradas superiores do coração */}
          <Circle cx="290" cy="65" r="28" fill="#000000" />
          <Circle cx="670" cy="65" r="28" fill="#000000" />
        </Mask>
      </Defs>

      {/* Fita direita (passa por trás no cruzamento inferior central) */}
      <Path
        d="M 480 175 C 455 75, 345 45, 305 115 C 275 170, 320 255, 480 355 C 620 445, 735 480, 835 420 C 935 360, 935 160, 835 95 C 765 50, 695 65, 665 95"
        stroke="url(#btInfinityHeartGrad)"
        strokeWidth={68}
        strokeLinecap="butt"
        strokeLinejoin="round"
        mask="url(#btCrossingGap)"
      />

      {/* Fita esquerda (passa pela frente no cruzamento inferior central) */}
      <Path
        d="M 295 95 C 265 65, 195 50, 125 95 C 25 160, 25 360, 125 420 C 225 480, 340 445, 480 355 C 640 255, 685 170, 655 115 C 615 45, 505 75, 480 175"
        stroke="url(#btInfinityHeartGrad)"
        strokeWidth={68}
        strokeLinecap="butt"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function BeyondTimeLogo({
  showWordmark = true,
  symbolSize = 48,
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
              color: palette.textPrimary,
            },
          ]}
        >
          Beyond<Text style={{ color: palette.primaryText }}>Time</Text>
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
