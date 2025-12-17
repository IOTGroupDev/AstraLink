import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  ScrollView,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { geoApi, CityOption } from '../../services/api/geo.api';

interface AstralCityInputProps {
  icon?: keyof typeof Ionicons.glyphMap;
  required?: boolean;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onCitySelect?: (city: CityOption) => void;
}

const AstralCityInput: React.FC<AstralCityInputProps> = ({
  icon,
  required = false,
  placeholder,
  value,
  onChangeText,
  onCitySelect,
}) => {
  const [suggestions, setSuggestions] = useState<CityOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    if (value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceTimeout.current = setTimeout(async () => {
      console.log('🔍 Fetching cities for:', value);
      setLoading(true);
      try {
        const results = await geoApi.suggestCities({ q: value, lang: 'ru' });
        console.log('✅ Got city results:', results.length);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch (error) {
        console.error('❌ Failed to fetch city suggestions:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [value]);

  const handleSelectCity = useCallback(
    (city: CityOption) => {
      onChangeText(city.display);
      setShowSuggestions(false);
      setSuggestions([]);
      Keyboard.dismiss();
      onCitySelect?.(city);
    },
    [onChangeText, onCitySelect]
  );

  return (
    <View style={styles.wrapper}>
      <Animated.View
        entering={FadeInDown.duration(600).delay(300)}
        style={styles.container}
      >
        <View style={styles.inputWrapper}>
          {icon && (
            <View style={styles.iconContainer}>
              <Ionicons name={icon} size={28} color="#FFFFFF" />
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            value={value}
            onChangeText={onChangeText}
            autoCapitalize="words"
            autoCorrect={false}
          />

          {loading && (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
              style={styles.loader}
            />
          )}
        </View>

        <View style={styles.borderBottom} />
      </Animated.View>

      {showSuggestions && suggestions.length > 0 && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={styles.suggestionsContainer}
        >
          <ScrollView
            style={styles.suggestionsScrollView}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >
            {suggestions.map((city) => (
              <TouchableOpacity
                key={city.id}
                style={styles.suggestionItem}
                onPress={() => handleSelectCity(city)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="location-outline"
                  size={20}
                  color="rgba(255, 255, 255, 0.7)"
                  style={styles.suggestionIcon}
                />
                <Text style={styles.suggestionText}>{city.display}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginVertical: 8,
  },
  container: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
  iconContainer: {
    marginRight: 20,
  },
  input: {
    flex: 1,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 20,
    color: '#FFFFFF',
    paddingVertical: 0,
    height: 28,
  },
  loader: {
    marginLeft: 8,
  },
  borderBottom: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 1)',
    width: '100%',
  },
  suggestionsContainer: {
    marginTop: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  suggestionsScrollView: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionText: {
    flex: 1,
    fontFamily: 'Montserrat_400Regular',
    fontSize: 16,
    color: '#FFFFFF',
  },
});

export default AstralCityInput;
