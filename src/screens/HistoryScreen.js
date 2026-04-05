import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getHistoryDates, getMealsForDate } from '../services/storage';
import { colors, spacing, fontSize, radius } from '../theme';

function MacroRow({ protein = 0, carbs = 0, fat = 0 }) {
  return (
    <View style={macroStyles.row}>
      <View style={[macroStyles.chip, macroStyles.proteinChip]}>
        <Text style={[macroStyles.label, { color: '#1D4ED8' }]}>P</Text>
        <Text style={[macroStyles.value, { color: '#1D4ED8' }]}>{protein}g</Text>
      </View>
      <View style={[macroStyles.chip, macroStyles.carbChip]}>
        <Text style={[macroStyles.label, { color: '#C2410C' }]}>C</Text>
        <Text style={[macroStyles.value, { color: '#C2410C' }]}>{carbs}g</Text>
      </View>
      <View style={[macroStyles.chip, macroStyles.fatChip]}>
        <Text style={[macroStyles.label, { color: '#7E22CE' }]}>F</Text>
        <Text style={[macroStyles.value, { color: '#7E22CE' }]}>{fat}g</Text>
      </View>
    </View>
  );
}

const macroStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.xs, marginTop: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.full },
  label: { fontSize: fontSize.xs, fontWeight: '800', marginRight: 2 },
  value: { fontSize: fontSize.xs, fontWeight: '600' },
  proteinChip: { backgroundColor: '#EFF6FF' },
  carbChip: { backgroundColor: '#FFF7ED' },
  fatChip: { backgroundColor: '#FDF4FF' },
});

function CalorieBar({ calories, goal = 2000 }) {
  const ratio = Math.min(calories / goal, 1);
  const isOver = calories > goal;
  return (
    <View style={{ marginTop: 5 }}>
      <View style={barStyles.bg}>
        <View
          style={[
            barStyles.fill,
            { width: `${ratio * 100}%`, backgroundColor: isOver ? colors.error : colors.primary },
          ]}
        />
      </View>
    </View>
  );
}

const barStyles = StyleSheet.create({
  bg: { height: 4, backgroundColor: colors.border, borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 2 },
});

export default function HistoryScreen({ navigation }) {
  const [historyDays, setHistoryDays] = useState([]);
  const [expandedDay, setExpandedDay] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  async function loadHistory() {
    const dates = await getHistoryDates();
    const days = await Promise.all(
      dates.map(async (date) => {
        const meals = await getMealsForDate(date);
        const totalCalories = meals.reduce((s, m) => s + (m.totalCalories || 0), 0);
        const totalWeight = meals.reduce((s, m) => s + (m.totalWeightGrams || 0), 0);
        const totalProtein = meals.reduce((s, m) => s + (m.proteinGrams || 0), 0);
        const totalCarbs = meals.reduce((s, m) => s + (m.carbsGrams || 0), 0);
        const totalFat = meals.reduce((s, m) => s + (m.fatGrams || 0), 0);
        return { date, meals, totalCalories, totalWeight, totalProtein, totalCarbs, totalFat };
      })
    );
    setHistoryDays(days);
  }

  function formatDateLabel(dateStr) {
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (dateStr === todayStr) return 'Today';
    if (dateStr === yesterdayStr) return 'Yesterday';

    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
    });
  }

  function formatMealTime(isoString) {
    return new Date(isoString).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  function handleEditMeal(meal, dateKey) {
    navigation.navigate('EditMeal', { meal, dateKey });
  }

  if (historyDays.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>History</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyTitle}>No history yet</Text>
          <Text style={styles.emptySubtext}>Start logging meals to see your history here</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>{historyDays.length} days tracked</Text>
      </View>

      <FlatList
        data={historyDays}
        keyExtractor={(item) => item.date}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isExpanded = expandedDay === item.date;
          return (
            <View style={styles.dayCard}>
              <TouchableOpacity
                style={styles.dayHeader}
                onPress={() => setExpandedDay(isExpanded ? null : item.date)}
                activeOpacity={0.7}
              >
                <View style={styles.dayLeft}>
                  <Text style={styles.dayLabel}>{formatDateLabel(item.date)}</Text>
                  <Text style={styles.dayDateStr}>{item.date}</Text>
                  <CalorieBar calories={item.totalCalories} />
                  <MacroRow protein={item.totalProtein} carbs={item.totalCarbs} fat={item.totalFat} />
                </View>
                <View style={styles.dayRight}>
                  <Text style={styles.dayCalories}>{item.totalCalories.toLocaleString()}</Text>
                  <Text style={styles.dayCalLabel}>cal</Text>
                  <Text style={styles.dayMealCount}>{item.meals.length} meals</Text>
                  <Text style={styles.dayWeight}>{item.totalWeight}g</Text>
                </View>
                <Text style={styles.chevron}>{isExpanded ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {isExpanded && item.meals.length > 0 && (
                <View style={styles.mealsList}>
                  {item.meals.map((meal, idx) => (
                    <TouchableOpacity
                      key={meal.id}
                      style={[
                        styles.mealRow,
                        idx === item.meals.length - 1 && styles.mealRowLast,
                      ]}
                      onPress={() => handleEditMeal(meal, item.date)}
                      activeOpacity={0.75}
                    >
                      {meal.imageUri ? (
                        <Image source={{ uri: meal.imageUri }} style={styles.mealThumb} />
                      ) : (
                        <View style={[styles.mealThumb, styles.mealThumbFallback]}>
                          <Text style={{ fontSize: 22 }}>🍽️</Text>
                        </View>
                      )}

                      <View style={styles.mealInfo}>
                        <Text style={styles.mealName} numberOfLines={1}>{meal.foodName}</Text>
                        <Text style={styles.mealTime}>{formatMealTime(meal.timestamp)}</Text>
                        <MacroRow protein={meal.proteinGrams} carbs={meal.carbsGrams} fat={meal.fatGrams} />
                      </View>

                      <View style={styles.mealStats}>
                        <Text style={styles.mealCal}>{meal.totalCalories}</Text>
                        <Text style={styles.mealCalLabel}>cal</Text>
                        <Text style={styles.mealWeight}>{meal.totalWeightGrams}g</Text>
                        <Text style={styles.editHint}>edit</Text>
                      </View>
                    </TouchableOpacity>
                  ))}

                  <View style={styles.daySummaryRow}>
                    <Text style={styles.daySummaryText}>
                      Total: {item.totalCalories.toLocaleString()} cal · P {item.totalProtein}g · C {item.totalCarbs}g · F {item.totalFat}g · {item.totalWeight.toLocaleString()}g
                    </Text>
                  </View>
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: fontSize.xxxl, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: 2 },

  listContent: { padding: spacing.md, paddingBottom: spacing.xxl },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxl },
  emptyIcon: { fontSize: 64, marginBottom: spacing.md },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textSecondary },
  emptySubtext: { fontSize: fontSize.md, color: colors.border, textAlign: 'center', marginTop: spacing.sm, lineHeight: 22 },

  dayCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  dayHeader: { flexDirection: 'row', alignItems: 'center', padding: spacing.md },
  dayLeft: { flex: 1 },
  dayLabel: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  dayDateStr: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 1 },
  dayRight: { alignItems: 'flex-end', marginRight: spacing.sm },
  dayCalories: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.primary },
  dayCalLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  dayMealCount: { fontSize: fontSize.sm, color: colors.textSecondary },
  dayWeight: { fontSize: fontSize.sm, color: colors.textSecondary },
  chevron: { fontSize: fontSize.sm, color: colors.textSecondary, width: 18, textAlign: 'center' },

  mealsList: { borderTopWidth: 1, borderTopColor: colors.border },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.background,
  },
  mealRowLast: { borderBottomWidth: 0 },
  mealThumb: { width: 56, height: 56, borderRadius: radius.sm, marginRight: spacing.sm },
  mealThumbFallback: { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  mealInfo: { flex: 1, marginRight: spacing.sm },
  mealName: { fontSize: fontSize.md, fontWeight: '600', color: colors.text },
  mealTime: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  mealStats: { alignItems: 'flex-end' },
  mealCal: { fontSize: fontSize.xl, fontWeight: '800', color: colors.primary },
  mealCalLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  mealWeight: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 1 },
  editHint: { fontSize: fontSize.xs, color: colors.border, marginTop: 3 },

  daySummaryRow: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  daySummaryText: { fontSize: fontSize.sm, color: colors.primaryDark, fontWeight: '600' },
});
