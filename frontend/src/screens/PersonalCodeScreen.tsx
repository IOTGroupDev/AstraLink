import React, { useState, useMemo, useRef } from 'react';
import {
  Animated,
  Image,
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import LoadingIndicator from '../components/shared/LoadingIndicator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../types/navigation';
import { CodePurpose, PersonalCodeResult } from '../types/personal-code';
import { chartAPI } from '../services/api';
import { logger } from '../services/logger';
import {
  DATING_GLASS_BORDER_COLORS,
  DATING_GLASS_BORDER_GRADIENT,
  DatingGlassFill,
  GradientBorderView,
} from '../components/shared';

const personalCodeBackground = require('../../assets/advisor-bg.png');

const SURFACE_BORDER_COLORS = [
  'rgba(255, 255, 255, 0.34)',
  'rgba(124, 119, 153, 0.08)',
] as const;

const PURPOSE_CONFIG: Array<{
  key: CodePurpose;
  icon: string;
  color: string;
}> = [
  { key: CodePurpose.LUCK, icon: '🍀', color: '#10B981' },
  { key: CodePurpose.HEALTH, icon: '❤️', color: '#EF4444' },
  { key: CodePurpose.WEALTH, icon: '💰', color: '#F59E0B' },
  { key: CodePurpose.LOVE, icon: '💕', color: '#EC4899' },
  { key: CodePurpose.CAREER, icon: '🎯', color: '#8B5CF6' },
  { key: CodePurpose.CREATIVITY, icon: '🎨', color: '#F97316' },
  { key: CodePurpose.PROTECTION, icon: '🛡️', color: '#6366F1' },
  { key: CodePurpose.INTUITION, icon: '🔮', color: '#A855F7' },
  { key: CodePurpose.HARMONY, icon: '☯️', color: '#06B6D4' },
  { key: CodePurpose.ENERGY, icon: '⚡', color: '#FBBF24' },
];

type PersonalCodeScreenProps = StackScreenProps<
  RootStackParamList,
  'PersonalCode'
>;

function PersonalCodeScreen({ navigation }: PersonalCodeScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const resultTranslateX = useRef(new Animated.Value(windowWidth)).current;
  const formTranslateX = useRef(new Animated.Value(0)).current;
  const headerTitleOpacity = useRef(new Animated.Value(1)).current;
  const headerTopPadding = insets.top + 10;
  const headerHeight = headerTopPadding + 48;
  const ctaBottom = Math.max(16, insets.bottom + 12);
  const [selectedPurpose, setSelectedPurpose] = useState<CodePurpose>(
    CodePurpose.LUCK
  );
  const [selectedDigitCount, setSelectedDigitCount] = useState<number>(4);
  const [result, setResult] = useState<PersonalCodeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const purposes = useMemo(
    () =>
      PURPOSE_CONFIG.map((config) => ({
        ...config,
        label: t(`personalCode.purposes.${config.key}`),
      })),
    [t]
  );

  const digitCounts = [3, 4, 5, 6, 7, 8, 9];

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await chartAPI.generatePersonalCode(
        selectedPurpose,
        selectedDigitCount
      );
      resultTranslateX.setValue(windowWidth);
      Animated.timing(headerTitleOpacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }).start(() => {
        setResult(data);
        requestAnimationFrame(() => {
          Animated.parallel([
            Animated.timing(resultTranslateX, {
              toValue: 0,
              duration: 320,
              useNativeDriver: true,
            }),
            Animated.timing(formTranslateX, {
              toValue: -windowWidth * 0.28,
              duration: 320,
              useNativeDriver: true,
            }),
            Animated.timing(headerTitleOpacity, {
              toValue: 1,
              duration: 180,
              useNativeDriver: true,
            }),
          ]).start();
        });
      });
    } catch (err: any) {
      setError(
        err.response?.data?.message || t('personalCode.errors.generationFailed')
      );
      logger.error('Error generating code', err);
    } finally {
      setLoading(false);
    }
  };

  const closeResult = () => {
    Animated.parallel([
      Animated.timing(resultTranslateX, {
        toValue: windowWidth,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(formTranslateX, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(headerTitleOpacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setResult(null);
      Animated.timing(headerTitleOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }).start();
    });
  };

  const selectedPurposeData = purposes.find((p) => p.key === selectedPurpose);

  return (
    <View style={styles.container}>
      <Image
        source={personalCodeBackground}
        resizeMode="cover"
        style={styles.backgroundImage}
      />

      <Animated.ScrollView
        style={{ transform: [{ translateX: formTranslateX }] }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight + 24,
            paddingBottom: ctaBottom + 112,
          },
        ]}
      >
        <GradientBorderView
          colors={SURFACE_BORDER_COLORS}
          gradientProps={{
            start: { x: 0.5, y: 0 },
            end: { x: 0.5, y: 1 },
          }}
          style={styles.introCard}
          contentStyle={styles.introCardSurface}
        >
          <BlurView
            intensity={24}
            tint="dark"
            experimentalBlurMethod="dimezisBlurView"
            style={styles.introCardBlur}
          >
            <Ionicons name="code-outline" size={22} color="#D8B4FE" />
            <Text style={styles.headerSubtitle}>
              {t('personalCode.header.subtitle')}
            </Text>
          </BlurView>
        </GradientBorderView>

        {/* Digit Count Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('personalCode.digitCount.title')}
          </Text>
          <View style={styles.digitCountRow}>
            {digitCounts.map((count) => {
              const active = selectedDigitCount === count;

              return (
                <TouchableOpacity
                  activeOpacity={1}
                  key={count}
                  style={styles.digitButtonTouchable}
                  onPress={() => setSelectedDigitCount(count)}
                >
                  <GradientBorderView
                    colors={
                      active
                        ? [
                            'rgba(216, 180, 254, 0.78)',
                            'rgba(139, 92, 246, 0.24)',
                          ]
                        : SURFACE_BORDER_COLORS
                    }
                    style={styles.digitButtonBorder}
                    contentStyle={[
                      styles.digitButton,
                      active && styles.digitButtonActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.digitButtonText,
                        active && styles.digitButtonTextActive,
                      ]}
                    >
                      {count}
                    </Text>
                  </GradientBorderView>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.digitHint}>
            {t('personalCode.digitCount.hint')}
          </Text>
        </View>

        {/* Purpose Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('personalCode.purposes.title')}
          </Text>
          <View style={styles.purposeGrid}>
            {purposes.map((purpose) => (
              <TouchableOpacity
                activeOpacity={1}
                key={purpose.key}
                style={[
                  styles.purposeCard,
                  {
                    borderColor:
                      selectedPurpose === purpose.key
                        ? purpose.color
                        : 'rgba(124, 119, 153, 0.34)',
                  },
                ]}
                onPress={() => setSelectedPurpose(purpose.key)}
              >
                <BlurView
                  intensity={20}
                  tint="dark"
                  experimentalBlurMethod="dimezisBlurView"
                  style={[
                    styles.purposeCardBlur,
                    selectedPurpose === purpose.key && styles.purposeCardActive,
                  ]}
                >
                  <Text style={styles.purposeIcon}>{purpose.icon}</Text>
                  <Text
                    style={[
                      styles.purposeLabel,
                      selectedPurpose === purpose.key &&
                        styles.purposeLabelActive,
                    ]}
                  >
                    {purpose.label}
                  </Text>
                </BlurView>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Error */}
        {error && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={20} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Result */}
        {result && (
          <Modal
            animationType="none"
            transparent
            statusBarTranslucent
            visible
            onRequestClose={closeResult}
          >
            <View style={styles.resultModalRoot}>
              <Animated.View
                style={[
                  styles.resultScreen,
                  { transform: [{ translateX: resultTranslateX }] },
                ]}
              >
                <Image
                  source={personalCodeBackground}
                  resizeMode="cover"
                  style={styles.backgroundImage}
                />
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={[
                    styles.resultScrollContent,
                    {
                      paddingTop: headerHeight + 24,
                      paddingBottom: Math.max(40, insets.bottom + 32),
                    },
                  ]}
                >
                  <View style={styles.resultContainer}>
            {/* Code Display */}
            <BlurView intensity={30} style={styles.codeCard}>
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.2)', 'rgba(124, 58, 237, 0.1)']}
                style={styles.codeCardGradient}
              >
                <View style={styles.codeHeader}>
                  <Text style={styles.codeLabel}>
                    {t('personalCode.result.codeLabel')}
                  </Text>
                  {result.subscriptionTier !== 'free' && (
                    <View style={styles.premiumBadge}>
                      <Ionicons name="star" size={12} color="#F59E0B" />
                      <Text style={styles.premiumBadgeText}>AI</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.codeNumber}>{result.code}</Text>

                <View style={styles.codeMetaRow}>
                  <View style={styles.codeMeta}>
                    <Text style={styles.codeMetaLabel}>
                      {t('personalCode.result.energy')}
                    </Text>
                    <View style={styles.energyBar}>
                      <View
                        style={[
                          styles.energyBarFill,
                          {
                            width: `${result.interpretation.energyLevel}%`,
                            backgroundColor:
                              selectedPurposeData?.color || '#8B5CF6',
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.codeMetaValue}>
                      {result.interpretation.energyLevel}%
                    </Text>
                  </View>

                  <View style={styles.codeMeta}>
                    <Text style={styles.codeMetaLabel}>
                      {t('personalCode.result.vibration')}
                    </Text>
                    <Text style={styles.codeMetaValue}>
                      {result.interpretation.vibration}
                    </Text>
                  </View>
                </View>

                <View style={styles.numerologyCard}>
                  <Text style={styles.numerologyLabel}>
                    {t('personalCode.result.numerology.title')}
                  </Text>
                  <View style={styles.numerologyRow}>
                    <View style={styles.numerologyItem}>
                      <Text style={styles.numerologyNumber}>
                        {result.numerology.reducedNumber}
                      </Text>
                      <Text style={styles.numerologyText}>
                        {t('personalCode.result.numerology.reducedNumber')}
                      </Text>
                    </View>
                    {result.numerology.masterNumber && (
                      <View style={styles.numerologyItem}>
                        <Text
                          style={[styles.numerologyNumber, styles.masterNumber]}
                        >
                          {result.numerology.masterNumber}
                        </Text>
                        <Text style={styles.numerologyText}>
                          {t('personalCode.result.numerology.masterNumber')}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.numerologyMeaning}>
                    {result.numerology.meaning}
                  </Text>
                </View>
              </LinearGradient>
            </BlurView>

            {/* Interpretation */}
            <View style={styles.interpretationSection}>
              <Text style={styles.interpretationTitle}>
                {t('personalCode.result.interpretation.title')}
              </Text>

              <BlurView intensity={20} style={styles.interpretationCard}>
                <Text style={styles.interpretationSummary}>
                  {result.interpretation.summary}
                </Text>
              </BlurView>

              <BlurView intensity={20} style={styles.interpretationCard}>
                <Text style={styles.interpretationText}>
                  {result.interpretation.detailed}
                </Text>
              </BlurView>

              <BlurView intensity={20} style={styles.interpretationCard}>
                <Text style={styles.interpretationCompatibility}>
                  {result.interpretation.compatibility}
                </Text>
              </BlurView>
            </View>

            {/* Breakdown */}
            <View style={styles.breakdownSection}>
              <Text style={styles.sectionTitle}>
                {t('personalCode.result.breakdown.title')}
              </Text>
              {result.breakdown.map((item, index) => (
                <BlurView
                  key={index}
                  intensity={20}
                  style={styles.breakdownCard}
                >
                  <View style={styles.breakdownHeader}>
                    <View style={styles.digitCircle}>
                      <Text style={styles.digitCircleText}>{item.digit}</Text>
                    </View>
                    <View style={styles.breakdownInfo}>
                      <Text style={styles.breakdownSource}>{item.source}</Text>
                      <Text style={styles.breakdownInfluence}>
                        {item.influence}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.breakdownMeaning}>
                    {item.astrologyMeaning}
                  </Text>
                  <Text style={styles.breakdownNumerology}>
                    {t('personalCode.result.numerology.prefix')}
                    {item.numerologyMeaning}
                  </Text>
                </BlurView>
              ))}
            </View>

            {/* Practical Examples */}
            <View style={styles.examplesSection}>
              <Text style={styles.sectionTitle}>
                {t('personalCode.examples.title')}
              </Text>

              <BlurView intensity={20} style={styles.exampleCard}>
                <View style={styles.exampleHeader}>
                  <Ionicons name="card-outline" size={24} color="#10B981" />
                  <Text style={styles.exampleTitle}>
                    {t('personalCode.examples.fourDigits.title')}
                  </Text>
                </View>
                <Text style={styles.exampleText}>
                  {t('personalCode.examples.fourDigits.text')}
                </Text>
              </BlurView>

              <BlurView intensity={20} style={styles.exampleCard}>
                <View style={styles.exampleHeader}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={24}
                    color="#8B5CF6"
                  />
                  <Text style={styles.exampleTitle}>
                    {t('personalCode.examples.sixDigits.title')}
                  </Text>
                </View>
                <Text style={styles.exampleText}>
                  {t('personalCode.examples.sixDigits.text')}
                </Text>
              </BlurView>

              <BlurView intensity={20} style={styles.exampleCard}>
                <View style={styles.exampleHeader}>
                  <Ionicons name="call-outline" size={24} color="#F59E0B" />
                  <Text style={styles.exampleTitle}>
                    {t('personalCode.examples.sevenPlusDigits.title')}
                  </Text>
                </View>
                <Text style={styles.exampleText}>
                  {t('personalCode.examples.sevenPlusDigits.text')}
                </Text>
              </BlurView>
            </View>

            {/* How to Use */}
            <View style={styles.usageSection}>
              <Text style={styles.sectionTitle}>
                {t('personalCode.usage.title')}
              </Text>

              <BlurView intensity={20} style={styles.usageCard}>
                <View style={styles.usageItem}>
                  <Ionicons name="time-outline" size={20} color="#A78BFA" />
                  <Text style={styles.usageLabel}>
                    {t('personalCode.usage.whenToUse')}
                  </Text>
                </View>
                <Text style={styles.usageText}>
                  {result.interpretation.whenToUse}
                </Text>
              </BlurView>

              {result.interpretation.howToUse.map((instruction, index) => (
                <BlurView key={index} intensity={20} style={styles.usageCard}>
                  <View style={styles.usageItem}>
                    <View style={styles.usageNumber}>
                      <Text style={styles.usageNumberText}>{index + 1}</Text>
                    </View>
                    <Text style={styles.usageText}>{instruction}</Text>
                  </View>
                </BlurView>
              ))}
            </View>
                  </View>
                </ScrollView>
              </Animated.View>

              <LinearGradient
                pointerEvents="none"
                colors={[
                  'rgba(20, 17, 48, 0.88)',
                  'rgba(20, 17, 48, 0.44)',
                  'rgba(20, 17, 48, 0)',
                ]}
                locations={[0, 0.62, 1]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={[styles.topFade, { height: headerHeight + 44 }]}
              />

              <View
                style={[
                  styles.fixedHeader,
                  { paddingTop: headerTopPadding, height: headerHeight },
                ]}
              >
                <TouchableOpacity
                  activeOpacity={1}
                  style={styles.headerCirclePressable}
                  onPress={closeResult}
                >
                  <GradientBorderView
                    colors={DATING_GLASS_BORDER_COLORS}
                    gradientProps={DATING_GLASS_BORDER_GRADIENT}
                    style={styles.headerCircleBorder}
                    contentStyle={[styles.datingGlassContent, styles.backHit]}
                  >
                    <DatingGlassFill />
                    <Ionicons
                      name="chevron-back"
                      size={30}
                      color="#FFFFFF"
                    />
                  </GradientBorderView>
                </TouchableOpacity>

                <GradientBorderView
                  colors={DATING_GLASS_BORDER_COLORS}
                  gradientProps={DATING_GLASS_BORDER_GRADIENT}
                  style={styles.titlePillBorder}
                  contentStyle={[styles.datingGlassContent, styles.titlePill]}
                >
                  <DatingGlassFill />
                  <Animated.Text
                    numberOfLines={1}
                    style={[
                      styles.fixedHeaderTitle,
                      { opacity: headerTitleOpacity },
                    ]}
                  >
                    {t('personalCode.result.codeLabel')}
                  </Animated.Text>
                </GradientBorderView>

                <View style={styles.headerSpacer} />
              </View>
            </View>
          </Modal>
        )}
      </Animated.ScrollView>

      <LinearGradient
        pointerEvents="none"
        colors={[
          'rgba(20, 17, 48, 0.88)',
          'rgba(20, 17, 48, 0.44)',
          'rgba(20, 17, 48, 0)',
        ]}
        locations={[0, 0.62, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[styles.topFade, { height: headerHeight + 44 }]}
      />

      <View
        style={[
          styles.fixedHeader,
          { paddingTop: headerTopPadding, height: headerHeight },
        ]}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.headerCirclePressable}
          onPress={() => navigation.goBack()}
        >
          <GradientBorderView
            colors={DATING_GLASS_BORDER_COLORS}
            gradientProps={DATING_GLASS_BORDER_GRADIENT}
            style={styles.headerCircleBorder}
            contentStyle={[styles.datingGlassContent, styles.backHit]}
          >
            <DatingGlassFill />
            <Ionicons name="chevron-back" size={30} color="#FFFFFF" />
          </GradientBorderView>
        </TouchableOpacity>

        <GradientBorderView
          colors={DATING_GLASS_BORDER_COLORS}
          gradientProps={DATING_GLASS_BORDER_GRADIENT}
          style={styles.titlePillBorder}
          contentStyle={[styles.datingGlassContent, styles.titlePill]}
        >
          <DatingGlassFill />
          <Animated.Text
            numberOfLines={1}
            style={[
              styles.fixedHeaderTitle,
              { opacity: headerTitleOpacity },
            ]}
          >
            {t('personalCode.header.title')}
          </Animated.Text>
        </GradientBorderView>

        <View style={styles.headerSpacer} />
      </View>

      <LinearGradient
        pointerEvents="none"
        colors={[
          'rgba(8, 14, 28, 0)',
          'rgba(8, 14, 28, 0.72)',
          'rgba(8, 14, 28, 0.98)',
        ]}
        locations={[0, 0.48, 1]}
        style={[styles.bottomCtaFade, { height: ctaBottom + 104 }]}
      />

      <Animated.View
        style={[
          styles.fixedCta,
          {
            bottom: ctaBottom,
            transform: [{ translateX: formTranslateX }],
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.86}
          style={[
            styles.generateButton,
            loading && styles.generateButtonDisabled,
          ]}
          onPress={handleGenerate}
          disabled={loading}
        >
          <GradientBorderView
            colors={[
              'rgba(216, 180, 254, 0.86)',
              'rgba(126, 108, 160, 0.42)',
            ]}
            gradientProps={{
              start: { x: 0.5, y: 0 },
              end: { x: 0.5, y: 1 },
            }}
            style={styles.generateButtonBorder}
            contentStyle={styles.generateButtonContent}
          >
            <LinearGradient
              colors={[
                'rgba(126, 108, 160, 0.96)',
                'rgba(96, 63, 142, 0.98)',
                'rgba(62, 32, 104, 0.98)',
              ]}
              locations={[0, 0.52, 1]}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={styles.generateButtonGradient}
            >
              {loading ? (
                <LoadingIndicator size="small" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                  <Text style={styles.generateButtonText}>
                    {t('personalCode.generate.button')}
                  </Text>
                </>
              )}
            </LinearGradient>
          </GradientBorderView>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080E1C',
    overflow: 'hidden',
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.82,
  },
  topFade: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 20,
  },
  headerCirclePressable: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  headerCircleBorder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.1,
  },
  datingGlassContent: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  backHit: {
    width: 45.8,
    height: 45.8,
    borderRadius: 22.9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titlePillBorder: {
    height: 48,
    maxWidth: 220,
    marginHorizontal: 12,
    borderRadius: 24,
    borderWidth: 1.1,
  },
  titlePill: {
    height: 45.8,
    borderRadius: 22.9,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fixedHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '500',
  },
  headerSpacer: {
    width: 48,
    height: 48,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  introCard: {
    borderWidth: 1,
    borderRadius: 18,
    marginBottom: 24,
  },
  introCardSurface: {
    backgroundColor: 'rgba(18, 18, 42, 0.48)',
  },
  introCardBlur: {
    minHeight: 72,
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    overflow: 'hidden',
  },
  headerSubtitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    color: 'rgba(255,255,255,0.7)',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  purposeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  purposeCard: {
    width: '47%',
    aspectRatio: 1.5,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  purposeCardBlur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 18, 42, 0.5)',
  },
  purposeCardActive: {
    backgroundColor: 'rgba(104, 99, 135, 0.48)',
  },
  purposeIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  purposeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A0AEC0',
  },
  purposeLabelActive: {
    color: '#FFFFFF',
  },
  digitCountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  digitButtonTouchable: {
    flex: 1,
    borderRadius: 20,
  },
  digitButtonBorder: {
    borderWidth: 1,
    borderRadius: 20,
  },
  digitButton: {
    minHeight: 40,
    borderRadius: 19,
    backgroundColor: 'rgba(46, 44, 79, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  digitButtonActive: {
    backgroundColor: 'rgba(104, 99, 135, 0.88)',
  },
  digitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#A0AEC0',
  },
  digitButtonTextActive: {
    color: '#FFFFFF',
  },
  digitHint: {
    fontSize: 12,
    color: '#718096',
    marginTop: 8,
    textAlign: 'center',
  },
  generateButton: {
    width: '100%',
    borderRadius: 28,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonBorder: {
    borderWidth: 1.2,
    borderRadius: 28,
  },
  generateButtonContent: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  generateButtonGradient: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  fixedCta: {
    position: 'absolute',
    left: 24,
    right: 24,
    zIndex: 22,
  },
  bottomCtaFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 21,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    marginBottom: 24,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#EF4444',
  },
  resultModalRoot: {
    flex: 1,
  },
  resultScreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#080E1C',
    overflow: 'hidden',
  },
  resultScrollContent: {
    paddingHorizontal: 24,
  },
  resultContainer: {
    gap: 24,
  },
  codeCard: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(124, 119, 153, 0.34)',
    backgroundColor: 'rgba(18, 18, 42, 0.5)',
  },
  codeCardGradient: {
    padding: 18,
  },
  codeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  codeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A78BFA',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#F59E0B',
  },
  codeNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 24,
  },
  codeMetaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  codeMeta: {
    flex: 1,
  },
  codeMetaLabel: {
    fontSize: 12,
    color: '#A0AEC0',
    marginBottom: 4,
  },
  codeMetaValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  energyBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    marginVertical: 6,
    overflow: 'hidden',
  },
  energyBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  numerologyCard: {
    backgroundColor: 'rgba(46, 44, 79, 0.44)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(124, 119, 153, 0.24)',
  },
  numerologyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#A78BFA',
    marginBottom: 12,
  },
  numerologyRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  numerologyItem: {
    flex: 1,
    alignItems: 'center',
  },
  numerologyNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  masterNumber: {
    color: '#F59E0B',
  },
  numerologyText: {
    fontSize: 11,
    color: '#A0AEC0',
  },
  numerologyMeaning: {
    fontSize: 13,
    color: '#CBD5E0',
    textAlign: 'center',
  },
  interpretationSection: {
    gap: 12,
  },
  interpretationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  interpretationCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(124, 119, 153, 0.34)',
    backgroundColor: 'rgba(18, 18, 42, 0.5)',
  },
  interpretationSummary: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  interpretationText: {
    fontSize: 14,
    color: '#CBD5E0',
    lineHeight: 22,
  },
  interpretationCompatibility: {
    fontSize: 14,
    color: '#A78BFA',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  breakdownSection: {
    gap: 12,
  },
  breakdownCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(124, 119, 153, 0.34)',
    backgroundColor: 'rgba(18, 18, 42, 0.5)',
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  digitCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  digitCircleText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  breakdownInfo: {
    flex: 1,
  },
  breakdownSource: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  breakdownInfluence: {
    fontSize: 12,
    color: '#A78BFA',
  },
  breakdownMeaning: {
    fontSize: 13,
    color: '#CBD5E0',
    lineHeight: 20,
    marginBottom: 8,
  },
  breakdownNumerology: {
    fontSize: 12,
    color: '#A0AEC0',
    fontStyle: 'italic',
  },
  usageSection: {
    gap: 12,
  },
  examplesSection: {
    gap: 12,
    marginBottom: 24,
  },
  exampleCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(124, 119, 153, 0.34)',
    backgroundColor: 'rgba(18, 18, 42, 0.5)',
    padding: 16,
  },
  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  exampleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  exampleText: {
    fontSize: 14,
    color: '#CBD5E0',
    lineHeight: 22,
  },
  usageCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(124, 119, 153, 0.34)',
    backgroundColor: 'rgba(18, 18, 42, 0.5)',
  },
  usageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  usageLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#A78BFA',
    marginBottom: 8,
  },
  usageNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  usageNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  usageText: {
    flex: 1,
    fontSize: 14,
    color: '#CBD5E0',
    lineHeight: 20,
  },
});

export default PersonalCodeScreen;
