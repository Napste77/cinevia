import React, { useCallback, useMemo, useRef, useState } from "react";
import { View, Text, PanResponder, StyleSheet, Pressable } from "react-native";
import { colors, fonts, radii } from "../theme";

const HANDLE_SIZE = 22;

/**
 * Slider de rango (doble selector) para filtrar por año — reemplaza la
 * lista plana de chips "2024, 2023, 2022...". Pensado para touch (mobile)
 * y mouse (desktop/web): cada handle se arrastra con PanResponder sobre
 * una barra cuyo ancho real se mide con onLayout (no se puede asumir un
 * ancho fijo porque el filtro vive en pantallas responsive).
 *
 * `from`/`to` son inclusive. `min`/`max` acotan el rango disponible (por
 * default, desde 1950 hasta el año actual).
 */
export default function YearRangeSlider({
  min,
  max,
  from,
  to,
  onChange,
}: {
  min: number;
  max: number;
  from: number;
  to: number;
  onChange: (from: number, to: number) => void;
}) {
  const [trackWidth, setTrackWidth] = useState(0);
  const range = Math.max(1, max - min);

  // Valores "en vivo" durante el arrastre — se aplican a onChange recién
  // al soltar, para no disparar un fetch al backend en cada pixel movido.
  const [liveFrom, setLiveFrom] = useState(from);
  const [liveTo, setLiveTo] = useState(to);
  const liveFromRef = useRef(from);
  const liveToRef = useRef(to);
  liveFromRef.current = liveFrom;
  liveToRef.current = liveTo;

  React.useEffect(() => {
    setLiveFrom(from);
    setLiveTo(to);
  }, [from, to]);

  const yearAtX = useCallback(
    (x: number) => {
      if (trackWidth <= 0) return min;
      const ratio = Math.min(1, Math.max(0, x / trackWidth));
      return Math.round(min + ratio * range);
    },
    [trackWidth, min, range]
  );

  const xAtYear = useCallback(
    (year: number) => {
      if (range <= 0) return 0;
      const ratio = (year - min) / range;
      return ratio * trackWidth;
    },
    [trackWidth, min, range]
  );

  const makeResponder = (handle: "from" | "to") =>
    useMemo(
      () =>
        PanResponder.create({
          onStartShouldSetPanResponder: () => true,
          onMoveShouldSetPanResponder: () => true,
          onPanResponderMove: (_evt, gesture) => {
            const baseX = handle === "from" ? xAtYear(liveFromRef.current) : xAtYear(liveToRef.current);
            const nextYear = yearAtX(baseX + gesture.dx);
            if (handle === "from") {
              setLiveFrom(Math.min(nextYear, liveToRef.current));
            } else {
              setLiveTo(Math.max(nextYear, liveFromRef.current));
            }
          },
          onPanResponderRelease: () => {
            onChange(liveFromRef.current, liveToRef.current);
          },
          onPanResponderTerminate: () => {
            onChange(liveFromRef.current, liveToRef.current);
          },
        }),
      [handle, xAtYear, yearAtX, onChange]
    );

  const fromResponder = makeResponder("from");
  const toResponder = makeResponder("to");

  const fromX = xAtYear(liveFrom);
  const toX = xAtYear(liveTo);

  const decades = useMemo(() => {
    const startDecade = Math.floor(min / 10) * 10;
    const endDecade = Math.floor(max / 10) * 10;
    const opts: { label: string; from: number; to: number }[] = [];
    for (let d = endDecade; d >= startDecade; d -= 10) {
      opts.push({ label: `${d}s`, from: Math.max(min, d), to: Math.min(max, d + 9) });
    }
    return opts;
  }, [min, max]);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.rangeLabel}>
          {liveFrom === min && liveTo === max ? "Todos los años" : `${liveFrom} — ${liveTo}`}
        </Text>
        {(liveFrom !== min || liveTo !== max) && (
          <Pressable onPress={() => onChange(min, max)} hitSlop={8}>
            <Text style={styles.resetLabel}>Limpiar</Text>
          </Pressable>
        )}
      </View>

      <View
        style={styles.track}
        onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
      >
        <View style={styles.trackBg} />
        {trackWidth > 0 && (
          <View
            style={[
              styles.trackActive,
              { left: fromX, width: Math.max(0, toX - fromX) },
            ]}
          />
        )}
        {trackWidth > 0 && (
          <View
            {...fromResponder.panHandlers}
            style={[styles.handle, { left: fromX - HANDLE_SIZE / 2 }]}
          />
        )}
        {trackWidth > 0 && (
          <View
            {...toResponder.panHandlers}
            style={[styles.handle, { left: toX - HANDLE_SIZE / 2 }]}
          />
        )}
      </View>

      <View style={styles.decadeRow}>
        <Pressable
          style={[styles.decadeChip, liveFrom === min && liveTo === max && styles.decadeChipActive]}
          onPress={() => onChange(min, max)}
        >
          <Text style={[styles.decadeLabel, liveFrom === min && liveTo === max && styles.decadeLabelActive]}>
            Todos
          </Text>
        </Pressable>
        {decades.map((d) => {
          const active = liveFrom === d.from && liveTo === d.to;
          return (
            <Pressable
              key={d.label}
              style={[styles.decadeChip, active && styles.decadeChipActive]}
              onPress={() => onChange(d.from, d.to)}
            >
              <Text style={[styles.decadeLabel, active && styles.decadeLabelActive]}>{d.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 12 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  rangeLabel: { color: colors.onSurface, fontFamily: fonts.label, fontSize: 14 },
  resetLabel: { color: colors.primary, fontFamily: fonts.label, fontSize: 12 },
  track: {
    height: HANDLE_SIZE,
    justifyContent: "center",
  },
  trackBg: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  trackActive: {
    position: "absolute",
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
  },
  handle: {
    position: "absolute",
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: colors.primaryContainer,
    borderWidth: 2,
    borderColor: colors.surface,
    // @ts-ignore - sombra sutil para que el handle se note "levantado" sobre la barra (solo web/iOS la renderiza distinto a Android, es puramente cosmético)
    boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
    cursor: "grab" as any,
  },
  decadeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 16,
  },
  decadeChip: {
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  decadeChipActive: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  decadeLabel: { color: colors.onSurfaceVariant, fontFamily: fonts.label, fontSize: 12 },
  decadeLabelActive: { color: colors.onPrimaryContainer },
});
