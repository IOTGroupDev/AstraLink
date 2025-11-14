import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { AstroLesson, QuizOption } from '../../types/lessons';

interface LessonCardProps {
  lesson: AstroLesson;
  isCompleted?: boolean;
  onComplete?: (lessonId: string, quizScore?: number) => void;
  onBookmark?: (lessonId: string) => void;
  isBookmarked?: boolean;
  compact?: boolean;
}
export interface QuizOption {
  text: string; // Текст варианта ответа
  isCorrect: boolean; // Правильный ли это ответ
  explanation?: string; // Опциональное объяснение (почему правильно/неправильно)
}

export const LessonCard: React.FC<LessonCardProps> = ({
  lesson,
  isCompleted = false,
  onComplete,
  onBookmark,
  isBookmarked = false,
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizCompleted, setQuizCompleted] = useState(false);

  const getDifficultyColor = () => {
    switch (lesson.difficulty) {
      case 'beginner':
        return '#10B981';
      case 'intermediate':
        return '#F59E0B';
      case 'advanced':
        return '#EF4444';
    }
  };

  const getDifficultyLabel = () => {
    switch (lesson.difficulty) {
      case 'beginner':
        return 'Начальный';
      case 'intermediate':
        return 'Средний';
      case 'advanced':
        return 'Продвинутый';
    }
  };

  const handleComplete = () => {
    if (lesson.quiz && !quizCompleted) {
      setShowQuiz(true);
    } else {
      onComplete?.(lesson.id);
    }
  };

  const handleQuizAnswer = (index: number) => {
    setSelectedAnswer(index);
    const isCorrect = lesson.quiz?.options[index].isCorrect;

    setTimeout(() => {
      if (isCorrect) {
        setQuizCompleted(true);
        onComplete?.(lesson.id, 100);
        setTimeout(() => {
          setShowQuiz(false);
          setExpanded(false);
        }, 1500);
      } else {
        setTimeout(() => setSelectedAnswer(null), 1000);
      }
    }, 500);
  };

  if (compact) {
    return (
      <TouchableOpacity
        onPress={() => setExpanded(true)}
        style={styles.compactCard}
      >
        <LinearGradient colors={lesson.gradient} style={styles.compactGradient}>
          <View style={styles.compactIconContainer}>
            <Text style={styles.compactEmoji}>{lesson.emoji}</Text>
          </View>
          <View style={styles.compactContent}>
            <Text style={styles.compactTitle} numberOfLines={1}>
              {lesson.title}
            </Text>
            <Text style={styles.compactSubtitle} numberOfLines={1}>
              {lesson.subtitle}
            </Text>
            <Text style={styles.compactReadTime}>
              {lesson.readTime}с чтения
            </Text>
          </View>
          {isCompleted && (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <>
      <BlurView intensity={10} tint="dark" style={styles.card}>
        {/* Header */}
        <TouchableOpacity
          onPress={() => setExpanded(!expanded)}
          style={styles.cardHeader}
        >
          <LinearGradient colors={lesson.gradient} style={styles.iconGradient}>
            <Text style={styles.emoji}>{lesson.emoji}</Text>
          </LinearGradient>

          <View style={styles.headerContent}>
            <View style={styles.titleRow}>
              <Text
                style={styles.title}
                numberOfLines={expanded ? undefined : 2}
              >
                {lesson.title}
              </Text>
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onBookmark?.(lesson.id);
                }}
                style={styles.bookmarkButton}
              >
                <Ionicons
                  name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
                  size={20}
                  color={isBookmarked ? '#FBBF24' : 'rgba(255,255,255,0.5)'}
                />
              </TouchableOpacity>
            </View>

            {lesson.subtitle && (
              <Text style={styles.subtitle}>{lesson.subtitle}</Text>
            )}

            <View style={styles.meta}>
              <View style={styles.metaItem}>
                <Ionicons name="time" size={14} color="rgba(255,255,255,0.5)" />
                <Text style={styles.metaText}>{lesson.readTime}с</Text>
              </View>

              <View
                style={[
                  styles.difficultyBadge,
                  { backgroundColor: `${getDifficultyColor()}20` },
                ]}
              >
                <Text
                  style={[
                    styles.difficultyText,
                    { color: getDifficultyColor() },
                  ]}
                >
                  {getDifficultyLabel()}
                </Text>
              </View>

              {isCompleted && (
                <View style={styles.completedTag}>
                  <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                  <Text style={styles.completedText}>Пройдено</Text>
                </View>
              )}
            </View>
          </View>

          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={24}
            color="rgba(255,255,255,0.5)"
          />
        </TouchableOpacity>

        {/* Expanded Content */}
        {expanded && (
          <View style={styles.expandedContent}>
            {/* Short Text */}
            <Text style={styles.shortText}>{lesson.shortText}</Text>

            {/* Key Points */}
            {lesson.keyPoints && lesson.keyPoints.length > 0 && (
              <View style={styles.keyPointsContainer}>
                <Text style={styles.sectionTitle}>Ключевые моменты:</Text>
                {lesson.keyPoints.map((point, index) => (
                  <View key={index} style={styles.keyPoint}>
                    <Text style={styles.bullet}>•</Text>
                    <Text style={styles.keyPointText}>{point}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Example */}
            {lesson.example && (
              <View style={styles.exampleContainer}>
                <View style={styles.exampleHeader}>
                  <Ionicons name="bulb" size={16} color="#FBBF24" />
                  <Text style={styles.exampleTitle}>Пример:</Text>
                </View>
                <Text style={styles.exampleText}>{lesson.example}</Text>
              </View>
            )}

            {/* Full Text */}
            {lesson.fullText && (
              <View style={styles.fullTextContainer}>
                <Text style={styles.fullText}>{lesson.fullText}</Text>
              </View>
            )}

            {/* Task */}
            {lesson.task && (
              <View style={styles.taskContainer}>
                <View style={styles.taskHeader}>
                  <Ionicons name="checkbox" size={16} color="#8B5CF6" />
                  <Text style={styles.taskTitle}>{lesson.task.title}</Text>
                </View>
                <Text style={styles.taskDescription}>
                  {lesson.task.description}
                </Text>
                <TouchableOpacity style={styles.taskButton}>
                  <LinearGradient
                    colors={lesson.gradient}
                    style={styles.taskButtonGradient}
                  >
                    <Text style={styles.taskButtonText}>
                      {lesson.task.actionLabel}
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={handleComplete}
                style={styles.completeButton}
                disabled={isCompleted && !lesson.quiz}
              >
                <LinearGradient
                  colors={
                    isCompleted ? ['#10B981', '#059669'] : lesson.gradient
                  }
                  style={styles.completeButtonGradient}
                >
                  <Ionicons
                    name={isCompleted ? 'checkmark-circle' : 'checkmark'}
                    size={20}
                    color="#FFFFFF"
                  />
                  <Text style={styles.completeButtonText}>
                    {isCompleted
                      ? 'Завершено'
                      : lesson.quiz
                        ? 'Пройти квиз'
                        : 'Отметить как пройденное'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </BlurView>

      {/* Quiz Modal */}
      {lesson.quiz && (
        <Modal
          visible={showQuiz}
          transparent
          animationType="fade"
          onRequestClose={() => setShowQuiz(false)}
        >
          <View style={styles.modalOverlay}>
            <BlurView intensity={80} tint="dark" style={styles.quizContainer}>
              {/* Close Button */}
              <TouchableOpacity
                onPress={() => setShowQuiz(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>

              {/* Quiz Content */}
              <Text style={styles.quizTitle}>Проверьте себя</Text>
              <Text style={styles.quizQuestion}>{lesson.quiz.question}</Text>

              {lesson.quiz.hint && selectedAnswer === null && (
                <View style={styles.hintContainer}>
                  <Ionicons
                    name="information-circle"
                    size={16}
                    color="#8B5CF6"
                  />
                  <Text style={styles.hintText}>{lesson.quiz.hint}</Text>
                </View>
              )}

              <View style={styles.optionsContainer}>
                {lesson.quiz.options.map((option, index) => {
                  const isSelected = selectedAnswer === index;
                  const isCorrect = option.isCorrect;
                  const showResult = isSelected;

                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handleQuizAnswer(index)}
                      disabled={selectedAnswer !== null}
                      style={[
                        styles.optionButton,
                        isSelected && isCorrect && styles.optionCorrect,
                        isSelected && !isCorrect && styles.optionWrong,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          showResult && styles.optionTextSelected,
                        ]}
                      >
                        {option.text}
                      </Text>
                      {showResult && (
                        <Ionicons
                          name={isCorrect ? 'checkmark-circle' : 'close-circle'}
                          size={24}
                          color={isCorrect ? '#10B981' : '#EF4444'}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {quizCompleted && (
                <View style={styles.successContainer}>
                  <Ionicons name="trophy" size={48} color="#FBBF24" />
                  <Text style={styles.successText}>Отлично!</Text>
                  <Text style={styles.successSubtext}>
                    Урок успешно завершён
                  </Text>
                </View>
              )}
            </BlurView>
          </View>
        </Modal>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  // Compact Card
  compactCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  compactGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  compactIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactEmoji: {
    fontSize: 24,
  },
  compactContent: {
    flex: 1,
  },
  compactTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  compactSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  compactReadTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },
  completedBadge: {
    padding: 4,
  },

  // Full Card
  card: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  iconGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 28,
  },
  headerContent: {
    flex: 1,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bookmarkButton: {
    padding: 4,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  difficultyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  completedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  completedText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },

  // Expanded Content
  expandedContent: {
    padding: 16,
    paddingTop: 0,
    gap: 16,
  },
  shortText: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.9)',
  },

  // Key Points
  keyPointsContainer: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
    marginBottom: 4,
  },
  keyPoint: {
    flexDirection: 'row',
    gap: 8,
  },
  bullet: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: 'bold',
  },
  keyPointText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.85)',
  },

  // Example
  exampleContainer: {
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FBBF24',
  },
  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  exampleTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FBBF24',
  },
  exampleText: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.85)',
  },

  // Full Text
  fullTextContainer: {
    gap: 8,
  },
  fullText: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.85)',
  },

  // Task
  taskContainer: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#8B5CF6',
    gap: 8,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  taskDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.85)',
  },
  taskButton: {
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 4,
  },
  taskButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  taskButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Actions
  actions: {
    marginTop: 8,
  },
  completeButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  completeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Quiz Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 20,
  },
  quizContainer: {
    borderRadius: 20,
    padding: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 4,
    zIndex: 10,
  },
  quizTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  quizQuestion: {
    fontSize: 18,
    lineHeight: 26,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 16,
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  optionCorrect: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10B981',
  },
  optionWrong: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: '#EF4444',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
  },
  optionTextSelected: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  successContainer: {
    alignItems: 'center',
    marginTop: 24,
    gap: 8,
  },
  successText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  successSubtext: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },
});
