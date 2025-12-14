import React from 'react';
import { ScrollView } from 'react-native';
import { Subscription } from '../types';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../types/navigation';
import { useNavigation } from '@react-navigation/native';
import SubscriptionCard from '../components/profile/SubscriptionCard';

type SubscriptionScreenProps = StackScreenProps<
  RootStackParamList,
  'Subscription'
>;

function SubscriptionScreen(_: SubscriptionScreenProps) {
  // TODO: здесь можно подключить стор/запрос для получения текущей подписки пользователя
  // Пока безопасно показываем "free" состояние.
  const navigation = useNavigation();

  const handleUpgrade = () => {
    // заглушка: можно навигировать на экран апгрейда, когда появится
    // navigation.navigate('UpgradeSubscription' as never);
  };

  const mockSubscription: Subscription | null = {
    tier: 'free',
    isTrial: false,
    trialEndsAt: undefined as any,
    expiresAt: undefined as any,
  } as any;

  return (
    <ScrollView contentContainerStyle={{ paddingVertical: 12 }}>
      <SubscriptionCard
        subscription={mockSubscription}
        onUpgrade={handleUpgrade}
        showUpgradeButton
      />
    </ScrollView>
  );
}

export default SubscriptionScreen;
