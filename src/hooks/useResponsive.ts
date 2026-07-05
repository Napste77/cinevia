import { useWindowDimensions } from "react-native";
import { breakpoints } from "../theme";

export function useResponsive() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= breakpoints.tablet;
  const isTablet = width >= breakpoints.mobile && width < breakpoints.tablet;
  const isMobile = width < breakpoints.mobile;

  return {
    width,
    isDesktop,
    isTablet,
    isMobile,
    columns: isDesktop ? 6 : isTablet ? 4 : 2,
  };
}
