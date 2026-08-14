import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  Modal,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useSharedValue } from 'react-native-reanimated';
import { CommonActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  userAPI,
  userPhotosAPI,
  userExtendedProfileAPI,
} from '../services/api';
import AstralInput from '../components/shared/AstralInput';
import AstralCityInput from '../components/shared/AstralCityInput';
import AstralDateTimePicker from '../components/shared/DateTimePicker';
import LoadingIndicator from '../components/shared/LoadingIndicator';
import { logger } from '../services/logger';
import type { CityOption } from '../services/api/geo.api';
import { clearHoroscopeScreenCache } from '../services/horoscope-cache';
import {
  clearCachedPrimaryPhoto,
  setCachedPrimaryPhoto,
} from '../services/profile-photo-cache';
import {
  DATING_GLASS_BORDER_COLORS,
  DATING_GLASS_BORDER_GRADIENT,
  DatingGlassFill,
  GradientBorderView,
} from '../components/shared';

const editProfileBackground = require('../../assets/advisor-bg.png');

const SHORT_LIVED_SIGNED_URL_TTL_MS = 14 * 60 * 1000;

interface Photo {
  id: string;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
}

interface Interest {
  id: string;
  label: string;
  icon: string;
  category: 'primary' | 'secondary';
}

type ProfileChipProps = {
  disabled?: boolean;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  selected: boolean;
};

const ProfileChip: React.FC<ProfileChipProps> = ({
  disabled = false,
  icon,
  label,
  onPress,
  selected,
}) => (
  <TouchableOpacity
    activeOpacity={1}
    disabled={disabled}
    onPress={onPress}
    style={[styles.interestChipPressable, disabled && styles.interestChipDisabled]}
  >
    <GradientBorderView
      colors={
        selected
          ? ['rgba(255,255,255,0.64)', 'rgba(124,119,153,0.24)']
          : ['rgba(124,119,153,0.7)', 'rgba(124,119,153,0.05)']
      }
      gradientProps={{
        locations: [0.29, 1],
        start: { x: 0.49, y: 0 },
        end: { x: 0.51, y: 1 },
      }}
      style={styles.interestChipBorder}
      contentStyle={styles.interestChipContent}
    >
      <BlurView
        intensity={selected ? 28 : 15}
        tint="dark"
        experimentalBlurMethod="dimezisBlurView"
        style={[
          styles.interestChipBlur,
          selected && styles.interestChipBlurSelected,
        ]}
      >
        <Ionicons name={icon} size={16} color="#FFFFFF" />
        <Text
          style={[
            styles.interestText,
            selected && styles.interestTextSelected,
          ]}
        >
          {label}
        </Text>
      </BlurView>
    </GradientBorderView>
  </TouchableOpacity>
);

const INTERESTS_CONFIG: Array<{
  id: string;
  icon: string;
  category: 'primary' | 'secondary';
}> = [
  { id: 'travel', icon: 'airplane', category: 'primary' },
  { id: 'music', icon: 'musical-notes', category: 'primary' },
  { id: 'sport', icon: 'fitness', category: 'primary' },
  { id: 'reading', icon: 'book', category: 'primary' },
  { id: 'movies', icon: 'film', category: 'primary' },
  { id: 'cooking', icon: 'restaurant', category: 'primary' },
  { id: 'art', icon: 'color-palette', category: 'primary' },
  { id: 'photography', icon: 'camera', category: 'primary' },
  { id: 'yoga', icon: 'body', category: 'primary' },
  { id: 'meditation', icon: 'sparkles', category: 'primary' },
  { id: 'hiking', icon: 'trail-sign', category: 'secondary' },
  { id: 'swimming', icon: 'water', category: 'secondary' },
  { id: 'dancing', icon: 'person', category: 'secondary' },
  { id: 'gaming', icon: 'game-controller', category: 'secondary' },
  { id: 'pets', icon: 'paw', category: 'secondary' },
  { id: 'wine', icon: 'wine', category: 'secondary' },
  { id: 'coffee', icon: 'cafe', category: 'secondary' },
  { id: 'fashion', icon: 'shirt', category: 'secondary' },
  { id: 'tech', icon: 'hardware-chip', category: 'secondary' },
  { id: 'nature', icon: 'leaf', category: 'secondary' },
  { id: 'astronomy', icon: 'telescope', category: 'secondary' },
  { id: 'astrology', icon: 'moon', category: 'secondary' },
  { id: 'volunteering', icon: 'heart', category: 'secondary' },
  { id: 'languages', icon: 'language', category: 'secondary' },
  { id: 'entrepreneurship', icon: 'briefcase', category: 'secondary' },
  { id: 'theater', icon: 'ticket', category: 'secondary' },
  { id: 'concerts', icon: 'mic', category: 'secondary' },
  { id: 'festivals', icon: 'balloon', category: 'secondary' },
  { id: 'gardening', icon: 'flower', category: 'secondary' },
  { id: 'cycling', icon: 'bicycle', category: 'secondary' },
];

const EditProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const headerTopPadding = insets.top + 10;
  const headerHeight = headerTopPadding + 48;
  const saveButtonBottom = Math.max(16, insets.bottom + 12);
  const [profileId, setProfileId] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [showAllInterests, setShowAllInterests] = useState(false);
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  const [, setSelectedBirthPlaceCity] = useState<CityOption | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    birthTime: '',
    birthPlace: '',
  });
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>('');
  const [lookingFor, setLookingFor] = useState<
    'relationship' | 'friendship' | 'communication' | 'somethingNew' | ''
  >('');
  const [lookingForGender, setLookingForGender] = useState<
    'male' | 'female' | 'other' | ''
  >('');

  const animationValue = useSharedValue(1);
  const initialSnapshotRef = useRef<string | null>(null);
  const pendingNavActionRef = useRef<any>(null);

  // Prevent "unsaved changes" prompt right after successful save -> goBack()
  const skipUnsavedPromptRef = useRef(false);

  // Create translated interests array
  const INTERESTS: Interest[] = React.useMemo(
    () =>
      INTERESTS_CONFIG.map((config) => ({
        ...config,
        label: t(`editProfile.interests.${config.id}`),
      })),
    [t]
  );

  useEffect(() => {
    loadData();
  }, []);

  const buildSnapshot = ({
    formValues,
    bioValue,
    cityValue,
    genderValue,
    lookingForValue,
    lookingForGenderValue,
    interestsValue,
  }: {
    formValues: typeof formData;
    bioValue: string;
    cityValue: string;
    genderValue: typeof gender;
    lookingForValue: typeof lookingFor;
    lookingForGenderValue: typeof lookingForGender;
    interestsValue: string[];
  }) =>
    JSON.stringify({
      formValues: {
        name: formValues.name.trim(),
        birthDate: formValues.birthDate.trim(),
        birthTime: formValues.birthTime.trim(),
        birthPlace: formValues.birthPlace.trim(),
      },
      bioValue: bioValue.trim(),
      cityValue: cityValue.trim(),
      genderValue,
      lookingForValue,
      lookingForGenderValue,
      interestsValue: [...interestsValue].sort(),
    });

  const currentSnapshot = useMemo(
    () =>
      buildSnapshot({
        formValues: formData,
        bioValue: bio,
        cityValue: city,
        genderValue: gender,
        lookingForValue: lookingFor,
        lookingForGenderValue: lookingForGender,
        interestsValue: selectedInterests,
      }),
    [
      formData,
      bio,
      city,
      gender,
      lookingFor,
      lookingForGender,
      selectedInterests,
    ]
  );

  const hasUnsavedChanges = useMemo(() => {
    if (!initialSnapshotRef.current) return false;
    return currentSnapshot !== initialSnapshotRef.current;
  }, [currentSnapshot]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event: any) => {
      if (skipUnsavedPromptRef.current) {
        // one-shot skip (only for the navigation right after save)
        skipUnsavedPromptRef.current = false;
        return;
      }

      if (saving || !hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      pendingNavActionRef.current = event.data.action;
      setShowUnsavedModal(true);
    });

    return unsubscribe;
  }, [navigation, hasUnsavedChanges, saving]);

  const handleBirthPlaceChange = useCallback((text: string) => {
    setSelectedBirthPlaceCity(null);
    setFormData((prev) => ({ ...prev, birthPlace: text }));
  }, []);

  const handleBirthPlaceSelect = useCallback((selected: CityOption) => {
    setSelectedBirthPlaceCity(selected);
    // AstralCityInput уже вызовет onChangeText(display), тут дополнительно ничего не нужно.
    // Но сохраняем selectedCity на будущее (если понадобится хранить координаты/таймзону).
  }, []);

  const handleCityChange = useCallback((text: string) => {
    setCity(text);
  }, []);

  const handleCitySelect = useCallback((_selected: CityOption) => {
    // Сейчас в extended-profile храним только строку `city`, поэтому тут достаточно setCity через onChangeText().
    // Но оставляем хук на будущее (если понадобится сохранять координаты/таймзону).
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profileData, photosData, userProfile] = await Promise.all([
        userAPI.getProfile(),
        userPhotosAPI.listPhotos().catch((error) => {
          logger.error('Error loading photos', error);
          return [];
        }),
        userExtendedProfileAPI.getUserProfile().catch(() => null),
      ]);
      const nextFormData = {
        name: profileData.name || '',
        birthDate: profileData.birthDate || '',
        birthTime: profileData.birthTime || '',
        birthPlace: profileData.birthPlace || '',
      };
      setProfileId(profileData.id || '');
      setFormData(nextFormData);

      setPhotos(
        photosData.map((p) => ({
          id: p.id,
          url: p.url || '',
          isPrimary: p.isPrimary,
          sortOrder: 0,
        }))
      );

      // Load profile data (bio, interests) - тоже оборачиваем
      let nextBio = '';
      let nextCity = '';
      let nextSelectedInterests: string[] = [];
      let nextGender: typeof gender = '';
      let nextLookingFor: typeof lookingFor = '';
      let nextLookingForGender: typeof lookingForGender = '';
      try {
        if (!userProfile) {
          throw new Error('no extended profile');
        }
        nextBio = userProfile.bio || '';
        nextCity = userProfile.city || '';
        nextSelectedInterests = userProfile.preferences?.interests || [];
        nextGender = (userProfile.gender as any) || '';

        // ✅ New DB columns (preferred)
        // ✅ Back-compat fallback to old jsonb preferences fields (if old data exists)
        nextLookingFor =
          (userProfile.looking_for as any) ||
          (userProfile.preferences?.lookingFor as any) ||
          '';
        nextLookingForGender =
          (userProfile.looking_for_gender as any) ||
          (userProfile.preferences?.lookingForGender as any) ||
          '';

        setBio(nextBio);
        setCity(nextCity);
        setSelectedInterests(nextSelectedInterests);
        setGender(nextGender);
        setLookingFor(nextLookingFor);
        setLookingForGender(nextLookingForGender);
      } catch (err) {
        logger.info('No extended profile yet');
      }

      initialSnapshotRef.current = buildSnapshot({
        formValues: nextFormData,
        bioValue: nextBio,
        cityValue: nextCity,
        genderValue: nextGender,
        lookingForValue: nextLookingFor,
        lookingForGenderValue: nextLookingForGender,
        interestsValue: nextSelectedInterests,
      });
    } catch (error) {
      logger.error('Error loading data', error);
      Alert.alert(
        t('editProfile.alerts.loadFailed.title'),
        t('editProfile.alerts.loadFailed.message')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddPhoto = async () => {
    if (photos.length >= 20) {
      Alert.alert(
        t('editProfile.alerts.photoLimit.title'),
        t('editProfile.alerts.photoLimit.message')
      );
      return;
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        t('editProfile.alerts.galleryPermission.title'),
        t('editProfile.alerts.galleryPermission.message')
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      await uploadPhoto(result.assets[0].uri);
    }
  };

  const uploadPhoto = async (uri: string) => {
    try {
      setUploadingPhoto(true);
      logger.info('Starting upload...');

      // 1. Get upload URL
      const { path, signedUrl } = await userPhotosAPI.getUploadUrl({
        ext: 'jpg',
      });
      logger.info('Got signed URL', path);

      // 2. Upload file
      const response = await fetch(uri);
      const blob = await response.blob();

      await userPhotosAPI.uploadToSignedUrl(signedUrl, blob, 'image/jpeg');
      logger.info('Uploaded to storage');

      // 3. Confirm upload
      const confirmedPhoto = await userPhotosAPI.confirmPhoto(path);
      logger.info('Confirmed in DB');

      // 4. Update local gallery immediately instead of refetching everything
      setPhotos((current) => {
        const nextPhoto: Photo = {
          id: confirmedPhoto.id,
          url: confirmedPhoto.url || '',
          isPrimary: confirmedPhoto.isPrimary,
          sortOrder: 0,
        };

        if (confirmedPhoto.isPrimary) {
          return [
            nextPhoto,
            ...current.map((photo) => ({ ...photo, isPrimary: false })),
          ];
        }

        return [nextPhoto, ...current];
      });

      if (confirmedPhoto.isPrimary && profileId && confirmedPhoto.url) {
        await setCachedPrimaryPhoto(profileId, {
          url: confirmedPhoto.url,
          path: confirmedPhoto.path,
          expiresAt: new Date(
            Date.now() + SHORT_LIVED_SIGNED_URL_TTL_MS
          ).toISOString(),
        });
      }

      Alert.alert(
        t('editProfile.alerts.photoAdded.title'),
        t('editProfile.alerts.photoAdded.message')
      );
    } catch (error) {
      logger.error('Error uploading photo', error);
      Alert.alert(
        t('editProfile.alerts.photoUploadFailed.title'),
        t('editProfile.alerts.photoUploadFailed.message')
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    Alert.alert(
      t('editProfile.alerts.deletePhoto.title'),
      t('editProfile.alerts.deletePhoto.message'),
      [
        { text: t('common.buttons.cancel'), style: 'cancel' },
        {
          text: t('editProfile.buttons.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const deletedPhoto = photos.find((p) => p.id === photoId);
              await userPhotosAPI.deletePhoto(photoId);
              setPhotos(photos.filter((p) => p.id !== photoId));

              if (deletedPhoto?.isPrimary && profileId) {
                await clearCachedPrimaryPhoto(profileId);
              }

              Alert.alert(
                t('editProfile.alerts.photoDeleted.title'),
                t('editProfile.alerts.photoDeleted.message')
              );
            } catch (error) {
              Alert.alert(
                t('editProfile.alerts.photoDeleteFailed.title'),
                t('editProfile.alerts.photoDeleteFailed.message')
              );
            }
          },
        },
      ]
    );
  };

  const handleSetPrimaryPhoto = async (photoId: string) => {
    try {
      await userPhotosAPI.setPrimary(photoId);
      setPhotos(photos.map((p) => ({ ...p, isPrimary: p.id === photoId })));

      const nextPrimaryPhoto = photos.find((p) => p.id === photoId);
      if (profileId && nextPrimaryPhoto?.url) {
        await setCachedPrimaryPhoto(profileId, {
          url: nextPrimaryPhoto.url,
          path: null,
          expiresAt: new Date(
            Date.now() + SHORT_LIVED_SIGNED_URL_TTL_MS
          ).toISOString(),
        });
      }

      Alert.alert(
        t('editProfile.alerts.primaryPhotoSet.title'),
        t('editProfile.alerts.primaryPhotoSet.message')
      );
    } catch (error) {
      Alert.alert(
        t('editProfile.alerts.primaryPhotoFailed.title'),
        t('editProfile.alerts.primaryPhotoFailed.message')
      );
    }
  };

  const toggleInterest = (interestId: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interestId)
        ? prev.filter((id) => id !== interestId)
        : [...prev, interestId]
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (!formData.name?.trim()) {
        Alert.alert(
          t('editProfile.alerts.nameRequired.title'),
          t('editProfile.alerts.nameRequired.message')
        );
        return;
      }

      if (!formData.birthDate) {
        Alert.alert(
          t('editProfile.alerts.birthDateRequired.title'),
          t('editProfile.alerts.birthDateRequired.message')
        );
        return;
      }

      // Update basic profile
      await userAPI.updateProfile(formData);

      // Update extended profile (bio, city, gender, interests)
      // ✅ looking_for / looking_for_gender are now real DB columns (public.user_profiles)
      const extPayload: any = {
        bio,
        preferences: {
          interests: selectedInterests,
        },
      };

      if (city?.trim()) extPayload.city = city.trim();
      if (gender) extPayload.gender = gender;

      if (lookingFor) extPayload.looking_for = lookingFor;
      if (lookingForGender) extPayload.looking_for_gender = lookingForGender;

      await userExtendedProfileAPI.updateUserProfile(extPayload);
      await clearHoroscopeScreenCache();

      // Normalize values (trim) to avoid snapshot mismatch after save
      const savedFormData = {
        ...formData,
        name: formData.name.trim(),
        birthDate: formData.birthDate.trim(),
        birthTime: formData.birthTime.trim(),
        birthPlace: formData.birthPlace.trim(),
      };
      const savedBio = bio.trim();
      const savedCity = city.trim();

      setFormData(savedFormData);
      setBio(savedBio);
      setCity(savedCity);

      initialSnapshotRef.current = buildSnapshot({
        formValues: savedFormData,
        bioValue: savedBio,
        cityValue: savedCity,
        genderValue: gender,
        lookingForValue: lookingFor,
        lookingForGenderValue: lookingForGender,
        interestsValue: selectedInterests,
      });

      Alert.alert(
        t('editProfile.alerts.profileSaved.title'),
        t('editProfile.alerts.profileSaved.message'),
        [
          {
            text: t('common.buttons.ok'),
            onPress: () => {
              skipUnsavedPromptRef.current = true;
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error) {
      logger.error('Error saving profile', error);
      Alert.alert(
        t('editProfile.alerts.saveFailed.title'),
        t('editProfile.alerts.saveFailed.message')
      );
    } finally {
      setSaving(false);
    }
  };

  const handleBackPress = () => {
    if (!hasUnsavedChanges) {
      navigation.goBack();
      return;
    }

    pendingNavActionRef.current = CommonActions.goBack();
    setShowUnsavedModal(true);
  };

  const handleDiscardChanges = () => {
    setShowUnsavedModal(false);
    const action = pendingNavActionRef.current || CommonActions.goBack();
    pendingNavActionRef.current = null;
    navigation.dispatch(action);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Image
          source={editProfileBackground}
          resizeMode="cover"
          style={styles.backgroundImage}
        />
        <View style={styles.loadingContainer}>
          <LoadingIndicator />
        </View>
      </View>
    );
  }

  const displayedInterests = showAllInterests
    ? INTERESTS
    : INTERESTS.filter((i) => i.category === 'primary');

  const isSaveDisabled = saving || !hasUnsavedChanges;

  return (
    <View style={styles.container}>
      <Image
        source={editProfileBackground}
        resizeMode="cover"
        style={styles.backgroundImage}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: headerHeight + 24,
            paddingBottom: saveButtonBottom + 112,
          },
        ]}
      >
        {/* Photos Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('editProfile.sections.photos')}
          </Text>
          <Text style={styles.sectionSubtitle}>
            {20 - photos.length}{' '}
            {t('editProfile.sections.photos').toLowerCase()}
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.photosContainer}
          >
            {photos.map((photo) => (
              <View key={photo.id} style={styles.photoCard}>
                <Image source={{ uri: photo.url }} style={styles.photoImage} />

                {photo.isPrimary && (
                  <View style={styles.primaryBadge}>
                    <Ionicons name="star" size={12} color="#FFD700" />
                    <Text style={styles.primaryText}>
                      {t('common.buttons.primary')}
                    </Text>
                  </View>
                )}

                <View style={styles.photoActions}>
                  {!photo.isPrimary && (
                    <TouchableOpacity
                      style={styles.photoActionButton}
                      onPress={() => handleSetPrimaryPhoto(photo.id)}
                    >
                      <Ionicons name="star-outline" size={20} color="#fff" />
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[styles.photoActionButton, styles.deleteButton]}
                    onPress={() => handleDeletePhoto(photo.id)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {photos.length < 20 && (
              <TouchableOpacity
                style={styles.addPhotoCard}
                onPress={handleAddPhoto}
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <LoadingIndicator size="small" />
                ) : (
                  <>
                    <Ionicons name="add" size={32} color="#8B5CF6" />
                    <Text style={styles.addPhotoText}>
                      {t('editProfile.buttons.addPhoto')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('editProfile.sections.basicInfo')}
          </Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {t('editProfile.fields.name')}
            </Text>
            <AstralInput
              value={formData.name}
              onChangeText={(text) => setFormData({ ...formData, name: text })}
              placeholder={t('editProfile.placeholders.name')}
              icon="person-outline"
              animationValue={animationValue}
            />
          </View>

          <AstralDateTimePicker
            placeholder={t('editProfile.fields.birthDate')}
            value={formData.birthDate}
            onChangeText={(text) =>
              setFormData({ ...formData, birthDate: text })
            }
            icon="calendar"
            mode="date"
            required
            animationValue={animationValue}
          />

          <AstralDateTimePicker
            placeholder={t('editProfile.placeholders.birthTime')}
            value={formData.birthTime}
            onChangeText={(text) =>
              setFormData({ ...formData, birthTime: text })
            }
            icon="time"
            mode="time"
            animationValue={animationValue}
          />

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {t('editProfile.fields.birthPlace')}
            </Text>

            <AstralCityInput
              value={formData.birthPlace}
              onChangeText={handleBirthPlaceChange}
              onCitySelect={handleBirthPlaceSelect}
              placeholder={t('editProfile.placeholders.birthPlace')}
              icon="location-outline"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>
              {t('editProfile.fields.city')}
            </Text>

            <AstralCityInput
              value={city}
              onChangeText={handleCityChange}
              onCitySelect={handleCitySelect}
              placeholder={t('editProfile.placeholders.city')}
              icon="home-outline"
            />
          </View>
        </View>

        {/* Gender */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('editProfile.fields.gender')}
          </Text>
          <View style={styles.interestsGrid}>
            {[
              { key: 'female', icon: 'female' as const },
              { key: 'male', icon: 'male' as const },
              { key: 'other', icon: 'male-female' as const },
            ].map((g) => {
              const isSelected = gender === (g.key as any);
              return (
                <ProfileChip
                  key={g.key}
                  selected={isSelected}
                  icon={g.icon}
                  label={t(`editProfile.gender.${g.key}`)}
                  onPress={() => setGender(g.key as any)}
                />
              );
            })}
          </View>
        </View>
        {/* Looking For */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('editProfile.fields.lookingFor')}
          </Text>
          <View style={styles.interestsGrid}>
            {[
              { key: 'relationship', icon: 'heart' as const },
              { key: 'friendship', icon: 'people' as const },
              { key: 'communication', icon: 'chatbubbles' as const },
              { key: 'somethingNew', icon: 'sparkles' as const },
            ].map((option) => {
              const isSelected = lookingFor === option.key;
              return (
                <ProfileChip
                  key={option.key}
                  selected={isSelected}
                  icon={option.icon}
                  label={t(`dating.lookingFor.${option.key}`)}
                  onPress={() => setLookingFor(option.key as any)}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('editProfile.fields.lookingForGender')}
          </Text>
          <View style={styles.interestsGrid}>
            {[
              { key: 'female', icon: 'female' as const },
              { key: 'male', icon: 'male' as const },
              { key: 'other', icon: 'male-female' as const },
            ].map((option) => {
              const isSelected = lookingForGender === option.key;
              return (
                <ProfileChip
                  key={option.key}
                  selected={isSelected}
                  icon={option.icon}
                  label={t(`editProfile.gender.${option.key}`)}
                  onPress={() => setLookingForGender(option.key as any)}
                />
              );
            })}
          </View>
        </View>
        {/* Bio */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('editProfile.sections.about')}
          </Text>
          <View style={styles.textAreaContainer}>
            <TextInput
              style={styles.textArea}
              value={bio}
              onChangeText={setBio}
              placeholder={t('editProfile.placeholders.bio')}
              placeholderTextColor="#666"
              multiline
              numberOfLines={6}
              maxLength={500}
            />
            <Text style={styles.charCounter}>{bio.length}/500</Text>
          </View>
        </View>

        {/* Interests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('editProfile.sections.interests')}
          </Text>
          <Text style={styles.sectionSubtitle}>
            {t('common.selectUpTo', { count: 10 })}
          </Text>

          <View style={styles.interestsGrid}>
            {displayedInterests.map((interest) => {
              const isSelected = selectedInterests.includes(interest.id);
              return (
                <ProfileChip
                  key={interest.id}
                  selected={isSelected}
                  icon={interest.icon as React.ComponentProps<typeof Ionicons>['name']}
                  label={interest.label}
                  onPress={() => toggleInterest(interest.id)}
                  disabled={!isSelected && selectedInterests.length >= 10}
                />
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.showMoreButton}
            onPress={() => setShowAllInterests(!showAllInterests)}
          >
            <Text style={styles.showMoreText}>
              {showAllInterests
                ? t('editProfile.buttons.showLess')
                : t('editProfile.buttons.showMore')}
            </Text>
            <Ionicons
              name={showAllInterests ? 'chevron-up' : 'chevron-down'}
              size={20}
              color="#D8B4FE"
            />
          </TouchableOpacity>
        </View>
      </ScrollView>

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
          onPress={handleBackPress}
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
          <Text numberOfLines={1} style={styles.fixedHeaderTitle}>
            {t('editProfile.title')}
          </Text>
        </GradientBorderView>

        <View style={styles.headerSpacer} />
      </View>

      <LinearGradient
        pointerEvents="none"
        colors={[
          'rgba(8, 14, 28, 0)',
          'rgba(8, 14, 28, 0.42)',
          'rgba(8, 14, 28, 0.78)',
        ]}
        locations={[0, 0.48, 1]}
        style={[styles.bottomFade, { height: saveButtonBottom + 104 }]}
      />

      <View style={[styles.bottomBar, { bottom: saveButtonBottom }]}>
        <TouchableOpacity
          style={[
            styles.saveButton,
            isSaveDisabled && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={isSaveDisabled}
          activeOpacity={1}
        >
          <BlurView
            pointerEvents="none"
            intensity={72}
            tint="dark"
            experimentalBlurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          />
          <View pointerEvents="none" style={styles.saveButtonTint} />
          <View style={styles.saveButtonInner}>
            {saving ? (
              <LoadingIndicator size="small" />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>
                  {t('editProfile.buttons.save')}
                </Text>
              </>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <Modal transparent animationType="fade" visible={showUnsavedModal}>
        <Pressable
          style={styles.unsavedOverlay}
          onPress={() => setShowUnsavedModal(false)}
        >
          <Pressable style={styles.unsavedModal} onPress={() => null}>
            <Text style={styles.unsavedTitle}>
              {t('editProfile.unsaved.title')}
            </Text>
            <Text style={styles.unsavedMessage}>
              {t('editProfile.unsaved.message')}
            </Text>
            <View style={styles.unsavedActions}>
              <TouchableOpacity
                style={[styles.unsavedButton, styles.unsavedDiscardButton]}
                onPress={handleDiscardChanges}
              >
                <Text style={styles.unsavedDiscardText}>
                  {t('editProfile.unsaved.discard')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.unsavedButton, styles.unsavedSaveButton]}
                onPress={() => {
                  setShowUnsavedModal(false);
                  handleSave();
                }}
              >
                <Text style={styles.unsavedSaveText}>
                  {t('editProfile.unsaved.save')}
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
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
    justifyContent: 'center',
    alignItems: 'center',
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
  section: {
    padding: 18,
    marginBottom: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(124, 119, 153, 0.34)',
    backgroundColor: 'rgba(18, 18, 42, 0.5)',
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.62)',
    marginBottom: 16,
  },
  photosContainer: {
    paddingVertical: 8,
  },
  photoCard: {
    width: 120,
    height: 160,
    marginRight: 12,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: 'rgba(18, 18, 42, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(124, 119, 153, 0.44)',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  primaryBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  primaryText: {
    color: '#FFD700',
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  photoActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 8,
  },
  photoActionButton: {
    padding: 4,
  },
  deleteButton: {
    opacity: 0.8,
  },
  addPhotoCard: {
    width: 120,
    height: 160,
    borderRadius: 15,
    backgroundColor: 'rgba(46, 44, 79, 0.42)',
    borderWidth: 1,
    borderColor: 'rgba(216, 180, 254, 0.34)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    color: '#8B5CF6',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.72)',
    marginBottom: 8,
  },
  textAreaContainer: {
    position: 'relative',
  },
  textArea: {
    backgroundColor: 'rgba(46, 44, 79, 0.48)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(124, 119, 153, 0.42)',
    padding: 16,
    color: '#fff',
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  charCounter: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    color: '#666',
    fontSize: 12,
  },
  interestsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  interestChipPressable: {
    margin: 4,
    borderRadius: 24,
    overflow: 'hidden',
  },
  interestChipDisabled: {
    opacity: 0.38,
  },
  interestChipBorder: {
    borderWidth: 1,
    borderRadius: 24,
  },
  interestChipContent: {
    borderRadius: 23,
    overflow: 'hidden',
  },
  interestChipBlur: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  interestChipBlurSelected: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  interestText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    lineHeight: 16,
    fontWeight: '500',
    letterSpacing: -0.4,
  },
  interestTextSelected: {
    color: '#fff',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 40,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(46, 44, 79, 0.42)',
    borderWidth: 1,
    borderColor: 'rgba(124, 119, 153, 0.3)',
  },
  showMoreText: {
    color: '#D8B4FE',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  bottomBar: {
    position: 'absolute',
    left: 24,
    right: 24,
    zIndex: 22,
  },
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 21,
  },
  saveButton: {
    width: '100%',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.34)',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.48,
  },
  saveButtonTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8,14,28,0.12)',
  },
  saveButtonInner: {
    minHeight: 54,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  unsavedOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 6, 20, 0.76)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  unsavedModal: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#17152B',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(216, 180, 254, 0.34)',
  },
  unsavedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  unsavedMessage: {
    fontSize: 14,
    color: '#D1D5DB',
    marginBottom: 20,
  },
  unsavedActions: {
    flexDirection: 'row',
    gap: 12,
  },
  unsavedButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  unsavedDiscardButton: {
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  unsavedSaveButton: {
    backgroundColor: '#8B5CF6',
  },
  unsavedDiscardText: {
    color: '#C4B5FD',
    fontSize: 14,
    fontWeight: '600',
  },
  unsavedSaveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default EditProfileScreen;
