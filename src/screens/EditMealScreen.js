import React, { useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { updateMeal, deleteMeal, moveMeal, getDateKey } from '../services/storage';
import { colors, spacing, fontSize, radius } from '../theme';

// ─── View mode components ────────────────────────────────────────────────────

function StatRow({ label, value, unit, accentColor }) {
  return (
    <View style={styles.statRow}>
      <Text style={[styles.statLabel, accentColor && { color: accentColor }]}>{label}</Text>
      <Text style={[styles.statValue, accentColor && { color: accentColor }]}>
        {value} <Text style={styles.statUnit}>{unit}</Text>
      </Text>
    </View>
  );
}

// ─── Edit mode components ─────────────────────────────────────────────────────

function NumericField({ label, value, onChange, unit, accentColor, borderColor }) {
  return (
    <View style={styles.numericField}>
      <Text style={[styles.fieldLabel, accentColor && { color: accentColor }]}>{label}</Text>
      <TextInput
        style={[styles.numericInput, borderColor && { borderColor }]}
        value={value}
        onChangeText={onChange}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={colors.border}
        selectTextOnFocus
      />
      <Text style={styles.unit}>{unit}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function EditMealScreen({ route, navigation }) {
  const { meal, dateKey } = route.params;
  const [editing, setEditing] = useState(false);

  const [foodName, setFoodName] = useState(meal.foodName || '');
  const [calories, setCalories] = useState(String(meal.totalCalories ?? 0));
  const [weight, setWeight] = useState(String(meal.totalWeightGrams ?? 0));
  const [protein, setProtein] = useState(String(meal.proteinGrams ?? 0));
  const [carbs, setCarbs] = useState(String(meal.carbsGrams ?? 0));
  const [fat, setFat] = useState(String(meal.fatGrams ?? 0));
  const [ingredients, setIngredients] = useState(meal.ingredients?.length ? meal.ingredients : []);
  const [saving, setSaving] = useState(false);

  const initialDate = meal.timestamp ? new Date(meal.timestamp) : new Date();
  const [mealDate, setMealDate] = useState(getDateKey(initialDate));
  const [mealTime, setMealTime] = useState(
    `${String(initialDate.getHours()).padStart(2, '0')}:${String(initialDate.getMinutes()).padStart(2, '0')}`
  );

  // Update header title and button based on mode
  useLayoutEffect(() => {
    navigation.setOptions({
      title: editing ? 'Edit Meal' : 'Meal Details',
      headerRight: () => (
        <TouchableOpacity
          onPress={() => setEditing((e) => !e)}
          style={styles.headerBtn}
        >
          <Text style={styles.headerBtnText}>{editing ? 'Cancel' : 'Edit'}</Text>
        </TouchableOpacity>
      ),
    });
  }, [editing, navigation]);

  async function handleSave() {
    if (!foodName.trim()) {
      Alert.alert('Required', 'Please enter a food name.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(mealDate)) {
      Alert.alert('Invalid Date', 'Date must be in YYYY-MM-DD format.');
      return;
    }
    if (!/^\d{2}:\d{2}$/.test(mealTime)) {
      Alert.alert('Invalid Time', 'Time must be in HH:MM format.');
      return;
    }
    const newTimestamp = new Date(`${mealDate}T${mealTime}:00`).toISOString();
    setSaving(true);
    try {
      const updatedMeal = {
        ...meal,
        foodName: foodName.trim(),
        totalCalories: parseInt(calories, 10) || 0,
        totalWeightGrams: parseInt(weight, 10) || 0,
        proteinGrams: parseInt(protein, 10) || 0,
        carbsGrams: parseInt(carbs, 10) || 0,
        fatGrams: parseInt(fat, 10) || 0,
        ingredients: ingredients.filter((i) => i.name.trim()),
        timestamp: newTimestamp,
      };
      if (mealDate !== dateKey) {
        await moveMeal(dateKey, mealDate, updatedMeal);
      } else {
        await updateMeal(dateKey, updatedMeal);
      }
      setEditing(false);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Failed to save changes: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete() {
    Alert.alert(
      'Delete Meal',
      `Permanently delete "${meal.foodName}"?`,
      [
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteMeal(dateKey, meal.id);
            navigation.goBack();
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  function updateIngredient(index, field, value) {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  }

  function removeIngredient(index) {
    setIngredients(ingredients.filter((_, i) => i !== index));
  }

  function addIngredient() {
    setIngredients([...ingredients, { name: '', amount: '' }]);
  }

  const displayDate = new Date(meal.timestamp || Date.now()).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const displayTime = new Date(meal.timestamp || Date.now()).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {!!meal.imageUri && (
          <Image source={{ uri: meal.imageUri }} style={styles.image} resizeMode="cover" />
        )}

        {editing ? (
          // ── EDIT MODE ──────────────────────────────────────────────────────
          <>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Food Name</Text>
              <TextInput
                style={styles.nameInput}
                value={foodName}
                onChangeText={setFoodName}
                placeholder="e.g. Grilled Chicken Salad"
                placeholderTextColor={colors.border}
                returnKeyType="done"
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Date & Time</Text>
              <View style={styles.twoCol}>
                <View style={styles.dateTimeField}>
                  <Text style={styles.fieldLabel}>Date</Text>
                  <TextInput
                    style={styles.dateTimeInput}
                    value={mealDate}
                    onChangeText={setMealDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.border}
                    keyboardType="numbers-and-punctuation"
                    maxLength={10}
                  />
                  <Text style={styles.unit}>YYYY-MM-DD</Text>
                </View>
                <View style={styles.dateTimeField}>
                  <Text style={styles.fieldLabel}>Time</Text>
                  <TextInput
                    style={styles.dateTimeInput}
                    value={mealTime}
                    onChangeText={setMealTime}
                    placeholder="HH:MM"
                    placeholderTextColor={colors.border}
                    keyboardType="numbers-and-punctuation"
                    maxLength={5}
                  />
                  <Text style={styles.unit}>HH:MM</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Serving</Text>
              <View style={styles.twoCol}>
                <NumericField label="Calories" value={calories} onChange={setCalories} unit="kcal" />
                <NumericField label="Weight" value={weight} onChange={setWeight} unit="g" />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Macronutrients</Text>
              <View style={styles.threeCol}>
                <NumericField label="Protein" value={protein} onChange={setProtein} unit="g" accentColor="#1D4ED8" borderColor="#BFDBFE" />
                <NumericField label="Carbs" value={carbs} onChange={setCarbs} unit="g" accentColor="#C2410C" borderColor="#FED7AA" />
                <NumericField label="Fat" value={fat} onChange={setFat} unit="g" accentColor="#7E22CE" borderColor="#E9D5FF" />
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              {ingredients.length === 0 && (
                <Text style={styles.emptyIngredients}>No ingredients listed</Text>
              )}
              {ingredients.map((ing, i) => (
                <View key={i} style={styles.ingredientRow}>
                  <TextInput
                    style={[styles.ingredientInput, { flex: 2 }]}
                    value={ing.name}
                    onChangeText={(v) => updateIngredient(i, 'name', v)}
                    placeholder="Ingredient"
                    placeholderTextColor={colors.border}
                    returnKeyType="next"
                  />
                  <TextInput
                    style={[styles.ingredientInput, { flex: 1 }]}
                    value={ing.amount}
                    onChangeText={(v) => updateIngredient(i, 'amount', v)}
                    placeholder="Amount"
                    placeholderTextColor={colors.border}
                    returnKeyType="done"
                  />
                  <TouchableOpacity
                    style={styles.removeIngredientBtn}
                    onPress={() => removeIngredient(i)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.removeIngredientIcon}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addIngredientBtn} onPress={addIngredient}>
                <Text style={styles.addIngredientText}>+ Add Ingredient</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
              <Text style={styles.deleteBtnText}>Delete Meal</Text>
            </TouchableOpacity>
          </>
        ) : (
          // ── VIEW MODE ──────────────────────────────────────────────────────
          <>
            <View style={styles.card}>
              <Text style={styles.viewFoodName}>{meal.foodName}</Text>
              <Text style={styles.viewDateTime}>{displayDate} · {displayTime}</Text>
              {meal.confidence && (
                <Text style={styles.viewConfidence}>Confidence: {meal.confidence}</Text>
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Nutrition</Text>
              <StatRow label="Calories" value={meal.totalCalories} unit="kcal" accentColor={colors.secondary} />
              <View style={styles.divider} />
              <StatRow label="Weight" value={meal.totalWeightGrams} unit="g" />
              <View style={styles.divider} />
              <StatRow label="Protein" value={meal.proteinGrams} unit="g" accentColor="#1D4ED8" />
              <View style={styles.divider} />
              <StatRow label="Carbs" value={meal.carbsGrams} unit="g" accentColor="#C2410C" />
              <View style={styles.divider} />
              <StatRow label="Fat" value={meal.fatGrams} unit="g" accentColor="#7E22CE" />
            </View>

            {ingredients.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>Ingredients</Text>
                {ingredients.map((ing, i) => (
                  <View key={i} style={styles.viewIngredientRow}>
                    <View style={styles.ingredientBullet} />
                    <Text style={styles.viewIngredientName}>{ing.name}</Text>
                    <Text style={styles.viewIngredientAmount}>{ing.amount}</Text>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
              <Text style={styles.deleteBtnText}>Delete Meal</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xl },
  image: { width: '100%', height: 200 },

  headerBtn: { marginRight: spacing.md },
  headerBtnText: { fontSize: fontSize.lg, color: colors.primary, fontWeight: '700' },

  card: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },

  // View mode
  viewFoodName: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text, marginBottom: spacing.xs },
  viewDateTime: { fontSize: fontSize.md, color: colors.textSecondary },
  viewConfidence: { fontSize: fontSize.sm, color: colors.border, marginTop: spacing.xs },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  statLabel: { fontSize: fontSize.md, fontWeight: '600', color: colors.textSecondary },
  statValue: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  statUnit: { fontSize: fontSize.sm, fontWeight: '400', color: colors.textSecondary },
  divider: { height: 1, backgroundColor: colors.border },
  viewIngredientRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.background },
  ingredientBullet: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary, marginRight: spacing.sm },
  viewIngredientName: { flex: 1, fontSize: fontSize.md, color: colors.text },
  viewIngredientAmount: { fontSize: fontSize.md, color: colors.textSecondary },

  // Edit mode
  nameInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.lg,
    color: colors.text,
    backgroundColor: colors.background,
  },
  twoCol: { flexDirection: 'row', gap: spacing.md },
  threeCol: { flexDirection: 'row', gap: spacing.sm },
  dateTimeField: { flex: 1, alignItems: 'center' },
  dateTimeInput: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    backgroundColor: colors.background,
  },
  numericField: { flex: 1, alignItems: 'center' },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textSecondary, marginBottom: spacing.xs },
  numericInput: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    backgroundColor: colors.background,
  },
  unit: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs },
  emptyIngredients: { fontSize: fontSize.md, color: colors.border, marginBottom: spacing.sm },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.sm },
  ingredientInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs + 2,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.background,
  },
  removeIngredientBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center',
  },
  removeIngredientIcon: { fontSize: fontSize.xs, color: colors.error, fontWeight: '700' },
  addIngredientBtn: {
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radius.md,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addIngredientText: { fontSize: fontSize.md, color: colors.primary, fontWeight: '600' },
  saveBtn: {
    marginHorizontal: spacing.md,
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: fontSize.lg, color: colors.white, fontWeight: '700' },
  deleteBtn: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.error,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  deleteBtnText: { fontSize: fontSize.lg, color: colors.error, fontWeight: '600' },
});
