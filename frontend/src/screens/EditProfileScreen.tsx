import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useTranslation } from 'react-i18next';
import Animated, { useSharedValue } from 'react-native-reanimated';
import {
  userAPI,
  userPhotosAPI,
  userExtendedProfileAPI,
} from '../services/api';
import { UserProfile } from '../types';
import AstralInput from '../components/shared/AstralInput';
import AstralDateTimePicker from '../components/shared/DateTimePicker';
import CosmicBackground from '../components/shared/CosmicBackground';
import LoadingIndicator from '../components/shared/LoadingIndicator';
import { logger } from '../services/logger';

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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [showAllInterests, setShowAllInterests] = useState(false);
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

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

  const loadData = async () => {
    try {
      setLoading(true);
      const profileData = await userAPI.getProfile();
      setProfile(profileData);

      setFormData({
        name: profileData.name || '',
        birthDate: profileData.birthDate || '',
        birthTime: profileData.birthTime || '',
        birthPlace: profileData.birthPlace || '',
      });

      // Load photos - оборачиваем в try-catch
      try {
        const photosData = await userPhotosAPI.listPhotos();
        logger.info('Photos loaded', photosData);
        setPhotos(
          photosData.map((p) => ({
            id: p.id,
            url: p.url || '',
            isPrimary: p.isPrimary,
            sortOrder: 0,
          }))
        );
      } catch (photoError) {
        logger.error('Error loading photos', photoError);
        // Не прерываем загрузку, просто оставляем photos пустым
      }

      // Load profile data (bio, interests) - тоже оборачиваем
      try {
        const userProfile = await userExtendedProfileAPI.getUserProfile();
        setBio(userProfile.bio || '');
        setCity(userProfile.city || '');
        setSelectedInterests(userProfile.preferences?.interests || []);
        setGender((userProfile.gender as any) || '');
        setLookingFor(userProfile.preferences?.lookingFor || '');
        setLookingForGender(userProfile.preferences?.lookingForGender || '');
      } catch (err) {
        logger.info('No extended profile yet');
      }
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
      await userPhotosAPI.confirmPhoto(path);
      logger.info('Confirmed in DB');

      // 4. Reload photos
      const photosData = await userPhotosAPI.listPhotos();
      setPhotos(
        photosData.map((p) => ({
          id: p.id,
          url: p.url || '',
          isPrimary: p.isPrimary,
          sortOrder: 0,
        }))
      );

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
              await userPhotosAPI.deletePhoto(photoId);
              setPhotos(photos.filter((p) => p.id !== photoId));
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

  const handleGetCurrentLocation = async () => {
    try {
      setGettingLocation(true);

      // 1. Запросить разрешения
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('editProfile.alerts.locationPermission.title'),
          t('editProfile.alerts.locationPermission.message')
        );
        return;
      }

      // 2. Получить текущие координаты
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      // 3. Обратное геокодирование (координаты -> адрес)
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      if (address) {
        // Формируем читаемый адрес
        const parts = [];
        if (address.city) parts.push(address.city);
        if (address.region && address.region !== address.city) {
          parts.push(address.region);
        }
        if (address.country) parts.push(address.country);

        const locationString = parts.join(', ');
        setCity(locationString);

        Alert.alert(
          t('editProfile.alerts.locationFound.title'),
          t('editProfile.alerts.locationFound.message', {
            location: locationString,
          })
        );
      } else {
        Alert.alert(
          t('editProfile.alerts.locationNotFound.title'),
          t('editProfile.alerts.locationNotFound.message')
        );
      }
    } catch (error) {
      logger.error('Geolocation error', error);
      Alert.alert(
        t('editProfile.alerts.locationError.title'),
        t('editProfile.alerts.locationError.message')
      );
    } finally {
      setGettingLocation(false);
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
      const extPayload: any = {
        bio,
        preferences: {
          interests: selectedInterests,
        },
      };
      if (city?.trim()) extPayload.city = city.trim();
      if (gender) extPayload.gender = gender;
      if (lookingFor) {
        extPayload.preferences.lookingFor = lookingFor;
      }
      if (lookingForGender) {
        extPayload.preferences.lookingForGender = lookingForGender;
      }
      await userExtendedProfileAPI.updateUserProfile(extPayload);

      Alert.alert(
        t('editProfile.alerts.profileSaved.title'),
        t('editProfile.alerts.profileSaved.message'),
        [{ text: t('common.buttons.ok'), onPress: () => navigation.goBack() }]
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

  if (loading) {
    return (
      <View style={styles.container}>
        <CosmicBackground />
        <LoadingIndicator />
      </View>
    );
  }

  const displayedInterests = showAllInterests
    ? INTERESTS
    : INTERESTS.filter((i) => i.category === 'primary');

  return (
    <View style={styles.container}>
      <CosmicBackground />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>{t('editProfile.title')}</Text>
          <View style={styles.placeholder} />
        </View>

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
            {photos.map((photo, index) => (
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
                  <ActivityIndicator color="#8B5CF6" />
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
            <AstralInput
              value={formData.birthPlace}
              onChangeText={(text) =>
                setFormData({ ...formData, birthPlace: text })
              }
              placeholder={t('editProfile.placeholders.birthPlace')}
              icon="location-outline"
              animationValue={animationValue}
            />
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.locationHeader}>
              <Text style={styles.inputLabel}>
                {t('editProfile.fields.city')}
              </Text>
              <TouchableOpacity
                style={styles.locationButton}
                onPress={handleGetCurrentLocation}
                disabled={gettingLocation}
              >
                {gettingLocation ? (
                  <ActivityIndicator size="small" color="#8B5CF6" />
                ) : (
                  <Ionicons name="locate" size={20} color="#8B5CF6" />
                )}
              </TouchableOpacity>
            </View>
            <AstralInput
              value={city}
              onChangeText={setCity}
              placeholder={t('editProfile.placeholders.city')}
              icon="home-outline"
              animationValue={animationValue}
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
                <TouchableOpacity
                  key={g.key}
                  style={[
                    styles.interestChip,
                    isSelected && styles.interestChipSelected,
                  ]}
                  onPress={() => setGender(g.key as any)}
                >
                  <Ionicons
                    name={g.icon as any}
                    size={18}
                    color={isSelected ? '#fff' : '#8B5CF6'}
                  />
                  <Text
                    style={[
                      styles.interestText,
                      isSelected && styles.interestTextSelected,
                    ]}
                  >
                    {t(`editProfile.gender.${g.key}`)}
                  </Text>
                </TouchableOpacity>
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
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.interestChip,
                    isSelected && styles.interestChipSelected,
                  ]}
                  onPress={() => setLookingFor(option.key as any)}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={18}
                    color={isSelected ? '#fff' : '#8B5CF6'}
                  />
                  <Text
                    style={[
                      styles.interestText,
                      isSelected && styles.interestTextSelected,
                    ]}
                  >
                    {t(`dating.lookingFor.${option.key}`)}
                  </Text>
                </TouchableOpacity>
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
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.interestChip,
                    isSelected && styles.interestChipSelected,
                  ]}
                  onPress={() => setLookingForGender(option.key as any)}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={18}
                    color={isSelected ? '#fff' : '#8B5CF6'}
                  />
                  <Text
                    style={[
                      styles.interestText,
                      isSelected && styles.interestTextSelected,
                    ]}
                  >
                    {t(`editProfile.gender.${option.key}`)}
                  </Text>
                </TouchableOpacity>
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
                <TouchableOpacity
                  key={interest.id}
                  style={[
                    styles.interestChip,
                    isSelected && styles.interestChipSelected,
                  ]}
                  onPress={() => toggleInterest(interest.id)}
                  disabled={!isSelected && selectedInterests.length >= 10}
                >
                  <Ionicons
                    name={interest.icon as any}
                    size={18}
                    color={isSelected ? '#fff' : '#8B5CF6'}
                  />
                  <Text
                    style={[
                      styles.interestText,
                      isSelected && styles.interestTextSelected,
                    ]}
                  >
                    {interest.label}
                  </Text>
                </TouchableOpacity>
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
              color="#8B5CF6"
            />
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <LinearGradient
            colors={saving ? ['#666', '#555'] : ['#8B5CF6', '#7C3AED']}
            style={styles.saveButtonGradient}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark" size={20} color="#fff" />
                <Text style={styles.saveButtonText}>
                  {t('editProfile.buttons.save')}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textShadowColor: 'rgba(139, 92, 246, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  placeholder: {
    width: 44,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(139, 92, 246, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#999',
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
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
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
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(139, 92, 246, 0.3)',
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
    fontSize: 16,
    fontWeight: '600',
    color: '#E0E0E0',
    marginBottom: 8,
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textAreaContainer: {
    position: 'relative',
  },
  textArea: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
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
  interestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    margin: 4,
  },
  interestChipSelected: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  interestText: {
    color: '#8B5CF6',
    fontSize: 14,
    marginLeft: 6,
    fontWeight: '600',
  },
  interestTextSelected: {
    color: '#fff',
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  showMoreText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  saveButton: {
    marginHorizontal: 20,
    borderRadius: 25,
    overflow: 'hidden',
    marginTop: 20,
    marginBottom: 40,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default EditProfileScreen;
