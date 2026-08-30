import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "../src/background"; // registers the TaskManager task on load

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#170D17" },
          headerTintColor: "#fff",
          contentStyle: { backgroundColor: "#0F0A11" },
        }}
      >
        <Stack.Screen name="index" options={{ title: "Forma" }} />
        <Stack.Screen name="sync" options={{ title: "Health sync" }} />
      </Stack>
    </>
  );
}
