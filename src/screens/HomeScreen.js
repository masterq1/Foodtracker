import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { getMealsForDate, getDateKey, getSettings } from '../services/storage';
import { colors, spacing, fontSize, radius } from '../theme';

function MacroRow({ protein = 0, carbs = 0, fat = 0, style }) {
  return (
    <View style={[macroStyles.row, style]}>
      <View style={[macroStyles.chip, macroStyles.proteinChip]}>
        <Text style={[macroStyles.chipLabel, { color: '#1D4ED8' }]}>P</Text>
        <Text style={[macroStyles.chipValue, { color: '#1D4ED8' }]}>{protein}g</Text>
      </View>
      <View style={[macroStyles.chip, macroStyles.carbChip]}>
        <Text style={[macroStyles.chipLabel, { color: '#C2410C' }]}>C</Text>
        <Text style={[macroStyles.chipValue, { color: '#C2410C' }]}>{carbs}g</Text>
      </View>
      <View style={[macroStyles.chip, macroStyles.fatChip]}>
        <Text style={[macroStyles.chipLabel, { color: '#7E22CE' }]}>F</Text>
        <Text style={[macroStyles.chipValue, { color: '#7E22CE' }]}>{fat}g</Text>
      </View>
    </View>
  );
}

const macroStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 3, borderRadius: radius.full },
  chipLabel: { fontSize: fontSize.xs, fontWeight: '800', marginRight: 2 },
  chipValue: { fontSize: fontSize.xs, fontWeight: '600' },
  proteinChip: { backgroundColor: '#EFF6FF' },
  carbChip: { backgroundColor: '#FFF7ED' },
  fatChip: { backgroundColor: '#FDF4FF' },
});

export default function HomeScreen({ navigation }) {
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [calorieGoal, setCalorieGoal] = useState(2000);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    const [todaysMeals, settings] = await Promise.all([
      getMealsForDate(getDateKey()),
      getSettings(),
    ]);
    setMeals(todaysMeals);
    setCalorieGoal(settings.dailyCalorieGoal || 2000);
  }

  async function handleAddFood() {
    const settings = await getSettings();
    if (!settings.apiKey) {
      Alert.alert(
        'API Key Required',
        'Please add your Google AI API key in Settings to enable food analysis.',
        [
          { text: 'Go to Settings', onPress: () => navigation.getParent()?.navigate('SettingsTab') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    Alert.alert('Add Meal', 'How would you like to add your food?', [
      { text: 'Take Photo', onPress: () => pickImage('camera') },
      { text: 'Choose from Gallery', onPress: () => pickImage('gallery') },
      { text: 'Add Manually', onPress: () => navigation.navigate('ManualAdd') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  async function pickImage(source) {
    try {
      let result;

      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Needed', 'Please allow camera access to photograph your meals.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.7,
          base64: true,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Needed', 'Please allow photo library access.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.7,
          base64: true,
        });
      }

      if (!result.canceled && result.assets?.[0]) {
        const { uri, base64 } = result.assets[0];
        if (!base64) {
          Alert.alert('Error', 'Could not read image data. Please try again.');
          return;
        }
        navigation.navigate('Analysis', { imageUri: uri, base64 });
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to open image picker: ' + err.message);
    }
  }

  function handleEditMeal(meal) {
    navigation.navigate('EditMeal', { meal, dateKey: getDateKey() });
  }

  const totalCalories = meals.reduce((sum, m) => sum + (m.totalCalories || 0), 0);
  const totalWeight = meals.reduce((sum, m) => sum + (m.totalWeightGrams || 0), 0);
  const totalProtein = meals.reduce((sum, m) => sum + (m.proteinGrams || 0), 0);
  const totalCarbs = meals.reduce((sum, m) => sum + (m.carbsGrams || 0), 0);
  const totalFat = meals.reduce((sum, m) => sum + (m.fatGrams || 0), 0);

  const progressRatio = Math.min(totalCalories / calorieGoal, 1);
  const remaining = calorieGoal - totalCalories;
  const isOver = remaining < 0;

  function formatTodayHeader() {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }

  function formatTime(isoString) {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.dateText}>{formatTodayHeader()}</Text>
          <Text style={styles.title}>Food Tracker</Text>
        </View>

        {/* Daily Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Today's Summary</Text>

          <View style={styles.calorieRow}>
            <View style={styles.calorieStat}>
              <Text style={styles.calorieNumber}>{totalCalories.toLocaleString()}</Text>
              <Text style={styles.calorieLabel}>consumed</Text>
            </View>
            <View style={styles.progressSection}>
              <View style={styles.progressBg}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progressRatio * 100}%`,
                      backgroundColor: isOver ? colors.error : colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.goalLabel}>Goal: {calorieGoal.toLocaleString()} cal</Text>
            </View>
            <View style={styles.calorieStat}>
              <Text style={[styles.calorieNumber, { color: isOver ? colors.error : colors.primary }]}>
                {Math.abs(remaining).toLocaleString()}
              </Text>
              <Text style={styles.calorieLabel}>{isOver ? 'over goal' : 'remaining'}</Text>
            </View>
          </View>

          {/* Macro totals */}
          <View style={styles.macroSummaryRow}>
            <View style={styles.macroSumItem}>
              <Text style={[styles.macroSumValue, { color: '#1D4ED8' }]}>{totalProtein}g</Text>
              <Text style={styles.macroSumLabel}>Protein</Text>
            </View>
            <View style={styles.macroSumDivider} />
            <View style={styles.macroSumItem}>
              <Text style={[styles.macroSumValue, { color: '#C2410C' }]}>{totalCarbs}g</Text>
              <Text style={styles.macroSumLabel}>Carbs</Text>
            </View>
            <View style={styles.macroSumDivider} />
            <View style={styles.macroSumItem}>
              <Text style={[styles.macroSumValue, { color: '#7E22CE' }]}>{totalFat}g</Text>
              <Text style={styles.macroSumLabel}>Fat</Text>
            </View>
            <View style={styles.macroSumDivider} />
            <View style={styles.macroSumItem}>
              <Text style={styles.macroSumValue}>{totalWeight.toLocaleString()}g</Text>
              <Text style={styles.macroSumLabel}>Weight</Text>
            </View>
          </View>
        </View>

        {/* Today's Meals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Meals</Text>

          {meals.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🍽️</Text>
              <Text style={styles.emptyText}>No meals logged yet</Text>
              <Text style={styles.emptyHint}>Tap the button below to photograph your food</Text>
            </View>
          ) : (
            meals.map((meal) => (
              <TouchableOpacity
                key={meal.id}
                style={styles.mealCard}
                onPress={() => handleEditMeal(meal)}
                activeOpacity={0.75}
              >
                {meal.imageUri ? (
                  <Image source={{ uri: meal.imageUri }} style={styles.mealThumb} resizeMode="cover" />
                ) : (
                  <View style={styles.mealColorBar} />
                )}
                <View style={styles.mealContent}>
                  <View style={styles.mealTop}>
                    <Text style={styles.mealName} numberOfLines={1}>{meal.foodName}</Text>
                    <Text style={styles.mealTime}>{formatTime(meal.timestamp)}</Text>
                  </View>
                  <MacroRow
                    protein={meal.proteinGrams}
                    carbs={meal.carbsGrams}
                    fat={meal.fatGrams}
                    style={{ marginTop: 5 }}
                  />
                  {meal.ingredients?.length > 0 && (
                    <Text style={styles.mealIngredients} numberOfLines={1}>
                      {meal.ingredients.map((i) => i.name).join(' · ')}
                    </Text>
                  )}
                </View>
                <View style={styles.mealRight}>
                  <Text style={styles.mealCalories}>{meal.totalCalories}</Text>
                  <Text style={styles.mealCalLabel}>cal</Text>
                  <Text style={styles.mealWeight}>{meal.totalWeightGrams}g</Text>
                  <Text style={styles.editHint}>tap to edit</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Add Food FAB */}
      <View style={styles.fabArea}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : (
          <TouchableOpacity style={styles.fab} onPress={handleAddFood} activeOpacity={0.85}>
            <Text style={styles.fabPlus}>+</Text>
            <Text style={styles.fabLabel}>Add Food Photo</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 110 },

  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  dateText: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: '500' },
  title: { fontSize: fontSize.xxxl, fontWeight: '800', color: colors.text, marginTop: 2 },

  summaryCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  summaryTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  calorieRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  calorieStat: { alignItems: 'center', minWidth: 75 },
  calorieNumber: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.text },
  calorieLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  progressSection: { flex: 1, paddingHorizontal: spacing.sm },
  progressBg: { height: 10, backgroundColor: colors.border, borderRadius: radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.full },
  goalLabel: { fontSize: fontSize.xs, color: colors.textSecondary, textAlign: 'center', marginTop: 4 },

  macroSummaryRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  macroSumItem: { flex: 1, alignItems: 'center' },
  macroSumValue: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  macroSumLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  macroSumDivider: { width: 1, backgroundColor: colors.border, marginVertical: 2 },

  section: { paddingHorizontal: spacing.md },
  sectionTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },

  emptyState: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
  },
  emptyIcon: { fontSize: 48, marginBottom: spacing.sm },
  emptyText: { fontSize: fontSize.lg, fontWeight: '600', color: colors.textSecondary },
  emptyHint: { fontSize: fontSize.md, color: colors.border, textAlign: 'center', marginTop: spacing.xs },

  mealCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  mealColorBar: { width: 4, backgroundColor: colors.primary },
  mealThumb: { width: 72, height: '100%', minHeight: 72 },
  mealContent: { flex: 1, padding: spacing.md },
  mealTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  mealName: { flex: 1, fontSize: fontSize.lg, fontWeight: '600', color: colors.text, marginRight: spacing.sm },
  mealTime: { fontSize: fontSize.sm, color: colors.textSecondary },
  mealIngredients: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 5 },
  mealRight: { alignItems: 'flex-end', justifyContent: 'center', paddingRight: spacing.md, minWidth: 64 },
  mealCalories: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.primary },
  mealCalLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  mealWeight: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  editHint: { fontSize: fontSize.xs, color: colors.border, marginTop: 4 },

  fabArea: { position: 'absolute', bottom: spacing.lg, left: spacing.lg, right: spacing.lg },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  fabPlus: { fontSize: 28, color: colors.white, fontWeight: '300', marginRight: spacing.sm, lineHeight: 32 },
  fabLabel: { fontSize: fontSize.lg, color: colors.white, fontWeight: '700' },
});
