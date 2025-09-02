import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width } = Dimensions.get('window');
const guidelineBaseWidth = 375;

export const scale = (size: number) => (width / guidelineBaseWidth) * size;
export const moderateScale = (size: number, factor = 0.15) => size + (scale(size) - size) * factor;
export const font = (size: number) => {
  const s = moderateScale(size);
  return Platform.OS === 'android' ? Math.round(PixelRatio.roundToNearestPixel(s)) : s;
};