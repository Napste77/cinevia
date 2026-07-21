import React from "react";
import { View, StyleSheet } from "react-native";
import { useResponsive } from "../hooks/useResponsive";
import { colors } from "../theme";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import { RouteKey } from "./NavItems";

/**
 * Marco responsive de la app: sidebar fijo en desktop, barra inferior en
 * mobile. `active` es null en pantallas que no forman parte del tab bar
 * (ej. Detail), donde igual queremos mantener el sidebar visible en
 * desktop pero sin resaltar ningún item.
 */
export default function AppShell({
  active,
  onNavigate,
  children,
}: {
  active: RouteKey | null;
  onNavigate: (key: RouteKey) => void;
  children: React.ReactNode;
}) {
  const { isDesktop } = useResponsive();

  if (isDesktop) {
    return (
      <View style={styles.desktopRow}>
        <Sidebar active={active} onNavigate={onNavigate} />
        <View style={styles.desktopContent}>{children}</View>
      </View>
    );
  }

  return (
    <View style={styles.mobileColumn}>
      <View style={styles.mobileContent}>{children}</View>
      <BottomNav active={active} onNavigate={onNavigate} />
    </View>
  );
}

const styles = StyleSheet.create({
  desktopRow: { flex: 1, flexDirection: "row", backgroundColor: colors.surface },
  desktopContent: { flex: 1, minWidth: 0, minHeight: 0 },
  mobileColumn: { flex: 1, backgroundColor: colors.surface },
  mobileContent: { flex: 1, minHeight: 0 },
});
