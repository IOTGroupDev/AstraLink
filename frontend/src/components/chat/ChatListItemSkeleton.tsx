import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SkeletonLoader } from '@/components/shared/SkeletonLoader';

/**
 * ChatListItemSkeleton - скелетон для элемента списка чатов
 * Соответствует структуре одного диалога в ChatListScreen
 */
export const ChatListItemSkeleton: React.FC = () => {
  return (
    <View style={styles.row}>
      {/* Аватар */}
      <SkeletonLoader variant="circle" height={56} style={styles.avatar} />

      {/* Текстовая информация */}
      <View style={styles.rowCenter}>
        <SkeletonLoader
          variant="text"
          width={140}
          height={17}
          style={styles.mb4}
        />
        <SkeletonLoader variant="text" width={200} height={15} />
      </View>

      {/* Время */}
      <View style={styles.rowRight}>
        <SkeletonLoader variant="text" width={45} height={13} />
      </View>
    </View>
  );
};

/**
 * ChatListSkeleton - полный скелетон для списка чатов
 * Показывает несколько элементов списка
 */
export const ChatListSkeleton: React.FC<{ count?: number }> = ({
  count = 8,
}) => {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <React.Fragment key={index}>
          <ChatListItemSkeleton />
          {index < count - 1 && <View style={styles.separator} />}
        </React.Fragment>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatar: {
    marginRight: 12,
  },
  rowCenter: {
    flex: 1,
    minWidth: 0,
  },
  mb4: {
    marginBottom: 4,
  },
  rowRight: {
    marginLeft: 12,
    alignItems: 'flex-end',
  },
  separator: {
    height: 8,
  },
});
