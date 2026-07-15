import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { NowSeeRating, MediaType } from "../types";
import { rateContent } from "../api/social";
import { useAuth } from "../context/AuthContext";
import { colors, fonts, radii } from "../theme";

const SCALE = Array.from({ length: 10 }, (_, i) => i + 1);

/**
 * Calificación propia de NowSee (1-10, una por usuario). Nunca reemplaza
 * el vote_average de TMDB — se muestra siempre por separado (ver
 * DetailScreen, que renderiza ambos con etiquetas distintas).
 */
export default function RatingWidget({
  mediaType,
  contentId,
  rating,
  onChange,
}: {
  mediaType: MediaType;
  contentId: number;
  rating: NowSeeRating;
  onChange: (next: NowSeeRating) => void;
}) {
  const { isAuthenticated } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const submit = async (value: number) => {
    if (!isAuthenticated || submitting) return;
    setSubmitting(true);
    try {
      const next = await rateContent(mediaType, contentId, value);
      onChange(next);
    } catch (e) {
      console.error("Error calificando", e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View>
      <View style={styles.summaryRow}>
        <MaterialLikeStar />
        <Text style={styles.summaryText}>
          {rating.count > 0 ? `${rating.average.toFixed(1)} · ${rating.count} voto${rating.count === 1 ? "" : "s"}` : "Sin calificaciones todavía"}
        </Text>
        <Text style={styles.brandTag}>NowSee</Text>
      </View>

      {isAuthenticated ? (
        <View style={styles.scaleRow}>
          {SCALE.map((value) => {
            const active = rating.myRating === value;
            return (
              <Pressable
                key={value}
                style={[styles.scaleButton, active && styles.scaleButtonActive]}
                onPress={() => submit(value)}
                disabled={submitting}
              >
                <Text style={[styles.scaleText, active && styles.scaleTextActive]}>{value}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Text style={styles.hint}>Iniciá sesión para calificar este título.</Text>
      )}
    </View>
  );
}

function MaterialLikeStar() {
  return <Text style={styles.star}>★</Text>;
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  star: { color: colors.primary, fontSize: 16 },
  summaryText: { color: colors.onSurface, fontFamily: fonts.label, fontSize: 14 },
  brandTag: {
    color: colors.onSurfaceVariant,
    fontFamily: fonts.body,
    fontSize: 11,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  scaleRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  scaleButton: {
    width: 32,
    height: 32,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: colors.surfaceContainer,
    justifyContent: "center",
    alignItems: "center",
  },
  scaleButtonActive: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  scaleText: { color: colors.onSurfaceVariant, fontFamily: fonts.label, fontSize: 13 },
  scaleTextActive: { color: colors.onPrimaryContainer },
  hint: { color: colors.onSurfaceVariant, fontFamily: fonts.body, fontSize: 13 },
});
