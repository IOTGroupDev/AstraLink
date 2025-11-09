// src/screens/HoroscopeScreen.tsx - Refactored with TabScreenLayout
import React, { useState } from 'react';
import { StyleSheet, View, Text, StatusBar } from 'react-native';
import { BlurView } from 'expo-blur';
import HoroscopeSvg from '../components/svg/tabs/HoroscopeSvg';
import { LunarCalendarWidget } from '../components/horoscope/LunarCalendarWidget';
import EnergyWidget from '../components/horoscope/EnergyWidget';
import { TabScreenLayout } from '../components/layout/TabScreenLayout';
import MainTransitWidget from '../components/horoscope/MainTransitWidget';
import BiorhythmsWidget from '../components/horoscope/BiorhythmsWidget';
import HoroscopeWidget from '../components/horoscope/HoroscopeWidget';

const HoroscopeScreen: React.FC = () => {
  return (
    <>
      <StatusBar barStyle="light-content" />
      <TabScreenLayout>
        {/* Заголовок с размытием */}
        <BlurView intensity={20} tint="dark" style={styles.headerContainer}>
          <View style={styles.headerIconContainer}>
            <HoroscopeSvg size={60} />
          </View>
          <Text style={styles.headerTitle}>Гороскоп</Text>
          <Text style={styles.headerSubtitle}>Астрологический дашборд</Text>
          <Text style={styles.headerDate}>
            Позиции на{' '}
            {new Date().toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </BlurView>

        {/* Основной контент */}
        <View style={styles.contentContainer}>
          {/* Виджет лунного календаря */}
          <LunarCalendarWidget />

          {/* Виджет энергии */}
          <EnergyWidget energy={50} message={'ok'} />

          {/* Виджет главный транзит */}
          <MainTransitWidget transitData={null} />

          {/* Виджет Биоритмы*/}
          <BiorhythmsWidget physical={75} emotional={25} intellectual={100} />

          {/* Гороскоп виджет */}
          <HoroscopeWidget predictions={''} />
          {/* Placeholder для будущих виджетов */}
          <View style={styles.placeholder}>
            <Text style={styles.placeholderText}>
              Дополнительные виджеты появятся здесь
            </Text>
          </View>
        </View>
      </TabScreenLayout>
    </>
  );
};

const styles = StyleSheet.create({
  // Заголовок
  headerContainer: {
    marginHorizontal: 8, // Уменьшили, т.к. TabScreenLayout уже даёт paddingHorizontal: 16
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerIconContainer: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 10,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 20,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 10,
    textAlign: 'center',
  },
  headerDate: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 10,
    textAlign: 'center',
  },

  // Контент
  contentContainer: {
    marginTop: 20,
    gap: 20,
  },
  placeholder: {
    padding: 32,
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
});

export default HoroscopeScreen;
