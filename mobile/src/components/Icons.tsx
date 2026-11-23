import React from 'react';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';

interface IconProps {
  size?: number;
  color?: string;
}

export function ChevronLeftIcon({ size = 22, color = '#2A1A20' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18L9 12L15 6"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ArrowRightIcon({ size = 20, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12H19M13 6L19 12L13 18"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function EyeOpenIcon({ size = 22, color = '#5E4850' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2 12C3.8 7.6 7.5 5 12 5C16.5 5 20.2 7.6 22 12C20.2 16.4 16.5 19 12 19C7.5 19 3.8 16.4 2 12Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={2} />
    </Svg>
  );
}

export function EyeClosedIcon({ size = 22, color = '#5E4850' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 3L21 21"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M10.6 5.2C11.1 5.1 11.5 5 12 5C16.5 5 20.2 7.6 22 12C21.2 13.9 20 15.5 18.4 16.7M6.3 6.9C4.4 8.2 3 9.9 2 12C3.8 16.4 7.5 19 12 19C13.6 19 15.1 18.7 16.5 18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CameraIcon({ size = 24, color = '#8B263E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={3}
        y={6}
        width={18}
        height={14}
        rx={3}
        stroke={color}
        strokeWidth={2}
      />
      <Circle cx={12} cy={13} r={3.5} stroke={color} strokeWidth={2} />
      <Path
        d="M8.5 6L10 3.5H14L15.5 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CheckIcon({ size = 18, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 13L9.5 17.5L19 7"
        stroke={color}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ShieldCheckIcon({ size = 22, color = '#1F633B' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 3L4 6.5V11.8C4 16.6 7.4 20.8 12 22C16.6 20.8 20 16.6 20 11.8V6.5L12 3Z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8.8 12.2L11 14.4L15.5 9.8"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SunIcon({ size = 20, color = '#FAF5F6' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={4.2} stroke={color} strokeWidth={2} />
      <Line x1={12} y1={2.5} x2={12} y2={5} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={12} y1={19} x2={12} y2={21.5} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={2.5} y1={12} x2={5} y2={12} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={19} y1={12} x2={21.5} y2={12} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={5.3} y1={5.3} x2={7.1} y2={7.1} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={16.9} y1={16.9} x2={18.7} y2={18.7} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={16.9} y1={7.1} x2={18.7} y2={5.3} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Line x1={5.3} y1={18.7} x2={7.1} y2={16.9} stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function MoonIcon({ size = 20, color = '#2A1A20' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 14.5A8 8 0 019.5 4a8.2 8.2 0 1010.5 10.5z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function MailIcon({ size = 20, color = '#8B263E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={5} width={18} height={14} rx={2.5} stroke={color} strokeWidth={2} />
      <Path
        d="M4 7L12 13L20 7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function UserPlusIcon({ size = 20, color = '#FFFFFF' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={9.5} cy={8} r={3.5} stroke={color} strokeWidth={2} />
      <Path
        d="M3 19.5C3.6 16.4 6.2 14.5 9.5 14.5C12.8 14.5 15.4 16.4 16 19.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M19 8V14M16 11H22"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function LogInIcon({ size = 20, color = '#8B263E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M14 4H18.5C19.6 4 20.5 4.9 20.5 6V18C20.5 19.1 19.6 20 18.5 20H14"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M10 16L14 12L10 8M14 12H3.5"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function RefreshIcon({ size = 20, color = '#8B263E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M20 12A8 8 0 1117.6 6.3L20 8.5M20 4V8.5H15.5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function LockIcon({ size = 20, color = '#8B263E' }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={11} width={14} height={9.5} rx={2.5} stroke={color} strokeWidth={2} />
      <Path
        d="M8.5 11V7.8C8.5 5.7 10.1 4 12 4C13.9 4 15.5 5.7 15.5 7.8V11"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function GoogleIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M21.8 12.23c0-.72-.06-1.41-.18-2.08H12v3.94h5.49a4.7 4.7 0 01-2.04 3.08v2.56h3.3c1.93-1.78 3.05-4.4 3.05-7.5z"
        fill="#4285F4"
      />
      <Path
        d="M12 22c2.75 0 5.06-.91 6.75-2.47l-3.3-2.56c-.91.61-2.08.98-3.45.98-2.65 0-4.9-1.79-5.7-4.2H2.89v2.64A10 10 0 0012 22z"
        fill="#34A853"
      />
      <Path
        d="M6.3 13.75A6.01 6.01 0 015.98 12c0-.61.11-1.2.32-1.75V7.61H2.89A10 10 0 002 12c0 1.61.39 3.14 1.07 4.39l3.23-2.64z"
        fill="#FBBC05"
      />
      <Path
        d="M12 6.05c1.5 0 2.84.51 3.9 1.52l2.92-2.92C17.05 2.99 14.74 2 12 2A10 10 0 002.89 7.61l3.41 2.64c.8-2.41 3.05-4.2 5.7-4.2z"
        fill="#EA4335"
      />
    </Svg>
  );
}

export function FacebookIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} fill="#1877F2" />
      <Path
        d="M15.4 12.8l.4-2.6h-2.5V8.5c0-.72.35-1.42 1.48-1.42h1.15V4.86S14.88 4.68 13.88 4.68c-2.08 0-3.44 1.26-3.44 3.55v1.97H8.13v2.6h2.31V19.1a9.2 9.2 0 002.86 0v-6.3h2.1z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}
