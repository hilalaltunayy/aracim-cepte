import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

/**
 * The real Aracım Cepte brand mark (mirrors assets/brand/app-icon.svg), drawn
 * with react-native-svg so it scales crisply and follows the app palette-neutral
 * brand colours. Replaces the previous generic Ionicons car glyph on auth.
 */
export function BrandLogo({ size = 72 }: { size?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      accessibilityRole="image"
      accessibilityLabel="Aracım Cepte"
    >
      <Defs>
        <LinearGradient id="brandBg" x1="128" y1="96" x2="896" y2="928" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#2FAFEA" />
          <Stop offset="1" stopColor="#35D0C5" />
        </LinearGradient>
      </Defs>
      <Rect width="1024" height="1024" rx="224" fill="url(#brandBg)" />
      <Circle cx="512" cy="472" r="330" fill="#FFFFFF" fillOpacity={0.12} />
      <G>
        <Path
          d="M224 554c20-88 64-152 134-190l72-39c51-27 113-27 164 0l72 39c70 38 114 102 134 190l13 56H211l13-56Z"
          fill="#FFFFFF"
        />
        <Path d="m377 394 73-38c39-20 85-20 124 0l73 38 39 111H338l39-111Z" fill="#C8F2F4" />
        <Path d="M345 504h342" stroke="#8CDEE7" strokeWidth={22} strokeLinecap="round" />
        <Rect x="190" y="544" width="644" height="172" rx="86" fill="#F8FEFF" />
        <Path d="M225 610h95M704 610h95" stroke="#35D0C5" strokeWidth={28} strokeLinecap="round" />
        <Circle cx="338" cy="705" r="76" fill="#173042" />
        <Circle cx="338" cy="705" r="32" fill="#77D9E1" />
        <Circle cx="686" cy="705" r="76" fill="#173042" />
        <Circle cx="686" cy="705" r="32" fill="#77D9E1" />
      </G>
      <Path
        d="m699 278 49 49 96-109"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth={34}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
