import { memo } from 'react';
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop, Use } from 'react-native-svg';

/**
 * Emblema completo de Evernight: traducción a JSX de
 * docs/design/identidad-evernight/emblema-completo.svg (fuente de verdad).
 * El SVG no usa filtros ni blur, así que se traduce sin aproximar nada.
 * Los ids de los gradientes son globales en react-native-svg: un solo emblema por pantalla.
 */
function EmblemaSinMemo({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 240 240" accessibilityLabel="Emblema de StickerCreator">
      <Defs>
        <RadialGradient id="ev-halo" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#C81E2B" stopOpacity="0.50" />
          <Stop offset="38%" stopColor="#8F111B" stopOpacity="0.26" />
          <Stop offset="70%" stopColor="#3A070A" stopOpacity="0.12" />
          <Stop offset="100%" stopColor="#070505" stopOpacity="0" />
        </RadialGradient>
        <LinearGradient id="ev-moon-shadow" x1="0%" y1="20%" x2="85%" y2="85%">
          <Stop offset="0%" stopColor="#630E15" />
          <Stop offset="40%" stopColor="#38060A" />
          <Stop offset="100%" stopColor="#1D0305" />
        </LinearGradient>
        <RadialGradient id="ev-moon-bright" cx="68%" cy="62%" r="58%">
          <Stop offset="0%" stopColor="#FF7878" />
          <Stop offset="30%" stopColor="#F22738" />
          <Stop offset="76%" stopColor="#C41424" />
          <Stop offset="100%" stopColor="#8C0D18" />
        </RadialGradient>
        <LinearGradient id="ev-silver-rose" x1="12%" y1="8%" x2="88%" y2="92%">
          <Stop offset="0%" stopColor="#FFF7F5" />
          <Stop offset="34%" stopColor="#F2DAD7" />
          <Stop offset="70%" stopColor="#D4B2B1" />
          <Stop offset="100%" stopColor="#AD8988" />
        </LinearGradient>
        <LinearGradient id="ev-star-core" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF" />
          <Stop offset="55%" stopColor="#F7E4E1" />
          <Stop offset="100%" stopColor="#CCA7A5" />
        </LinearGradient>
        <ClipPath id="ev-moon-clip">
          <Circle cx="120" cy="120" r="36" />
        </ClipPath>
        <G id="ev-small-star">
          <Path d="M 0.00,-7.20 C 0.50,-1.89 1.21,-0.78 4.60,0.00 C 1.21,0.78 0.50,1.89 0.00,7.20 C -0.50,1.89 -1.21,0.78 -4.60,0.00 C -1.21,-0.78 -0.50,-1.89 0.00,-7.20 Z" fill="url(#ev-silver-rose)" />
          <Path d="M 0.00,-5.76 L 0.55,0.00 L 0.00,5.76 L -0.55,0.00 Z M -3.68,0.00 L 0.00,-0.55 L 3.68,0.00 L 0.00,0.55 Z" fill="#FFF7F5" fillOpacity="0.80" />
        </G>
        <Path id="ev-micro-star" d="M 0.00,-3.40 C 0.38,-0.92 0.92,-0.38 3.40,0.00 C 0.92,0.38 0.38,0.92 0.00,3.40 C -0.38,0.92 -0.92,0.38 -3.40,0.00 C -0.92,-0.38 -0.38,-0.92 0.00,-3.40 Z" fill="#F5E4E2" />
      </Defs>
      <Circle cx="120" cy="120" r="114" fill="url(#ev-halo)" />
      <Circle cx="120" cy="120" r="102" fill="none" stroke="#6E1118" strokeWidth="0.8" strokeOpacity="0.38" />
      <Circle cx="120" cy="120" r="91" fill="none" stroke="#8C1620" strokeWidth="0.65" strokeOpacity="0.30" />
      <Circle cx="120" cy="120" r="78" fill="none" stroke="#5A0D13" strokeWidth="1.1" strokeOpacity="0.40" />
      <G stroke="#621016" strokeOpacity="0.34" fill="none" strokeWidth="1.05">
        <Rect x="64" y="64" width="112" height="112" />
        <Path d="M 103,64 A 17,17 0 0 1 137,64" />
        <Path d="M 103,176 A 17,17 0 0 0 137,176" />
        <Path d="M 64,103 A 17,17 0 0 1 64,137" />
        <Path d="M 176,103 A 17,17 0 0 0 176,137" />
      </G>
      <Circle cx="120" cy="120" r="67.5" fill="none" stroke="#E8CECC" strokeWidth="1.05" strokeDasharray="1.8 3.8" strokeLinecap="round" strokeOpacity="0.72" />
      <Circle cx="120" cy="120" r="54.5" fill="none" stroke="#C9A5A3" strokeWidth="0.65" strokeDasharray="1.2 4.4" strokeLinecap="round" strokeOpacity="0.34" />
      <G>
        <Circle cx="120" cy="120" r="40.5" fill="#B81420" fillOpacity="0.28" />
        <G clipPath="url(#ev-moon-clip)">
          <Circle cx="120" cy="120" r="36" fill="url(#ev-moon-shadow)" />
          <Path d="M 126.25,84.55 A 36.0,36.0 0 1 1 103.10,151.79 C 117.5,134.0 125.5,112.0 126.25,84.55 Z" fill="url(#ev-moon-bright)" />
          <Circle cx="137" cy="130" r="9" fill="#FF9696" fillOpacity="0.11" />
          <Circle cx="128" cy="143" r="5" fill="#8C0C16" fillOpacity="0.18" />
          <Circle cx="144" cy="112" r="4.2" fill="#8C0C16" fillOpacity="0.16" />
          <Path d="M 126.2,84.5 A 36,36 0 0 1 149,141" fill="none" stroke="#FFA8A8" strokeWidth="1.1" strokeOpacity="0.65" />
        </G>
        <Circle cx="120" cy="120" r="36" fill="none" stroke="#75121B" strokeWidth="0.8" />
      </G>
      <G fill="url(#ev-silver-rose)">
        <Path d="M 83.6,120 A 36.4,36.4 0 1 1 156.4,120 A 36.4,36.4 0 1 1 83.6,120 M 79.8,120 A 40.2,40.2 0 1 0 160.2,120 A 40.2,40.2 0 1 0 79.8,120 Z" fillRule="evenodd" />
        <Path d="M 135.55,86.65 C 120.20,65.00 85.20,67.20 58.43,81.53 C 82.80,73.60 108.50,76.80 124.78,81.09 Q 130.47,83.47 135.55,86.65 Z" />
        <Path d="M 107.55,84.84 C 90.50,81.80 71.50,94.50 59.63,108.27 C 72.50,98.00 88.80,89.20 100.35,85.97 Q 103.93,85.23 107.55,84.84 Z" />
        <Path d="M 86.65,104.45 C 65.00,119.80 67.20,154.80 81.53,181.57 C 73.60,157.20 76.80,131.50 81.09,115.22 Q 83.47,109.53 86.65,104.45 Z" />
        <Path d="M 84.84,132.45 C 81.80,149.50 94.50,168.50 108.27,180.37 C 98.00,167.50 89.20,151.20 85.97,139.65 Q 85.23,136.07 84.84,132.45 Z" />
        <Path d="M 104.45,153.35 C 119.80,175.00 154.80,172.80 181.57,158.47 C 157.20,166.40 131.50,163.20 115.22,158.91 Q 109.53,156.53 104.45,153.35 Z" />
        <Path d="M 132.45,155.16 C 149.50,158.20 168.50,145.50 180.37,131.73 C 167.50,142.00 151.20,150.80 139.65,154.03 Q 136.07,154.77 132.45,155.16 Z" />
        <Path d="M 153.35,135.55 C 175.00,120.20 172.80,85.20 158.47,58.43 C 166.40,82.80 163.20,108.50 158.91,124.78 Q 156.53,130.47 153.35,135.55 Z" />
        <Path d="M 155.16,107.55 C 158.20,90.50 145.50,71.50 131.73,59.63 C 142.00,72.50 150.80,88.80 154.03,100.35 Q 154.77,103.93 155.16,107.55 Z" />
      </G>
      <G>
        <Path d="M 120.00,22.50 C 121.04,35.67 122.52,38.21 130.20,40.00 C 122.52,41.79 121.04,44.33 120.00,57.50 C 118.96,44.33 117.48,41.79 109.80,40.00 C 117.48,38.21 118.96,35.67 120.00,22.50 Z" fill="url(#ev-star-core)" />
        <Path d="M 120.00,26.00 L 120.82,40.00 L 120.00,54.00 L 119.18,40.00 Z M 111.84,40.00 L 120.00,39.18 L 128.16,40.00 L 120.00,40.82 Z" fill="#FFFFFF" fillOpacity="0.88" />
      </G>
      <G>
        <Path d="M 120.00,182.50 C 121.04,195.67 122.52,198.21 130.20,200.00 C 122.52,201.79 121.04,204.33 120.00,217.50 C 118.96,204.33 117.48,201.79 109.80,200.00 C 117.48,198.21 118.96,195.67 120.00,182.50 Z" fill="url(#ev-star-core)" />
        <Path d="M 120.00,186.00 L 120.82,200.00 L 120.00,214.00 L 119.18,200.00 Z M 111.84,200.00 L 120.00,199.18 L 128.16,200.00 L 120.00,200.82 Z" fill="#FFFFFF" fillOpacity="0.88" />
      </G>
      <G>
        <Path d="M 40.00,109.80 C 41.79,117.48 44.33,118.96 57.50,120.00 C 44.33,121.04 41.79,122.52 40.00,130.20 C 38.21,122.52 35.67,121.04 22.50,120.00 C 35.67,118.96 38.21,117.48 40.00,109.80 Z" fill="url(#ev-star-core)" />
        <Path d="M 40.00,111.84 L 40.82,120.00 L 40.00,128.16 L 39.18,120.00 Z M 26.00,120.00 L 40.00,119.18 L 54.00,120.00 L 40.00,120.82 Z" fill="#FFFFFF" fillOpacity="0.88" />
      </G>
      <G>
        <Path d="M 200.00,109.80 C 201.79,117.48 204.33,118.96 217.50,120.00 C 204.33,121.04 201.79,122.52 200.00,130.20 C 198.21,122.52 195.67,121.04 182.50,120.00 C 195.67,118.96 198.21,117.48 200.00,109.80 Z" fill="url(#ev-star-core)" />
        <Path d="M 200.00,111.84 L 200.82,120.00 L 200.00,128.16 L 199.18,120.00 Z M 186.00,120.00 L 200.00,119.18 L 214.00,120.00 L 200.00,120.82 Z" fill="#FFFFFF" fillOpacity="0.88" />
      </G>
      <Use href="#ev-small-star" x="153.75" y="50.79" />
      <Use href="#ev-small-star" x="189.21" y="86.25" />
      <Use href="#ev-small-star" x="189.21" y="153.75" />
      <Use href="#ev-small-star" x="153.75" y="189.21" />
      <Use href="#ev-small-star" x="86.25" y="189.21" />
      <Use href="#ev-small-star" x="50.79" y="153.75" />
      <Use href="#ev-small-star" x="50.79" y="86.25" />
      <Use href="#ev-small-star" x="86.25" y="50.79" />
      <Use href="#ev-micro-star" x="167.73" y="72.27" />
      <Use href="#ev-micro-star" x="167.73" y="167.73" />
      <Use href="#ev-micro-star" x="72.27" y="167.73" />
      <Use href="#ev-micro-star" x="72.27" y="72.27" />
      <G fill="#F4DFDD" fillOpacity="0.72">
        <Circle cx="139.13" cy="30.01" r="1.0" />
        <Circle cx="181.71" cy="46.46" r="1.2" />
        <Circle cx="217.81" cy="99.21" r="1.4" />
        <Circle cx="209.27" cy="142.26" r="1.0" />
        <Circle cx="184.24" cy="191.34" r="1.2" />
        <Circle cx="137.36" cy="218.48" r="1.4" />
        <Circle cx="97.74" cy="209.27" r="1.0" />
        <Circle cx="48.66" cy="184.24" r="1.2" />
        <Circle cx="22.97" cy="144.19" r="1.4" />
        <Circle cx="30.73" cy="97.74" r="1.0" />
        <Circle cx="53.31" cy="50.94" r="1.2" />
        <Circle cx="95.81" cy="22.97" r="1.4" />
      </G>
    </Svg>
  );
}

export const Emblema = memo(EmblemaSinMemo);
