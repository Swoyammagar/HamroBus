import { Redirect } from "expo-router";

export default function Index() {
  // Redirect to splash screen, which will handle auth restoration and routing
  return <Redirect href={"/pages/splash" as any} />;
}
