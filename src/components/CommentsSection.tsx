import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { MediaType } from "../types";
import { Comment, listComments, postComment, editComment, deleteComment } from "../api/social";
import { useAuth } from "../context/AuthContext";
import { colors, fonts, radii } from "../theme";

/**
 * Comentarios por título (punto 5 del spec). Lectura pública; escribir,
 * editar y borrar requiere sesión (y solo sobre los comentarios propios).
 * Preparado para respuestas/likes/reportes a futuro (ver UserComment en
 * el schema del backend) sin necesitar cambios acá.
 */
export default function CommentsSection({ mediaType, contentId }: { mediaType: MediaType; contentId: number }) {
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listComments(mediaType, contentId)
      .then(({ items }) => {
        if (!cancelled) setComments(items);
      })
      .catch((e) => console.error("Error cargando comentarios", e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mediaType, contentId]);

  const submit = async () => {
    if (!draft.trim() || submitting) return;
    setSubmitting(true);
    try {
      const comment = await postComment(mediaType, contentId, draft.trim());
      setComments((prev) => [comment, ...prev]);
      setDraft("");
    } catch (e) {
      console.error("Error publicando comentario", e);
    } finally {
      setSubmitting(false);
    }
  };

  const saveEdit = async (commentId: number) => {
    if (!editDraft.trim()) return;
    try {
      const updated = await editComment(commentId, editDraft.trim());
      setComments((prev) => prev.map((c) => (c.id === commentId ? updated : c)));
      setEditingId(null);
    } catch (e) {
      console.error("Error editando comentario", e);
    }
  };

  const remove = async (commentId: number) => {
    try {
      await deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (e) {
      console.error("Error borrando comentario", e);
    }
  };

  return (
    <View>
      {isAuthenticated ? (
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Escribí un comentario..."
            placeholderTextColor={colors.onSurfaceVariant}
            value={draft}
            onChangeText={setDraft}
            multiline
          />
          <Pressable style={styles.submitButton} onPress={submit} disabled={submitting || !draft.trim()}>
            <MaterialIcons name="send" size={18} color={colors.onPrimaryContainer} />
          </Pressable>
        </View>
      ) : (
        <Text style={styles.hint}>Iniciá sesión para dejar tu comentario.</Text>
      )}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
      ) : comments.length === 0 ? (
        <Text style={styles.hint}>Todavía no hay comentarios. ¡Sé el primero!</Text>
      ) : (
        comments.map((c) => (
          <View key={c.id} style={styles.comment}>
            <View style={styles.commentHeader}>
              <Text style={styles.commentAuthor}>{c.user.name || "Usuario"}</Text>
              {user?.id === c.userId && (
                <View style={styles.commentActions}>
                  <Pressable
                    onPress={() => {
                      setEditingId(c.id);
                      setEditDraft(c.body);
                    }}
                    hitSlop={6}
                  >
                    <MaterialIcons name="edit" size={16} color={colors.onSurfaceVariant} />
                  </Pressable>
                  <Pressable onPress={() => remove(c.id)} hitSlop={6}>
                    <MaterialIcons name="delete-outline" size={16} color={colors.onSurfaceVariant} />
                  </Pressable>
                </View>
              )}
            </View>

            {editingId === c.id ? (
              <View style={styles.composer}>
                <TextInput
                  style={styles.input}
                  value={editDraft}
                  onChangeText={setEditDraft}
                  multiline
                  autoFocus
                />
                <Pressable style={styles.submitButton} onPress={() => saveEdit(c.id)}>
                  <MaterialIcons name="check" size={18} color={colors.onPrimaryContainer} />
                </Pressable>
              </View>
            ) : (
              <Text style={styles.commentBody}>{c.body}</Text>
            )}
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 10, marginBottom: 16 },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.onSurface,
    fontFamily: fonts.body,
    fontSize: 14,
    minHeight: 40,
    maxHeight: 100,
  },
  submitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryContainer,
    justifyContent: "center",
    alignItems: "center",
  },
  hint: { color: colors.onSurfaceVariant, fontFamily: fonts.body, fontSize: 13, marginBottom: 12 },
  comment: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  commentHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  commentAuthor: { color: colors.onSurface, fontFamily: fonts.label, fontSize: 13 },
  commentActions: { flexDirection: "row", gap: 12 },
  commentBody: { color: colors.onSurfaceVariant, fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
});
