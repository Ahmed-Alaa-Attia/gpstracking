import { FeedHeader } from "@/components/ui/FeedHeader";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from "@gorhom/bottom-sheet";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Alert,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Colors from index.html configuration
const THEME = {
  background: "#0D0D0D",
  surface: "#1A1A1A",
  border: "#2A2A2A",
  primary: "#C0FF00",
  onSurfaceVariant: "#c3caac",
  error: "#ffb4ab",
  errorBg: "#93000a",
};

const DEFAULT_AVATAR =
  "file:///C:/Users/DELL/.gemini/antigravity/brain/1bfca49f-33f0-4b5c-80cf-0037adc3a7ce/profile_avatar_alex_1777985861017.png";

export default function Profile() {
  const insets = useSafeAreaInsets();

  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["50%", "90%"], []);

  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);
  const [email, setEmail] = useState("alex99@trackooo.net");
  const [password, setPassword] = useState("••••••••");

  const [editType, setEditType] = useState<"email" | "password" | null>(null);
  const [tempValue, setTempValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [darkTheme, setDarkTheme] = useState(true);
  const [notifications, setNotifications] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "We need access to your photos to change your profile picture.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets[0].uri) {
      setAvatar(result.assets[0].uri);
    }
  };

  const openEdit = (type: "email" | "password") => {
    setEditType(type);
    setTempValue(type === "email" ? email : "");
    setError(null);
    bottomSheetModalRef.current?.present();
    // Use a small timeout to ensure it snaps to the keyboard-friendly position
    setTimeout(() => {
      bottomSheetModalRef.current?.snapToIndex(1);
    }, 100);
  };

  const validate = () => {
    if (editType === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(tempValue)) {
        setError("Invalid email address.");
        return false;
      }
    } else if (editType === "password") {
      if (tempValue.length < 6) {
        setError("Minimum 6 characters required.");
        return false;
      }
    }
    return true;
  };

  const handleSave = () => {
    if (validate()) {
      if (editType === "email") setEmail(tempValue);
      else setPassword("••••••••");
      bottomSheetModalRef.current?.dismiss();
    }
  };

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.8}
      />
    ),
    [],
  );

  return (
    <View style={{ flex: 1, backgroundColor: THEME.background }}>
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: THEME.background,
          borderBottomWidth: 1,
          borderBottomColor: `${THEME.border}80`,
        }}
      >
        <FeedHeader />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: 20,
          paddingBottom: insets.bottom + 100,
          paddingHorizontal: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View className="items-center mb-8">
          <View className="relative">
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={pickImage}
              style={{
                width: 160,
                height: 160,
                borderRadius: 80,
                borderWidth: 2,
                borderColor: THEME.border,
                padding: 4,
                backgroundColor: THEME.surface,
              }}
            >
              <Image
                source={avatar}
                style={{ width: "100%", height: "100%", borderRadius: 80 }}
                contentFit="cover"
              />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={pickImage}
              style={{
                position: "absolute",
                bottom: 0,
                right: 0,
                backgroundColor: THEME.primary,
                borderRadius: 999,
                padding: 10,
                borderWidth: 4,
                borderColor: THEME.background,
              }}
            >
              <Ionicons name="pencil" size={20} color="black" />
            </TouchableOpacity>
          </View>

          <View className="items-center mt-6 gap-2">
            <Text
              style={{
                color: "white",
                fontSize: 32,
                fontWeight: "700",
                letterSpacing: -0.64,
                textTransform: "uppercase",
              }}
            >
              ALEX_99
            </Text>
            <View
              style={{
                backgroundColor: THEME.surface,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: THEME.border,
              }}
            >
              <Text
                style={{
                  color: THEME.primary,
                  fontSize: 12,
                  fontWeight: "600",
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                }}
              >
                ELITE PERFORMER
              </Text>
            </View>
          </View>
        </View>

        {/* Profile Strength Card */}
        <View
          style={{
            backgroundColor: THEME.surface,
            borderRadius: 24,
            padding: 24,
            marginBottom: 32,
            borderWidth: 1,
            borderColor: THEME.border,
          }}
        >
          <View className="flex-row justify-between items-end mb-4">
            <View>
              <Text className="text-white text-2xl font-bold uppercase">
                PROFILE
              </Text>
              <Text className="text-white text-2xl font-bold uppercase">
                STRENGTH
              </Text>
            </View>
            <Text
              style={{
                color: THEME.primary,
                fontSize: 48,
                fontWeight: "700",
                letterSpacing: -0.96,
              }}
            >
              80%
            </Text>
          </View>

          <View className="flex-row gap-1.5 w-full h-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <View
                key={i}
                className="flex-1 h-full rounded-full"
                style={{ backgroundColor: THEME.primary }}
              />
            ))}
            {[9, 10].map((i) => (
              <View
                key={i}
                className="flex-1 h-full rounded-full"
                style={{ backgroundColor: THEME.border }}
              />
            ))}
          </View>

          <View className="flex-row items-center mt-4">
            <Ionicons
              name="information-circle-outline"
              size={14}
              color={THEME.primary}
            />
            <Text
              style={{
                color: THEME.onSurfaceVariant,
                fontSize: 12,
                marginLeft: 8,
                fontWeight: "600",
                textTransform: "uppercase",
                letterSpacing: 1.2,
              }}
            >
              Complete profile for optimum data accuracy
            </Text>
          </View>
        </View>

        {/* Account Section */}
        <View className="mb-6 gap-3">
          <Text
            style={{
              color: THEME.onSurfaceVariant,
              fontSize: 12,
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: 1.2,
              paddingLeft: 16,
            }}
          >
            Account
          </Text>
          <View
            style={{
              backgroundColor: THEME.surface,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: THEME.border,
              overflow: "hidden",
            }}
          >
            <SettingsItem
              label="Email Address"
              value={email}
              onPress={() => openEdit("email")}
              rightIcon="pencil"
              showBorder
            />
            <SettingsItem
              label="Change Password"
              value={password}
              onPress={() => openEdit("password")}
              rightIcon="chevron-forward"
            />
          </View>
        </View>

        {/* Performance Section */}
        <View className="mb-6 gap-3">
          <Text
            style={{
              color: THEME.onSurfaceVariant,
              fontSize: 12,
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: 1.2,
              paddingLeft: 16,
            }}
          >
            Performance
          </Text>
          <View
            style={{
              backgroundColor: THEME.surface,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: THEME.border,
              overflow: "hidden",
            }}
          >
            <SettingsItem
              label="Heart Rate Zones"
              icon="monitor-heart"
              rightIcon="chevron-forward"
              showBorder
            />
            <SettingsItem
              label="Connected Gear"
              icon="pedal-bike"
              rightElement={
                <View className="flex-row items-center">
                  <View
                    style={{
                      backgroundColor: THEME.primary,
                      paddingHorizontal: 12,
                      paddingVertical: 4,
                      borderRadius: 999,
                      marginRight: 16,
                    }}
                  >
                    <Text
                      style={{
                        color: "black",
                        fontSize: 12,
                        fontWeight: "700",
                        textTransform: "uppercase",
                        letterSpacing: 1.2,
                      }}
                    >
                      2 ACTIVE
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={THEME.onSurfaceVariant}
                  />
                </View>
              }
            />
          </View>
        </View>

        {/* System Section */}
        <View className="mb-8 gap-3">
          <Text
            style={{
              color: THEME.onSurfaceVariant,
              fontSize: 12,
              fontWeight: "600",
              textTransform: "uppercase",
              letterSpacing: 1.2,
              paddingLeft: 16,
            }}
          >
            System
          </Text>
          <View
            style={{
              backgroundColor: THEME.surface,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: THEME.border,
              overflow: "hidden",
            }}
          >
            <View className="flex-row items-center justify-between p-5 border-b border-[#2A2A2A]">
              <Text className="text-white text-lg font-semibold">
                Dark Theme
              </Text>
              <Switch
                value={darkTheme}
                onValueChange={setDarkTheme}
                trackColor={{ false: THEME.border, true: THEME.primary }}
                thumbColor={darkTheme ? THEME.background : "#8d9479"}
              />
            </View>
            <View className="flex-row items-center justify-between p-5">
              <Text className="text-white text-lg font-semibold">
                Push Notifications
              </Text>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: THEME.border, true: THEME.primary }}
                thumbColor={notifications ? THEME.background : "#8d9479"}
              />
            </View>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={{
            marginTop: 16,
            borderWidth: 1,
            borderColor: THEME.border,
            borderRadius: 24,
            padding: 20,
            alignItems: "center",
          }}
          className="active:bg-[#93000a]"
        >
          <Text
            style={{
              color: THEME.error,
              fontSize: 24,
              fontWeight: "700",
              textTransform: "uppercase",
            }}
          >
            SIGN OUT
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Modal */}
      <BottomSheetModal
        ref={bottomSheetModalRef}
        index={1}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: THEME.surface }}
        handleIndicatorStyle={{ backgroundColor: THEME.border }}
        keyboardBehavior="fillParent"
        keyboardBlurBehavior="restore"
      >
        <BottomSheetView style={{ padding: 24, flex: 1 }}>
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-white text-2xl font-bold uppercase tracking-tight">
                Update {editType}
              </Text>
              <Text
                style={{
                  color: THEME.onSurfaceVariant,
                  fontSize: 14,
                  marginTop: 4,
                }}
              >
                Please enter your new {editType} details
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => bottomSheetModalRef.current?.dismiss()}
              style={{
                backgroundColor: THEME.border,
                padding: 8,
                borderRadius: 999,
              }}
            >
              <Ionicons name="close" size={20} color="white" />
            </TouchableOpacity>
          </View>

          <View className="mb-8">
            <View
              style={{
                backgroundColor: THEME.background,
                borderWidth: 1,
                borderColor: error ? THEME.error : THEME.border,
                borderRadius: 16,
                overflow: "hidden",
              }}
            >
              <BottomSheetTextInput
                value={tempValue}
                onChangeText={(text) => {
                  setTempValue(text);
                  setError(null);
                }}
                secureTextEntry={editType === "password"}
                style={{ color: "white", padding: 20, fontSize: 18 }}
                placeholder={`New ${editType}`}
                placeholderTextColor="#8d9479"
                autoFocus
              />
            </View>
            {error && (
              <Text
                style={{
                  color: THEME.error,
                  fontSize: 12,
                  marginTop: 8,
                  marginLeft: 16,
                  fontWeight: "600",
                  textTransform: "uppercase",
                }}
              >
                {error}
              </Text>
            )}
          </View>

          <View style={{ marginTop: "auto", paddingBottom: 40 }}>
            <TouchableOpacity
              onPress={handleSave}
              activeOpacity={0.8}
              style={{
                backgroundColor: THEME.primary,
                padding: 20,
                borderRadius: 24,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: "black",
                  fontSize: 18,
                  fontWeight: "800",
                  textTransform: "uppercase",
                  letterSpacing: 1.8,
                }}
              >
                Save Changes
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => bottomSheetModalRef.current?.dismiss()}
              style={{ marginTop: 16, padding: 8 }}
            >
              <Text
                style={{
                  color: THEME.onSurfaceVariant,
                  textAlign: "center",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: 1.2,
                }}
              >
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}

function SettingsItem({
  label,
  value,
  icon,
  rightIcon,
  rightElement,
  onPress,
  showBorder = false,
}: {
  label: string;
  value?: string;
  icon?: any;
  rightIcon?: any;
  rightElement?: React.ReactNode;
  onPress?: () => void;
  showBorder?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: 20,
        borderBottomWidth: showBorder ? 1 : 0,
        borderBottomColor: THEME.border,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
        {icon && (
          <View
            style={{
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Ionicons name={icon as any} size={24} color={THEME.primary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ color: "white", fontSize: 18, fontWeight: "600" }}>
            {label}
          </Text>
          {value && (
            <Text
              style={{
                color: THEME.onSurfaceVariant,
                fontSize: 16,
                marginTop: 2,
              }}
            >
              {value}
            </Text>
          )}
        </View>
      </View>
      {rightElement ||
        (rightIcon && (
          <Ionicons
            name={rightIcon as any}
            size={20}
            color={THEME.onSurfaceVariant}
          />
        ))}
    </TouchableOpacity>
  );
}
