import { fontFamily } from "@/constants/fonts";
import { colors } from "@/constants/theme";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs, useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type TabIconProps = {
  name: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
};

function TabIcon({ name, color }: TabIconProps) {
  return <Ionicons name={name} size={22} color={color} />;
}

type FabButtonProps = {
  onPress?: () => void;
  style?: object;
};

// Stable icon functions — defined at module level so identity never changes
const HomeIcon = ({ color }: { color: string }) => <TabIcon name="home" color={color} />;
const StatsIcon = ({ color }: { color: string }) => <TabIcon name="bar-chart-outline" color={color} />;
const AudioIcon = ({ color }: { color: string }) => <TabIcon name="musical-notes-outline" color={color} />;
const ProfileIcon = ({ color }: { color: string }) => <TabIcon name="person-outline" color={color} />;

function FabButton({ onPress, style }: FabButtonProps) {
  return (
    <View style={style}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        className="items-center justify-center bg-primary self-center rounded-full w-[65px] h-[65px] -top-[30px]"
        style={{
          shadowColor: colors.primary,
          shadowOpacity: 0.25,
          shadowRadius: 12,
          // shadowOffset: { width: 0, height: 4 },
          elevation: 8,
        }}
      >
        <Text className="text-on-primary text-[42px] leading-[46px] font-semibold text-center mt-[-4px]">
          +
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: "#2A2A2A",
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontFamily: fontFamily.semibold,
          fontSize: 10,
          fontWeight: "normal",
          letterSpacing: 0.8,
          textTransform: "uppercase",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: HomeIcon,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: "Stats",
          tabBarIcon: StatsIcon,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: "",
          tabBarLabel: () => null,
          tabBarIcon: () => null,
          tabBarButton: (props) => (
            <FabButton {...props} onPress={() => router.push('/camera' as any)} />
          ),
        }}
      />
      <Tabs.Screen
        name="audio"
        options={{
          title: "Audio",
          tabBarIcon: AudioIcon,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ProfileIcon,
        }}
      />
      {/* Keep wallet and settings as navigable routes but hidden from tab bar */}
      <Tabs.Screen name="wallet" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
  );
}
