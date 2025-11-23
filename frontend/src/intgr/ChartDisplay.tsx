import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Text,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import NatalChartWheel from './NatalChartWheel';
import PlanetList from './PlanetList';
import type { ChartData } from './astrology.types';

interface ChartDisplayProps {
  chartData: ChartData;
  loading?: boolean;
  onRefresh?: () => void;
}

const { width } = Dimensions.get('window');

const ChartDisplay: React.FC<ChartDisplayProps> = ({
  chartData,
  loading = false,
  onRefresh,
}) => {
  const [showAspects, setShowAspects] = useState(true);
  const [view, setView] = useState<'chart' | 'data' | 'both'>('both');

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Calculating chart...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{chartData.name}</Text>
          <Text style={styles.subtitle}>
            {chartData.dateTime.toLocaleDateString()}{' '}
            {chartData.dateTime.toLocaleTimeString()}
          </Text>
          <Text style={styles.subtitle}>
            {chartData.location.latitude.toFixed(4)}°,{' '}
            {chartData.location.longitude.toFixed(4)}°
          </Text>
        </View>
        {onRefresh && (
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Text style={styles.refreshText}>↻</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Chart info */}
      <View style={styles.infoSection}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Sun Sign</Text>
          <Text style={styles.infoValue}>{chartData.sunSign}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Moon Sign</Text>
          <Text style={styles.infoValue}>{chartData.moonSign}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Rising Sign</Text>
          <Text style={styles.infoValue}>{chartData.risingSign}</Text>
        </View>
      </View>

      {/* View toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            view === 'chart' && styles.toggleButtonActive,
          ]}
          onPress={() => setView('chart')}
        >
          <Text
            style={[
              styles.toggleText,
              view === 'chart' && styles.toggleTextActive,
            ]}
          >
            Chart
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            view === 'data' && styles.toggleButtonActive,
          ]}
          onPress={() => setView('data')}
        >
          <Text
            style={[
              styles.toggleText,
              view === 'data' && styles.toggleTextActive,
            ]}
          >
            Data
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            view === 'both' && styles.toggleButtonActive,
          ]}
          onPress={() => setView('both')}
        >
          <Text
            style={[
              styles.toggleText,
              view === 'both' && styles.toggleTextActive,
            ]}
          >
            Both
          </Text>
        </TouchableOpacity>
      </View>

      {/* Chart wheel */}
      {(view === 'chart' || view === 'both') && (
        <View style={styles.chartSection}>
          <View style={styles.chartControls}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={() => setShowAspects(!showAspects)}
            >
              <Text style={styles.controlButtonText}>
                {showAspects ? '✓' : '○'} Show Aspects
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.chartContainer}>
            <NatalChartWheel
              chartData={chartData}
              size={width - 32}
              showAspects={showAspects}
              showHouseNumbers={true}
            />
          </View>
        </View>
      )}

      {/* Planet data */}
      {(view === 'data' || view === 'both') && (
        <View style={styles.dataSection}>
          <Text style={styles.sectionTitle}>Planetary Positions</Text>
          <PlanetList chartData={chartData} />
        </View>
      )}

      {/* Aspects */}
      {chartData.aspects && chartData.aspects.length > 0 && (
        <View style={styles.aspectsSection}>
          <Text style={styles.sectionTitle}>
            Aspects ({chartData.aspects.length})
          </Text>
          {chartData.aspects.slice(0, 20).map((aspect, index) => (
            <View key={index} style={styles.aspectRow}>
              <Text style={styles.aspectPlanets}>
                {aspect.planet1} {getAspectSymbol(aspect.type)} {aspect.planet2}
              </Text>
              <Text style={styles.aspectOrb}>{aspect.orb.toFixed(2)}°</Text>
              <Text
                style={[
                  styles.aspectType,
                  { color: getAspectColor(aspect.type) },
                ]}
              >
                {aspect.type}
              </Text>
            </View>
          ))}
          {chartData.aspects.length > 20 && (
            <Text style={styles.moreAspects}>
              +{chartData.aspects.length - 20} more aspects
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const getAspectSymbol = (type: string): string => {
  const symbols: Record<string, string> = {
    Conjunction: '☌',
    Opposition: '☍',
    Trine: '△',
    Square: '□',
    Sextile: '⚹',
    Quincunx: '⚻',
  };
  return symbols[type] || '•';
};

const getAspectColor = (type: string): string => {
  const colors: Record<string, string> = {
    Conjunction: '#FF0000',
    Opposition: '#0000FF',
    Trine: '#00AA00',
    Square: '#FF00FF',
    Sextile: '#00AAAA',
    Quincunx: '#999999',
  };
  return colors[type] || '#666666';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6c757d',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 2,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshText: {
    fontSize: 24,
    color: '#fff',
  },
  infoSection: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    gap: 12,
  },
  infoItem: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6366f1',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#dee2e6',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#6366f1',
  },
  toggleText: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  toggleTextActive: {
    color: '#fff',
  },
  chartSection: {
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 16,
  },
  chartControls: {
    marginBottom: 16,
  },
  controlButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  controlButtonText: {
    fontSize: 14,
    color: '#495057',
  },
  chartContainer: {
    alignItems: 'center',
  },
  dataSection: {
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  aspectsSection: {
    backgroundColor: '#fff',
    marginTop: 8,
    padding: 16,
  },
  aspectRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  aspectPlanets: {
    flex: 2,
    fontSize: 14,
    color: '#212529',
  },
  aspectOrb: {
    flex: 1,
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
  },
  aspectType: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'right',
  },
  moreAspects: {
    marginTop: 12,
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default ChartDisplay;
