import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ClearScreen() {
  const handleClear = async () => {
    try {
      await AsyncStorage.clear();
      Alert.alert('✅ Успех', 'AsyncStorage полностью очищен!');
    } catch (e) {
      Alert.alert('❌ Ошибка', 'Не удалось очистить хранилище');
      console.error(e);
    }
  };

  return (
    <View style={{ padding: 20 }}>
      <TouchableOpacity
        onPress={handleClear}
        style={{
          backgroundColor: '#6200EE',
          padding: 12,
          borderRadius: 10,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>
          Очистить AsyncStorage
        </Text>
      </TouchableOpacity>
    </View>
  );
}
