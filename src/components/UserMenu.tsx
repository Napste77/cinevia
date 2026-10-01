import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { useResponsive } from "../hooks/useResponsive";
import { colors, fonts, radii } from "../theme";

/**
 * Menú de usuario arriba a la derecha (en el TopBar). Sin sesión muestra un
 * botón "Entrar"; logueado muestra el nombre + avatar con un desplegable de
 * "Ver perfil" y "Cerrar sesión". En mobile se compacta a solo el avatar
 * para no comerse el ancho de la barra.
 */
export default function UserMenu() {
  const navigation = useNavigation<any>();
  const { user, isAuthenticated, logout } = useAuth();
  const { isDesktop } = useResponsive();
  const [open, setOpen] = useState(false);

  if (!isAuthenticated) {
    return (
      <Pressable style={styles.loginPill} onPress={() => navigation.navigate("Auth")} hitSlop={6}>
        <MaterialIcons name="person-outline" size={18} color={colors.onSurface} />
        <Text style={styles.loginText}>Entrar</Text>
      </Pressable>
    );
  }

  const displayName = user?.name || user?.email?.split("@")[0] || "Mi cuenta";
  const initial = (user?.name || user?.email || "?").trim().charAt(0).toUpperCase();

  const close = () => setOpen(false);
  const goProfile = () => {
    close();
    navigation.navigate("Profile");
  };
  const onLogout = async () => {
    close();
    try {
      await logout();
    } finally {
      navigation.navigate("Home");
    }
  };

  return (
    <View style={styles.wrap}>
      <Pressable style={styles.trigger} onPress={() => setOpen((v) => !v)} hitSlop={6}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        {isDesktop && (
          <>
            <Text style={styles.name} numberOfLines={1}>
              {displayName}
            </Text>
            <MaterialIcons
              name={open ? "arrow-drop-up" : "arrow-drop-down"}
              size={20}
              color={colors.onSurfaceVariant}
            />
          </>
        )}
      </Pressable>

      {open && (
        <>
          {/* Capa invisible a pantalla completa: un toque afuera cierra el menú. */}
          <Pressable style={styles.backdrop} onPress={close} />
          <View style={styles.menu}>
            <Pressable style={styles.menuItem} onPress={goProfile}>
              <MaterialIcons name="person" size={18} color={colors.onSurface} />
              <Text style={styles.menuText}>Ver perfil</Text>
            </Pressable>
            <View style={styles.divider} />
            <Pressable style={styles.menuItem} onPress={onLogout}>
              <MaterialIcons name="logout" size={18} color={colors.error} />
              <Text style={[styles.menuText, styles.menuTextDanger]}>Cerrar sesión</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // zIndex alto para que el desplegable quede por encima del contenido que
  // sigue debajo del TopBar (Hero, filas, etc.).
  wrap: { position: "relative", zIndex: 1000 },
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 4,
    paddingRight: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primaryContainer,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: colors.onPrimaryContainer, fontFamily: fonts.display, fontSize: 15 },
  name: { color: colors.onSurface, fontFamily: fonts.label, fontSize: 14, maxWidth: 160 },
  loginPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radii.full,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  loginText: { color: colors.onSurface, fontFamily: fonts.label, fontSize: 13 },
  backdrop: {
    position: "absolute",
    top: -2000,
    bottom: -2000,
    left: -2000,
    right: -2000,
    zIndex: 1,
  },
  menu: {
    position: "absolute",
    top: 46,
    right: 0,
    minWidth: 190,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingVertical: 6,
    zIndex: 2,
    // sombra (web + nativo)
    // @ts-ignore
    boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
    elevation: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuText: { color: colors.onSurface, fontFamily: fonts.label, fontSize: 14 },
  menuTextDanger: { color: colors.error },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginVertical: 4 },
});
