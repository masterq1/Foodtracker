import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { saveMeal, getDateKey } from '../services/storage';
import { colors, spacing, fontSize, radius } from '../theme';

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

export default function ManualAddScreen({ navigation }) {
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [weight, setWeight] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [ingredients, setIngredients] = useState([]);
  const [saving, setSaving] = useState(false);

  const today = new Date();
  const [mealDate, setMealDate] = useState(getDateKey(today));
  const [mealTime, setMealTime] = useState(
    `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`
  );

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

    setSaving(true);
    try {
      const timestamp = new Date(`${mealDate}T${mealTime}:00`).toISOString();
      await saveMeal({
        foodName: foodName.trim(),
        totalCalories: parseInt(calories, 10) || 0,
        totalWeightGrams: parseInt(weight, 10) || 0,
        proteinGrams: parseInt(protein, 10) || 0,
        carbsGrams: parseInt(carbs, 10) || 0,
        fatGrams: parseInt(fat, 10) || 0,
        ingredients: ingredients.filter((i) => i.name.trim()),
        confidence: 'manual',
        notes: 'Manually entered',
        timestamp,
      });
      navigation.navigate('Home');
    } catch (err) {
      Alert.alert('Error', 'Failed to save meal: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  function updateIngredient(index, field, value) {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  }

  function removeIngredient(index) {
    setIngredients(ingredients.filter((_, i) => i !== index));
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Food name */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Food Name</Text>
          <TextInput
            style={styles.nameInput}
            value={foodName}
            onChangeText={setFoodName}
            placeholder="e.g. Grilled Chicken Salad"
            placeholderTextColor={colors.border}
            returnKeyType="done"
            autoFocus
          />
        </View>

        {/* Date & Time */}
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

        {/* Calories & Weight */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Serving</Text>
          <View style={styles.twoCol}>
            <NumericField label="Calories" value={calories} onChange={setCalories} unit="kcal" />
            <NumericField label="Weight" value={weight} onChange={setWeight} unit="g" />
          </View>
        </View>

        {/* Macros */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Macronutrients</Text>
          <View style={styles.threeCol}>
            <NumericField label="Protein" value={protein} onChange={setProtein} unit="g" accentColor="#1D4ED8" borderColor="#BFDBFE" />
            <NumericField label="Carbs" value={carbs} onChange={setCarbs} unit="g" accentColor="#C2410C" borderColor="#FED7AA" />
            <NumericField label="Fat" value={fat} onChange={setFat} unit="g" accentColor="#7E22CE" borderColor="#E9D5FF" />
          </View>
        </View>

        {/* Ingredients */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            <TouchableOpacity
              style={styles.addIngredientBtn}
              onPress={() => setIngredients([...ingredients, { name: '', amount: '' }])}
            >
              <Text style={styles.addIngredientText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          {ingredients.length === 0 && (
            <Text style={styles.emptyIngredients}>Optional — add individual ingredients</Text>
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
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? <ActivityIndicator color={colors.white} /> : <Text style={styles.saveBtnText}>Add Meal</Text>}
        </TouchableOpacity>

        <View style={{ height: spacing.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: spacing.xl },

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
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },

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
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
  },
  addIngredientText: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primaryDark },

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
});
