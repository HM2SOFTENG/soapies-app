import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../lib/colors';

type Props = {
  size?: 'small' | 'large';
  fullScreen?: boolean;
};

export default function LoadingSpinner({ size = 'large', fullScreen = false }: Props) {
  if (fullScreen) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: colors.bg,
        }}
      >
        <ActivityIndicator color={colors.pink} size={size} />
      </View>
    );
  }
  return <ActivityIndicator color={colors.pink} size={size} />;
}
