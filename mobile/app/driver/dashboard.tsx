import { View, Text } from "react-native";
import Header from "./component/header";
import { Stack } from "expo-router";
import { StyleSheet } from "react-native";

export const Dashboard = () => {
  return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.page}>
          <View style={styles.body}>
            <View style={styles.content}>
              <Header />
            </View>
          </View>
        </View>
      </>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  body: {
    flex: 1,
    flexDirection: 'row'
  },
  content: {
    flex: 1,
    backgroundColor: '#fff'
  }
  ,innerContent: {
    flex: 1,
    padding: 12
  }
});