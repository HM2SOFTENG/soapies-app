import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../lib/theme';

type TabItem<T extends string> = {
  key: T;
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  badge?: number | string | null;
};

type PillTabsProps<T extends string> = {
  equalWidth?: boolean;
  compact?: boolean;
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  contentContainerStyle?: React.ComponentProps<typeof ScrollView>['contentContainerStyle'];
  style?: React.ComponentProps<typeof ScrollView>['style'];
};

export default function PillTabs<T extends string>({
  equalWidth = false,
  compact = false,
  items,
  value,
  onChange,
  contentContainerStyle,
  style,
}: PillTabsProps<T>) {
  const theme = useTheme();

  const renderTab = (item: TabItem<T>, options?: { equal?: boolean }) => {
    const isActive = value === item.key;
    const badgeValue = item.badge ?? 0;
    const showBadge = badgeValue !== 0 && badgeValue !== '0';
    const textColor = isActive ? theme.colors.white : theme.colors.textSecondary;
    const badgeBg = isActive ? theme.alpha(theme.colors.white, 0.24) : theme.alpha(theme.colors.primary, 0.12);
    const badgeText = isActive ? theme.colors.white : theme.colors.primary;
    const equal = !!options?.equal;

    const inner = (
      <View
        style={{
          minHeight: compact ? 38 : 42,
          paddingHorizontal: compact ? 8 : 14,
          paddingVertical: compact ? 8 : 9,
          borderRadius: 999,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: compact ? 6 : 8,
          borderWidth: isActive ? 0 : 1,
          borderColor: isActive ? 'transparent' : theme.colors.border,
          backgroundColor: isActive ? 'transparent' : theme.colors.surface,
          width: '100%',
        }}
      >
        {item.icon ? (
          <Ionicons name={item.icon} size={compact ? 15 : 16} color={textColor} />
        ) : null}
        <Text
          numberOfLines={1}
          style={{ color: textColor, fontWeight: '700', fontSize: compact ? 11 : 13, flexShrink: 1 }}
        >
          {item.label}
        </Text>
        {showBadge ? (
          <View
            style={{
              minWidth: 20,
              height: 20,
              paddingHorizontal: 6,
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: badgeBg,
            }}
          >
            <Text style={{ color: badgeText, fontWeight: '800', fontSize: 11 }}>
              {badgeValue}
            </Text>
          </View>
        ) : null}
      </View>
    );

    return (
      <TouchableOpacity
        key={item.key}
        onPress={() => onChange(item.key)}
        activeOpacity={0.85}
        style={{
          borderRadius: 999,
          overflow: 'hidden',
          alignSelf: 'stretch',
          flex: equal ? 1 : undefined,
        }}
      >
        {isActive ? (
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ borderRadius: 999 }}
          >
            {inner}
          </LinearGradient>
        ) : (
          inner
        )}
      </TouchableOpacity>
    );
  };

  const baseRowStyle = {
    paddingHorizontal: compact ? 8 : 16,
    paddingVertical: compact ? 8 : 10,
    gap: compact ? 8 : 10,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  };

  if (equalWidth) {
    return (
      <View
        style={[
          { borderBottomColor: theme.colors.border, borderBottomWidth: 1 },
          style,
        ]}
      >
        <View style={[baseRowStyle, { width: '100%' }, contentContainerStyle as any]}>
          {items.map((item) => renderTab(item, { equal: true }))}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[
        { borderBottomColor: theme.colors.border, borderBottomWidth: 1 },
        style,
      ]}
      contentContainerStyle={[baseRowStyle, contentContainerStyle]}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: compact ? 8 : 10 }}>
        {items.map((item) => renderTab(item))}
      </View>
    </ScrollView>
  );
}
