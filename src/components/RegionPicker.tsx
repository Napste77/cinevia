import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal, FlatList } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { listCountries, Country } from "../api/geo";
import { colors, fonts, radii } from "../theme";

/**
 * Selector de región (punto 4 del spec): lista simple con click, en vez de
 * un <select> HTML — así se ve y se comporta igual en Web, Android e iOS,
 * sin lógica específica de navegador.
 */
export default function RegionPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);

  useEffect(() => {
    listCountries()
      .then(setCountries)
      .catch(() => {});
  }, []);

  const currentLabel = countries.find((c) => c.code === value)?.name || value;

  return (
    <>
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <MaterialIcons name="public" size={18} color={colors.onSurfaceVariant} />
        <Text style={styles.triggerText}>{currentLabel}</Text>
        <MaterialIcons name="expand-more" size={18} color={colors.onSurfaceVariant} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Región</Text>
            <FlatList
              data={countries}
              keyExtractor={(c) => c.code}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.option}
                  onPress={() => {
                    onChange(item.code);
                    setOpen(false);
                  }}
                >
                  <Text style={[styles.optionText, item.code === value && styles.optionTextActive]}>
                    {item.name}
                  </Text>
                  {item.code === value && (
                    <MaterialIcons name="check" size={18} color={colors.primary} />
                  )}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  triggerText: { color: colors.onSurface, fontFamily: fonts.label, fontSize: 13 },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surfaceContainer,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: "60%",
  },
  sheetTitle: {
    color: colors.onSurface,
    fontFamily: fonts.headline,
    fontSize: 16,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  optionText: { color: colors.onSurfaceVariant, fontFamily: fonts.body, fontSize: 15 },
  optionTextActive: { color: colors.onSurface, fontFamily: fonts.bodySemiBold },
});
