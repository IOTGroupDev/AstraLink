import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  FlatList,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
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

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setLoading(true);
    try {
      const results = await geoApi.suggestCities({ q: query, lang: 'ru' });
      setSuggestions(results);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Failed to fetch city suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    debounceTimeout.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);

    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [value, fetchSuggestions]);

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

  const renderSuggestionItem = ({ item }: { item: CityOption }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSelectCity(item)}
      activeOpacity={0.7}
    >
      <Ionicons
        name="location-outline"
        size={20}
        color="rgba(255, 255, 255, 0.7)"
        style={styles.suggestionIcon}
      />
      <Text style={styles.suggestionText}>{item.display}</Text>
    </TouchableOpacity>
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
          <FlatList
            data={suggestions}
            renderItem={renderSuggestionItem}
            keyExtractor={(item) => item.id}
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          />
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
    maxHeight: 200,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  suggestionsList: {
    flex: 1,
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
