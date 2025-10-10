import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSubscription } from '../hooks/useSubscription';
import { advisorAPI } from '../services/api';

type Topic =
  | 'contract'
  | 'meeting'
  | 'date'
  | 'travel'
  | 'purchase'
  | 'health'
  | 'negotiation'
  | 'custom';

const topics: { key: Topic; label: string }[] = [
  { key: 'contract', label: 'Контракт' },
  { key: 'meeting', label: 'Встреча' },
  { key: 'negotiation', label: 'Переговоры' },
  { key: 'date', label: 'Свидание' },
  { key: 'travel', label: 'Путешествие' },
  { key: 'purchase', label: 'Покупка' },
  { key: 'health', label: 'Здоровье' },
  { key: 'custom', label: 'Другое' },
];

export default function AdvisorChatScreen() {
  const navigation = useNavigation<any>();
  const { isPremium } = useSubscription();
  const premium = useMemo(() => isPremium(), [isPremium]);

  // Inputs
  const [selectedTopic, setSelectedTopic] = useState<Topic>('contract');
  const [date, setDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  ); // YYYY-MM-DD
  const [customNote, setCustomNote] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Result
  const [result, setResult] = useState<null | {
    verdict: 'good' | 'neutral' | 'challenging';
    score: number;
    factors: {
      label: string;
      weight: number;
      value: number;
      contribution: number;
    }[];
    aspects: {
      planetA: string;
      planetB: string;
      type: string;
      orb: number;
      impact: number;
    }[];
    bestWindows: { startISO: string; endISO: string; score: number }[];
    explanation: string;
  }>(null);

  const timezone = useMemo(() => {
    try {
      // IANA TZ where available
      // @ts-ignore
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }, []);

  const submit = async () => {
    setResult(null);
    setLoading(true);
    try {
      const payload = {
        topic: selectedTopic,
        date,
        timezone,
        customNote: customNote || undefined,
      };
      const data = await advisorAPI.evaluate(payload);
      setResult(data);
    } catch (e: any) {
      setResult({
        verdict: 'challenging',
        score: 0,
        factors: [],
        aspects: [],
        bestWindows: [],
        explanation:
          e?.response?.data?.message || 'Ошибка запроса. Попробуйте позже.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!premium) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#0A0A0F',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
        }}
      >
        <Ionicons name="lock-closed" size={72} color="#8B5CF6" />
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 20,
            fontWeight: '600',
            marginTop: 12,
            textAlign: 'center',
          }}
        >
          Доступно только для Premium
        </Text>
        <Text
          style={{
            color: 'rgba(255,255,255,0.7)',
            fontSize: 14,
            marginTop: 8,
            textAlign: 'center',
          }}
        >
          Персональный советник: «Хороший ли день для …» с реальными транзитами
          и натальной картой.
        </Text>
        <TouchableOpacity
          onPress={() => {
            try {
              navigation.navigate('Subscription');
            } catch {
              // если нет маршрута, ничего не делаем
            }
          }}
          style={{
            marginTop: 16,
            backgroundColor: '#8B5CF6',
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
            Перейти на Premium
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0A0A0F' }}>
      {/* Controls */}
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text
          style={{
            color: '#FFFFFF',
            fontSize: 18,
            fontWeight: '700',
            marginBottom: 12,
          }}
        >
          Советник: хороший ли день…
        </Text>

        {/* Topic chips */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {topics.map((t) => {
            const active = t.key === selectedTopic;
            return (
              <TouchableOpacity
                key={t.key}
                onPress={() => setSelectedTopic(t.key)}
                style={{
                  backgroundColor: active
                    ? '#8B5CF6'
                    : 'rgba(255,255,255,0.08)',
                  borderColor: active ? '#A78BFA' : 'rgba(255,255,255,0.15)',
                  borderWidth: 1,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                }}
              >
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontWeight: active ? '700' : '500',
                  }}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Date input (YYYY-MM-DD) */}
        <View style={{ marginTop: 16 }}>
          <Text style={{ color: '#9CA3AF', marginBottom: 6 }}>
            Дата (YYYY-MM-DD)
          </Text>
          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="rgba(255,255,255,0.4)"
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              color: '#FFFFFF',
              paddingHorizontal: 12,
              paddingVertical: 12,
              borderRadius: 12,
              borderColor: 'rgba(255,255,255,0.15)',
              borderWidth: 1,
              fontVariant: ['tabular-nums'],
            }}
          />
        </View>

        {/* Custom note */}
        <View style={{ marginTop: 12 }}>
          <Text style={{ color: '#9CA3AF', marginBottom: 6 }}>
            Контекст (опционально)
          </Text>
          <TextInput
            value={customNote}
            onChangeText={setCustomNote}
            placeholder="Например: «подписание договора на аренду офиса»"
            placeholderTextColor="rgba(255,255,255,0.4)"
            style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              color: '#FFFFFF',
              paddingHorizontal: 12,
              paddingVertical: 12,
              borderRadius: 12,
              borderColor: 'rgba(255,255,255,0.15)',
              borderWidth: 1,
            }}
            multiline
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          onPress={submit}
          disabled={loading}
          style={{
            marginTop: 16,
            backgroundColor: loading ? 'rgba(139,92,246,0.6)' : '#8B5CF6',
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderRadius: 12,
            alignSelf: 'flex-start',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
          )}
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>
            {loading ? 'Запрос...' : 'Спросить'}
          </Text>
        </TouchableOpacity>

        {/* Result */}
        {result && (
          <View style={{ marginTop: 20, gap: 14 }}>
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderColor: 'rgba(255,255,255,0.12)',
                borderWidth: 1,
                borderRadius: 12,
                padding: 14,
                gap: 6,
              }}
            >
              <Text style={{ color: '#9CA3AF' }}>Вердикт</Text>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Ionicons
                  name={
                    result.verdict === 'good'
                      ? 'checkmark-circle'
                      : result.verdict === 'neutral'
                        ? 'remove-circle'
                        : 'close-circle'
                  }
                  size={20}
                  color={
                    result.verdict === 'good'
                      ? '#10B981'
                      : result.verdict === 'neutral'
                        ? '#F59E0B'
                        : '#EF4444'
                  }
                />
                <Text
                  style={{
                    color:
                      result.verdict === 'good'
                        ? '#10B981'
                        : result.verdict === 'neutral'
                          ? '#F59E0B'
                          : '#EF4444',
                    fontWeight: '700',
                  }}
                >
                  {result.verdict.toUpperCase()} — {result.score} / 100
                </Text>
              </View>
              {!!result.explanation && (
                <Text style={{ color: 'rgba(255,255,255,0.85)', marginTop: 6 }}>
                  {result.explanation}
                </Text>
              )}
            </View>

            {/* Best windows */}
            {result.bestWindows?.length > 0 && (
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderColor: 'rgba(255,255,255,0.12)',
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 14,
                  gap: 6,
                }}
              >
                <Text style={{ color: '#9CA3AF', marginBottom: 4 }}>
                  Лучшие окна
                </Text>
                {result.bestWindows.map((w, idx) => (
                  <View
                    key={idx}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      marginVertical: 2,
                    }}
                  >
                    <Text style={{ color: '#FFFFFF' }}>
                      {new Date(w.startISO).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}{' '}
                      -{' '}
                      {new Date(w.endISO).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                    <Text style={{ color: '#A78BFA', fontWeight: '600' }}>
                      {w.score}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Aspects */}
            {result.aspects?.length > 0 && (
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderColor: 'rgba(255,255,255,0.12)',
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 14,
                  gap: 6,
                }}
              >
                <Text style={{ color: '#9CA3AF', marginBottom: 4 }}>
                  Аспекты (натал ↔ текущие)
                </Text>
                {result.aspects.map((a, idx) => (
                  <Text key={idx} style={{ color: '#FFFFFF' }}>
                    {a.planetA} {a.type} {a.planetB} · орб {a.orb.toFixed(2)}° ·
                    влияние {a.impact.toFixed(2)}
                  </Text>
                ))}
              </View>
            )}

            {/* Factors */}
            {result.factors?.length > 0 && (
              <View
                style={{
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderColor: 'rgba(255,255,255,0.12)',
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 14,
                  gap: 6,
                }}
              >
                <Text style={{ color: '#9CA3AF', marginBottom: 4 }}>
                  Факторы
                </Text>
                {result.factors.map((f, idx) => (
                  <Text key={idx} style={{ color: '#FFFFFF' }}>
                    {f.label}: вклад {Math.round(f.contribution)} (вес{' '}
                    {f.weight}, сила {(f.value * 100).toFixed(0)}%)
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
