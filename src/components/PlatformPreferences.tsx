import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import FilterChip from "./FilterChip";
import { getPlatforms } from "../api/nowsee";
import { getMyPlatforms, setMyPlatforms } from "../api/auth";
import { Platform } from "../types";
import { useRegion } from "../context/RegionContext";
import { colors, fonts } from "../theme";

/**
 * Selector de "mis plataformas". El usuario elige cuáles tiene y el Home
 * filtra sus filas de plataforma a solo esas (si no elige ninguna, se
 * muestran todas). Se guarda en la cuenta (sincroniza entre dispositivos).
 * Solo se usa con usuario logueado.
 */
export default function PlatformPreferences({ onChange }: { onChange?: (ids: number[]) => void }) {
  const { country } = useRegion();
  const [available, setAvailable] = useState<Platform[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([getPlatforms(country), getMyPlatforms()])
      .then(([platforms, mine]) => {
        if (cancelled) return;
        setAvailable(platforms);
        setSelected(mine);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [country]);

  const toggle = async (tmdbId: number) => {
    const next = selected.includes(tmdbId)
      ? selected.filter((id) => id !== tmdbId)
      : [...selected, tmdbId];
    setSelected(next); // optimista
    setSaving(true);
    try {
      const saved = await setMyPlatforms(next);
      setSelected(saved);
      onChange?.(saved);
    } catch {
      // revertir si falló la red
      setSelected(selected);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <ActivityIndicator color={colors.primary} style={{ marginTop: 12, alignSelf: "flex-start" }} />;
  }

  return (
    <View>
      <Text style={styles.hint}>
        Elegí las plataformas que tenés. El inicio va a mostrar solo el catálogo de esas.
        Sin ninguna seleccionada, se muestran todas.
      </Text>
      <View style={styles.chips}>
        {available.map((p) => (
          <FilterChip
            key={p.id}
            label={p.name}
            active={selected.includes(p.id)}
            onPress={() => toggle(p.id)}
          />
        ))}
      </View>
      {saving && <Text style={styles.saving}>Guardando…</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  hint: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.body,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  saving: { color: colors.onSurfaceVariant, fontFamily: fonts.body, fontSize: 12, marginTop: 10 },
});
