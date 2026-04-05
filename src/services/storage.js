import AsyncStorage from '@react-native-async-storage/async-storage';

const SETTINGS_KEY = '@food_tracker_settings';
const MEALS_PREFIX = '@meals_';

// Returns date string in YYYY-MM-DD format
export function getDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function saveSettings(settings) {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function getSettings() {
  try {
    const data = await AsyncStorage.getItem(SETTINGS_KEY);
    return data ? JSON.parse(data) : { apiKey: '', dailyCalorieGoal: 2000 };
  } catch {
    return { apiKey: '', dailyCalorieGoal: 2000 };
  }
}

export async function saveMeal(meal) {
  const dateKey = getDateKey();
  const key = `${MEALS_PREFIX}${dateKey}`;
  const existing = await getMealsForDate(dateKey);
  const newMeal = {
    ...meal,
    id: Date.now(),
    timestamp: new Date().toISOString(),
  };
  const updated = [...existing, newMeal];
  await AsyncStorage.setItem(key, JSON.stringify(updated));
  return updated;
}

export async function updateMeal(dateKey, updatedMeal) {
  const meals = await getMealsForDate(dateKey);
  const updated = meals.map((m) => (m.id === updatedMeal.id ? updatedMeal : m));
  const key = `${MEALS_PREFIX}${dateKey}`;
  await AsyncStorage.setItem(key, JSON.stringify(updated));
  return updated;
}

export async function getMealsForDate(dateKey) {
  try {
    const key = `${MEALS_PREFIX}${dateKey}`;
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function moveMeal(oldDateKey, newDateKey, updatedMeal) {
  // Remove from old date
  const oldMeals = await getMealsForDate(oldDateKey);
  await AsyncStorage.setItem(
    `${MEALS_PREFIX}${oldDateKey}`,
    JSON.stringify(oldMeals.filter((m) => m.id !== updatedMeal.id))
  );
  // Add to new date
  const newMeals = await getMealsForDate(newDateKey);
  await AsyncStorage.setItem(
    `${MEALS_PREFIX}${newDateKey}`,
    JSON.stringify([...newMeals, updatedMeal])
  );
}

export async function deleteMeal(dateKey, mealId) {
  const meals = await getMealsForDate(dateKey);
  const updated = meals.filter((m) => m.id !== mealId);
  const key = `${MEALS_PREFIX}${dateKey}`;
  await AsyncStorage.setItem(key, JSON.stringify(updated));
  return updated;
}

export async function getHistoryDates() {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    return allKeys
      .filter((k) => k.startsWith(MEALS_PREFIX))
      .map((k) => k.replace(MEALS_PREFIX, ''))
      .sort((a, b) => b.localeCompare(a)); // newest first
  } catch {
    return [];
  }
}

export async function clearAllData() {
  const allKeys = await AsyncStorage.getAllKeys();
  const mealKeys = allKeys.filter((k) => k.startsWith(MEALS_PREFIX));
  await AsyncStorage.multiRemove(mealKeys);
}
