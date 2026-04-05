import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getSettings, saveSettings, clearAllData } from '../services/storage';
import { colors, spacing, fontSize, radius } from '../theme';

export default function SettingsScreen() {
  const [apiKey, setApiKey] = useState('');
  const [dailyGoal, setDailyGoal] = useState('2000');
  const [showKey, setShowKey] = useState(false);
  const [savedIndicator, setSavedIndicator] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  async function loadSettings() {
    const settings = await getSettings();
    setApiKey(settings.apiKey || '');
    setDailyGoal(String(settings.dailyCalorieGoal || 2000));
  }

  async function handleSave() {
    const goal = parseInt(dailyGoal, 10);
    if (isNaN(goal) || goal < 500 || goal > 10000) {
      Alert.alert('Invalid Goal', 'Daily calorie goal must be between 500 and 10,000.');
      return;
    }
    await saveSettings({ apiKey: apiKey.trim(), dailyCalorieGoal: goal });
    setSavedIndicator(true);
    setTimeout(() => setSavedIndicator(false), 2500);
  }

  async function handleClearData() {
    Alert.alert(
      'Clear All Data',
      'This will permanently delete all your logged meals. This cannot be undone.',
      [
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: async () => {
            await clearAllData();
            Alert.alert('Done', 'All meal history has been cleared.');
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }

  const keyIsValid = apiKey.trim().length > 10;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Google AI API Key */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.googleG}>G</Text>
          <Text style={styles.cardTitle}>Google AI API Key</Text>
        </View>
        <Text style={styles.cardDesc}>
          Required for food analysis via Gemini. Get your free key at{' '}
          <Text style={styles.link}>aistudio.google.com</Text>
        </Text>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="AIza..."
            placeholderTextColor={colors.border}
            secureTextEntry={!showKey}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
          />
          <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowKey((v) => !v)}>
            <Text style={styles.eyeIcon}>{showKey ? '🙈' : '👁️'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.saveKeyBtn, savedIndicator && styles.saveKeyBtnSuccess]}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Text style={styles.saveKeyBtnText}>{savedIndicator ? '✓  Saved!' : 'Save Key'}</Text>
        </TouchableOpacity>

        {apiKey.trim().length > 0 && (
          <View style={styles.keyStatus}>
            <View style={[styles.statusDot, { backgroundColor: keyIsValid ? colors.success : colors.warning }]} />
            <Text style={[styles.statusText, { color: keyIsValid ? colors.success : colors.warning }]}>
              {keyIsValid ? 'Key entered' : 'Key looks too short'}
            </Text>
          </View>
        )}

        <View style={styles.stepsBox}>
          <Text style={styles.stepsTitle}>How to get your key:</Text>
          <Text style={styles.stepsText}>
            1. Go to <Text style={styles.link}>aistudio.google.com</Text>{'\n'}
            2. Sign in with your Google account{'\n'}
            3. Click <Text style={styles.bold}>Get API key</Text> → <Text style={styles.bold}>Create API key</Text>{'\n'}
            4. Copy and paste it here
          </Text>
        </View>
      </View>

      {/* Daily Calorie Goal */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Daily Calorie Goal</Text>
        <Text style={styles.cardDesc}>Your target calorie intake per day</Text>
        <TextInput
          style={[styles.textInput, { marginTop: spacing.sm }]}
          value={dailyGoal}
          onChangeText={setDailyGoal}
          keyboardType="number-pad"
          placeholder="2000"
          placeholderTextColor={colors.border}
        />
        <View style={styles.presetRow}>
          {[1500, 1800, 2000, 2200, 2500].map((preset) => (
            <TouchableOpacity
              key={preset}
              style={[styles.presetChip, dailyGoal === String(preset) && styles.presetChipActive]}
              onPress={() => setDailyGoal(String(preset))}
            >
              <Text style={[styles.presetText, dailyGoal === String(preset) && styles.presetTextActive]}>
                {preset}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* How it works */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How Food Tracker works</Text>
        <View style={styles.infoSteps}>
          {[
            ['📸', 'Take a photo of your meal'],
            ['🤖', 'Gemini AI identifies ingredients'],
            ['🔢', 'Get calories, macros & weight'],
            ['✏️', 'Edit or delete any meal entry'],
            ['📅', 'Review your history any time'],
          ].map(([icon, text], i) => (
            <View key={i} style={styles.infoStep}>
              <Text style={styles.infoStepIcon}>{icon}</Text>
              <Text style={styles.infoStepText}>{text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Save */}
      <TouchableOpacity
        style={[styles.saveBtn, savedIndicator && styles.saveBtnSuccess]}
        onPress={handleSave}
        activeOpacity={0.85}
      >
        <Text style={styles.saveBtnText}>{savedIndicator ? '✓  Saved!' : 'Save Settings'}</Text>
      </TouchableOpacity>

      {/* Danger Zone */}
      <View style={styles.dangerCard}>
        <Text style={styles.dangerTitle}>Danger Zone</Text>
        <TouchableOpacity style={styles.clearBtn} onPress={handleClearData}>
          <Text style={styles.clearBtnText}>Clear All Meal History</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Food Tracker · Powered by Google Gemini</Text>
        <Text style={styles.footerText}>v1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing.xxl },

  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: fontSize.xxxl, fontWeight: '800', color: colors.text },

  card: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
  googleG: {
    fontSize: fontSize.xl,
    fontWeight: '900',
    color: '#4285F4',
    marginRight: spacing.xs,
    fontStyle: 'italic',
  },
  cardTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  cardDesc: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: 4, lineHeight: 20, marginBottom: spacing.sm },
  link: { color: '#4285F4', fontWeight: '600' },
  bold: { fontWeight: '700', color: colors.text },

  inputRow: { flexDirection: 'row', alignItems: 'center' },
  textInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: fontSize.md,
    color: colors.text,
    backgroundColor: colors.background,
  },
  eyeBtn: { padding: spacing.sm, marginLeft: spacing.xs },
  eyeIcon: { fontSize: 20 },

  saveKeyBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  saveKeyBtnSuccess: { backgroundColor: '#16A34A' },
  saveKeyBtnText: { fontSize: fontSize.md, color: colors.white, fontWeight: '700' },

  keyStatus: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: spacing.xs },
  statusText: { fontSize: fontSize.sm, fontWeight: '500' },

  stepsBox: {
    marginTop: spacing.md,
    backgroundColor: '#EFF6FF',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  stepsTitle: { fontSize: fontSize.sm, fontWeight: '700', color: '#1D4ED8', marginBottom: spacing.xs },
  stepsText: { fontSize: fontSize.sm, color: '#1E3A8A', lineHeight: 22 },

  presetRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.md, gap: spacing.xs },
  presetChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  presetChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  presetText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  presetTextActive: { color: colors.primaryDark },

  infoCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  infoTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.primaryDark, marginBottom: spacing.md },
  infoSteps: { gap: spacing.sm },
  infoStep: { flexDirection: 'row', alignItems: 'center' },
  infoStepIcon: { fontSize: 20, width: 30 },
  infoStepText: { fontSize: fontSize.md, color: colors.primaryDark, flex: 1 },

  saveBtn: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
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
  saveBtnSuccess: { backgroundColor: '#16A34A' },
  saveBtnText: { fontSize: fontSize.lg, color: colors.white, fontWeight: '700' },

  dangerCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  dangerTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.error, marginBottom: spacing.sm },
  clearBtn: {
    borderWidth: 1.5,
    borderColor: colors.error,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  clearBtnText: { color: colors.error, fontWeight: '600', fontSize: fontSize.md },

  footer: { alignItems: 'center', paddingTop: spacing.sm, paddingBottom: spacing.lg },
  footerText: { fontSize: fontSize.sm, color: colors.border, marginBottom: 2 },
});
