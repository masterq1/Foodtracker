import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Alert,
  ActivityIndicator,
  Animated,
  TextInput,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { analyzeFoodImage, getUsageInfo, PRIMARY_MODEL_LABEL, FALLBACK_MODEL_LABEL, DAILY_LIMIT } from '../services/geminiApi';
import { saveMeal, getSettings } from '../services/storage';
import { colors, spacing, fontSize, radius } from '../theme';

async function persistImage(uri) {
  const mealsDir = FileSystem.documentDirectory + 'meals/';
  const dirInfo = await FileSystem.getInfoAsync(mealsDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(mealsDir, { intermediates: true });
  }
  const dest = mealsDir + `meal_${Date.now()}.jpg`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

function ConfidenceBadge({ confidence }) {
  const map = {
    high:   { bg: '#DCFCE7', text: '#166534', dot: '#16A34A' },
    medium: { bg: '#FEF3C7', text: '#92400E', dot: '#D97706' },
    low:    { bg: '#FEE2E2', text: '#991B1B', dot: '#DC2626' },
  };
  const c = map[confidence] || map.low;
  return (
    <View style={[styles.confidenceBadge, { backgroundColor: c.bg }]}>
      <View style={[styles.confidenceDot, { backgroundColor: c.dot }]} />
      <Text style={[styles.confidenceText, { color: c.text }]}>
        {confidence ? `${confidence} confidence` : 'unknown confidence'}
      </Text>
    </View>
  );
}

function EditableName({ value, confidence, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => { setDraft(value); }, [value]);

  function commit() {
    if (draft.trim()) onSave(draft.trim());
    else setDraft(value);
    setEditing(false);
  }

  return (
    <View style={styles.nameCard}>
      <Text style={styles.nameLabel}>Meal Name</Text>
      {editing ? (
        <TextInput
          style={styles.nameInput}
          value={draft}
          onChangeText={setDraft}
          autoFocus
          onBlur={commit}
          onSubmitEditing={commit}
          selectTextOnFocus
        />
      ) : (
        <Pressable onPress={() => setEditing(true)}>
          <Text style={styles.nameInputText}>{value}</Text>
          <Text style={styles.editTapInline}>tap to edit</Text>
        </Pressable>
      )}
      <ConfidenceBadge confidence={confidence} />
    </View>
  );
}

function EditableStatCard({ value, unit, label, emoji, accentColor, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  useEffect(() => { setDraft(String(value)); }, [value]);

  function commit() {
    const num = parseInt(draft, 10);
    if (!isNaN(num) && num >= 0) onSave(num);
    else setDraft(String(value));
    setEditing(false);
  }

  if (editing) {
    return (
      <View style={[styles.statCard, accentColor && { borderTopColor: accentColor }]}>
        <Text style={styles.statEmoji}>{emoji}</Text>
        <TextInput
          style={[styles.statInput, accentColor && { color: accentColor }]}
          value={draft}
          onChangeText={setDraft}
          keyboardType="number-pad"
          autoFocus
          onBlur={commit}
          onSubmitEditing={commit}
          selectTextOnFocus
        />
        <Text style={styles.statUnit}>{unit}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [
        styles.statCard,
        accentColor && { borderTopColor: accentColor },
        pressed && { opacity: 0.6 },
      ]}
      onPress={() => setEditing(true)}
    >
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={[styles.statNumber, accentColor && { color: accentColor }]}>
        {value.toLocaleString()}
      </Text>
      <Text style={styles.statUnit}>{unit}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.editTap}>tap to edit</Text>
    </Pressable>
  );
}

export default function AnalysisScreen({ route, navigation }) {
  const { imageUri, base64 } = route.params;
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [usageInfo, setUsageInfo] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadUsageAndAnalyze();
  }, []);

  useEffect(() => {
    if (analysis) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [analysis]);

  async function loadUsageAndAnalyze() {
    const info = await getUsageInfo();
    setUsageInfo(info);
    runAnalysis();
  }

  async function runAnalysis() {
    try {
      setLoading(true);
      setError(null);
      const settings = await getSettings();
      const result = await analyzeFoodImage(base64, settings.apiKey);
      // Refresh usage after analysis
      const info = await getUsageInfo();
      setUsageInfo(info);
      setAnalysis({
        ...result,
        ingredients: result.ingredients || [],
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function updateField(field, value) {
    setAnalysis((prev) => ({ ...prev, [field]: value }));
  }

  function updateIngredient(index, field, value) {
    setAnalysis((prev) => {
      const ingredients = [...prev.ingredients];
      ingredients[index] = { ...ingredients[index], [field]: value };
      return { ...prev, ingredients };
    });
  }

  function addIngredient() {
    setAnalysis((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { name: '', amount: '' }],
    }));
  }

  function removeIngredient(index) {
    setAnalysis((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  }

  async function handleSave() {
    if (!analysis) return;
    setSaving(true);
    try {
      const permanentUri = await persistImage(imageUri);
      const { _modelUsed, ...mealData } = analysis;
      await saveMeal({ ...mealData, imageUri: permanentUri });
      navigation.navigate('Home');
    } catch (err) {
      Alert.alert('Save Failed', 'Could not save meal: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  const modelLabel = analysis?._modelUsed
    ? (analysis._modelUsed.includes('2.5') ? PRIMARY_MODEL_LABEL : FALLBACK_MODEL_LABEL)
    : usageInfo?.model;

  const isPrimary = modelLabel === PRIMARY_MODEL_LABEL;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />

        {/* Model + usage badge */}
        {usageInfo && (
          <View style={styles.modelBar}>
            <View style={[styles.modelDot, { backgroundColor: isPrimary ? '#16A34A' : '#D97706' }]} />
            <Text style={styles.modelName}>{modelLabel}</Text>
            {isPrimary && (
              <Text style={styles.modelUsage}>
                · {usageInfo.remaining} of {DAILY_LIMIT} requests left today
              </Text>
            )}
            {!isPrimary && (
              <Text style={styles.modelUsage}>· fallback model (daily limit reached)</Text>
            )}
          </View>
        )}

        {/* Loading */}
        {loading && (
          <View style={styles.statusCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingTitle}>Analyzing your meal...</Text>
            <Text style={styles.loadingSubtext}>
              Gemini AI is identifying ingredients and estimating nutrition
            </Text>
          </View>
        )}

        {/* Error */}
        {error && !loading && (
          <View style={styles.errorCard}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Analysis Failed</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={runAnalysis}>
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Results */}
        {analysis && !loading && (
          <Animated.View style={{ opacity: fadeAnim }}>
            {/* Food name (tap to edit) */}
            <EditableName
              value={analysis.foodName}
              confidence={analysis.confidence}
              onSave={(v) => updateField('foodName', v)}
            />

            {/* Calories + Weight */}
            <View style={styles.statsRow}>
              <EditableStatCard
                value={analysis.totalCalories}
                unit="kcal"
                label="Calories"
                emoji="🔥"
                accentColor={colors.secondary}
                onSave={(v) => updateField('totalCalories', v)}
              />
              <EditableStatCard
                value={analysis.totalWeightGrams}
                unit="g"
                label="Weight"
                emoji="⚖️"
                accentColor={colors.primary}
                onSave={(v) => updateField('totalWeightGrams', v)}
              />
            </View>

            {/* Macros */}
            <View style={styles.macroRow}>
              <EditableStatCard
                value={analysis.proteinGrams}
                unit="g"
                label="Protein"
                emoji="💪"
                accentColor="#1D4ED8"
                onSave={(v) => updateField('proteinGrams', v)}
              />
              <EditableStatCard
                value={analysis.carbsGrams}
                unit="g"
                label="Carbs"
                emoji="🌾"
                accentColor="#C2410C"
                onSave={(v) => updateField('carbsGrams', v)}
              />
              <EditableStatCard
                value={analysis.fatGrams}
                unit="g"
                label="Fat"
                emoji="🥑"
                accentColor="#7E22CE"
                onSave={(v) => updateField('fatGrams', v)}
              />
            </View>

            {/* Ingredients */}
            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Ingredients</Text>
                <TouchableOpacity style={styles.addIngredientBtn} onPress={addIngredient}>
                  <Text style={styles.addIngredientText}>+ Add</Text>
                </TouchableOpacity>
              </View>
              {analysis.ingredients.map((item, i) => (
                <View key={i} style={styles.ingredientRow}>
                  <View style={styles.ingredientBullet} />
                  <TextInput
                    style={styles.ingredientNameInput}
                    value={item.name}
                    onChangeText={(v) => updateIngredient(i, 'name', v)}
                    placeholder="Ingredient"
                    placeholderTextColor={colors.border}
                  />
                  <TextInput
                    style={styles.ingredientAmountInput}
                    value={item.amount}
                    onChangeText={(v) => updateIngredient(i, 'amount', v)}
                    placeholder="Amount"
                    placeholderTextColor={colors.border}
                  />
                  <TouchableOpacity onPress={() => removeIngredient(i)} style={styles.removeBtn}>
                    <Text style={styles.removeBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Notes */}
            {!!analysis.notes && (
              <View style={styles.notesCard}>
                <Text style={styles.notesIcon}>💡</Text>
                <Text style={styles.notesText}>{analysis.notes}</Text>
              </View>
            )}
          </Animated.View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action bar */}
      {!loading && (
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.retakeButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retakeText}>← Retake</Text>
          </TouchableOpacity>
          {analysis && (
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.saveText}>Save Meal  ✓</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xl },

  image: { width: '100%', height: 240 },

  modelBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modelDot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.xs },
  modelName: { fontSize: fontSize.sm, fontWeight: '700', color: colors.text },
  modelUsage: { fontSize: fontSize.sm, color: colors.textSecondary, marginLeft: 2 },

  statusCard: {
    margin: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  loadingTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  loadingSubtext: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
  },

  errorCard: {
    margin: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
  },
  errorIcon: { fontSize: 40, marginBottom: spacing.sm },
  errorTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.error },
  errorText: { fontSize: fontSize.md, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
  retryBtn: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryBtnText: { color: colors.white, fontWeight: '700', fontSize: fontSize.md },

  nameCard: {
    margin: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  nameLabel: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', marginBottom: spacing.xs },
  nameInput: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.text,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.primary,
    paddingBottom: spacing.xs,
    marginBottom: spacing.sm,
  },
  nameInputText: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.text,
    paddingBottom: spacing.xs,
  },
  editTapInline: { fontSize: 10, color: colors.border, marginBottom: spacing.sm },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  confidenceDot: { width: 7, height: 7, borderRadius: 4, marginRight: 5 },
  confidenceText: { fontSize: fontSize.sm, fontWeight: '600' },

  statsRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  macroRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    borderTopWidth: 3,
    borderTopColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  statEmoji: { fontSize: 20, marginBottom: spacing.xs },
  statNumber: { fontSize: 28, fontWeight: '800', color: colors.text },
  statInput: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.border,
    textAlign: 'center',
    minWidth: 60,
    paddingBottom: 2,
  },
  statUnit: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 1 },
  statLabel: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: '600', marginTop: 2 },
  editTap: { fontSize: 9, color: colors.border, marginTop: 3 },

  card: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  cardTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  addIngredientBtn: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  addIngredientText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primaryDark },

  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
    gap: spacing.xs,
  },
  ingredientBullet: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary, flexShrink: 0 },
  ingredientNameInput: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 2,
  },
  ingredientAmountInput: {
    width: 80,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 2,
    textAlign: 'right',
  },
  removeBtn: { padding: 4 },
  removeBtnText: { fontSize: fontSize.sm, color: colors.error, fontWeight: '700' },

  notesCard: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  notesIcon: { fontSize: 18, marginRight: spacing.sm, marginTop: 1 },
  notesText: { flex: 1, fontSize: fontSize.md, color: colors.primaryDark, lineHeight: 20 },

  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  retakeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  retakeText: { fontSize: fontSize.lg, color: colors.text, fontWeight: '600' },
  saveButton: {
    flex: 2,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveText: { fontSize: fontSize.lg, color: colors.white, fontWeight: '700' },
});
