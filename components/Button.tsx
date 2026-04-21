import React from 'react';
import { Pressable, Text, type PressableProps } from 'react-native';

type Variant = 'primary' | 'glass';

type Props = PressableProps & {
  label: string;
  variant?: Variant;
  className?: string; // Add className prop
};

export function Button({ label, variant = 'primary', className, ...rest }: Props) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      {...rest}
      className={`
        rounded-2xl py-[18px] px-8 
        ${isPrimary ? 'bg-primary-container glow-primary' : 'bg-surface-container-high'}
        active:opacity-85
        ${className}
      `}
    >
      <Text
        className={`
          text-base font-bold tracking-[0.6px] text-center uppercase
          ${isPrimary ? 'text-on-primary' : 'text-on-surface'}
        `}
      >
        {label}
      </Text>
    </Pressable>
  );
}
