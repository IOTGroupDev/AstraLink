// screens/onboarding/OnboardingFirstScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { OnboardingLayout } from '../../components/onboarding/OnboardingLayout';
import OnboardingHeader from '../../components/onboarding/OnboardingHeader';
import OnboardingButton from '../../components/onboarding/OnboardingButton';
import { testBackendDebug, DebugHttpDump } from '../../services/api';

const OnboardingFirstScreen: React.FC = () => {
  const [dump, setDump] = useState<DebugHttpDump | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTestBackend = async () => {
    setLoading(true);
    setDump(null);
    try {
      const d = await testBackendDebug();
      setDump(d);
    } finally {
      setLoading(false);
    }
  };

  const pretty = (v: any) => {
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  };

  return (
    <OnboardingLayout>
      <OnboardingHeader title="Проверим соединение с сервером" />

      <View style={styles.content}>
        <OnboardingButton
          title="Проверить соединение"
          onPress={handleTestBackend}
        />

        {loading && <ActivityIndicator size="small" style={styles.indicator} />}

        {dump && (
          <ScrollView style={styles.card}>
            <Text style={styles.sectionTitle}>
              ⏱ Время: {dump.durationMs} ms
            </Text>

            <Text style={styles.blockTitle}>📤 Наш запрос</Text>
            <View style={styles.kvRow}>
              <Text style={styles.kvKey}>Метод:</Text>
              <Text style={styles.kvVal}>
                {dump.request.method?.toUpperCase() || '—'}
              </Text>
            </View>
            <View style={styles.kvRow}>
              <Text style={styles.kvKey}>BaseURL:</Text>
              <Text style={styles.kvVal}>{dump.request.baseURL || '—'}</Text>
            </View>
            <View style={styles.kvRow}>
              <Text style={styles.kvKey}>URL:</Text>
              <Text style={styles.kvVal}>{dump.request.url || '—'}</Text>
            </View>
            <View style={styles.kvRow}>
              <Text style={styles.kvKey}>Полный адрес:</Text>
              <Text style={styles.kvVal}>{dump.request.fullUrl || '—'}</Text>
            </View>

            <Text style={styles.subTitle}>Заголовки:</Text>
            <ScrollView style={styles.jsonBox} nestedScrollEnabled>
              <Text style={styles.mono}>{pretty(dump.request.headers)}</Text>
            </ScrollView>

            {dump.request.data !== undefined && (
              <>
                <Text style={styles.subTitle}>Тело запроса:</Text>
                <ScrollView style={styles.jsonBox} nestedScrollEnabled>
                  <Text style={styles.mono}>{pretty(dump.request.data)}</Text>
                </ScrollView>
              </>
            )}

            {dump.request.params !== undefined && (
              <>
                <Text style={styles.subTitle}>Query params:</Text>
                <ScrollView style={styles.jsonBox} nestedScrollEnabled>
                  <Text style={styles.mono}>{pretty(dump.request.params)}</Text>
                </ScrollView>
              </>
            )}

            <Text style={[styles.blockTitle, { marginTop: 18 }]}>
              📥 Ответ сервера
            </Text>
            {dump.response ? (
              <>
                <View style={styles.kvRow}>
                  <Text style={styles.kvKey}>Статус:</Text>
                  <Text
                    style={[
                      styles.kvVal,
                      dump.response.status >= 200 && dump.response.status < 300
                        ? styles.ok
                        : styles.fail,
                    ]}
                  >
                    {dump.response.status} {dump.response.statusText}
                  </Text>
                </View>

                <Text style={styles.subTitle}>Заголовки ответа:</Text>
                <ScrollView style={styles.jsonBox} nestedScrollEnabled>
                  <Text style={styles.mono}>
                    {pretty(dump.response.headers)}
                  </Text>
                </ScrollView>

                <Text style={styles.subTitle}>Тело ответа:</Text>
                <ScrollView style={styles.jsonBox} nestedScrollEnabled>
                  <Text style={styles.mono}>{pretty(dump.response.data)}</Text>
                </ScrollView>
              </>
            ) : (
              <>
                <Text style={[styles.subTitle, styles.fail]}>
                  Ответ отсутствует
                </Text>
                {dump.error && (
                  <>
                    <Text style={styles.subTitle}>Ошибка:</Text>
                    <ScrollView style={styles.jsonBox} nestedScrollEnabled>
                      <Text style={styles.mono}>{pretty(dump.error)}</Text>
                    </ScrollView>
                  </>
                )}
              </>
            )}
          </ScrollView>
        )}
      </View>
    </OnboardingLayout>
  );
};

const styles = StyleSheet.create({
  content: {
    marginTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    width: '100%',
  },
  indicator: { marginTop: 12 },
  card: {
    marginTop: 20,
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    padding: 14,
  },
  sectionTitle: {
    color: '#fff',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  blockTitle: {
    color: '#fff',
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 8,
  },
  subTitle: {
    color: '#fff',
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 6,
  },
  kvRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  kvKey: { color: '#bdbdbd', minWidth: 96 },
  kvVal: { color: '#fff', flexShrink: 1 },
  ok: { color: '#7CFC00' },
  fail: { color: '#ff6b6b' },
  jsonBox: {
    maxHeight: 160,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: 10,
    padding: 10,
  },
  mono: {
    color: '#fff',
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
    fontSize: 12,
    lineHeight: 16,
  },
});

export default OnboardingFirstScreen;
