import React, { Suspense, lazy, useEffect } from "react";
import { View, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, LinkingOptions, useNavigationContainerRef } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import {
  useFonts as useSora,
  Sora_600SemiBold,
  Sora_700Bold,
} from "@expo-google-fonts/sora";
import {
  useFonts as useInter,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import HomeScreen from "./src/screens/HomeScreen";
import { colors } from "./src/theme";
import { AuthProvider } from "./src/context/AuthContext";
import { RegionProvider } from "./src/context/RegionContext";
import { FavoritesProvider } from "./src/context/FavoritesContext";
import { isCapacitorNative } from "./src/api/deepLinks";

// Solo Home viaja en el bundle inicial (es la pantalla de entrada, así que
// cargarla eager no cuesta nada extra). El resto se separa en chunks
// propios que Metro solo baja cuando el usuario navega ahí de verdad —
// evita que alguien que solo mira el Home descargue también Detalle,
// Perfil, Auth, etc.
const SearchScreen = lazy(() => import("./src/screens/SearchScreen"));
const DetailScreen = lazy(() => import("./src/screens/DetailScreen"));
const MyListScreen = lazy(() => import("./src/screens/MyListScreen"));
const ProfileScreen = lazy(() => import("./src/screens/ProfileScreen"));
const CategoryScreen = lazy(() => import("./src/screens/CategoryScreen"));
const AuthScreen = lazy(() => import("./src/screens/AuthScreen"));

const Stack = createNativeStackNavigator();

// Sincroniza la pila de navegación con la URL y la History API del
// navegador: sin esto, en web react-navigation nunca hace pushState, así
// que no hay historial interno que recorrer y el botón "Atrás" del
// navegador/dispositivo sale directo del sitio en la primera pantalla.
// Con `linking`, cada navegación empuja una entrada de historial y el
// gesto/botón "Atrás" dispara un GO_BACK dentro de la app en vez de salir,
// mientras quede historial interno.
const linking: LinkingOptions<any> = {
  prefixes: ["nowsee://"],
  config: {
    screens: {
      Home: "",
      Search: "search",
      MyList: "my-list",
      Profile: "profile",
      Category: "category/:slug",
      Detail: {
        path: "title/:mediaType/:id",
        parse: { id: (id: string) => Number(id) },
      },
      Auth: "login",
    },
  },
};

export default function App() {
  const [soraLoaded] = useSora({ Sora_600SemiBold, Sora_700Bold });
  const [interLoaded] = useInter({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const navigationRef = useNavigationContainerRef();

  // Adentro del APK de Capacitor: el botón físico/gesto "Atrás" de Android
  // no sabe nada de react-navigation por su cuenta (a diferencia de web,
  // donde `linking` ya lo resuelve vía la History API) — hay que conectarlo
  // a mano al historial interno, y solo cerrar la app cuando no queda nada
  // atrás. También fija el color de la barra de estado nativa al del tema.
  useEffect(() => {
    if (!isCapacitorNative()) return;
    let cancelled = false;
    let backButtonSub: { remove: () => void } | undefined;
    (async () => {
      const [{ App: CapacitorApp }, { StatusBar: CapacitorStatusBar, Style }, { SplashScreen }] =
        await Promise.all([
          import("@capacitor/app"),
          import("@capacitor/status-bar"),
          import("@capacitor/splash-screen"),
        ]);
      const sub = await CapacitorApp.addListener("backButton", () => {
        if (navigationRef.isReady() && navigationRef.canGoBack()) {
          navigationRef.goBack();
        } else {
          CapacitorApp.exitApp();
        }
      });
      if (cancelled) {
        sub.remove();
        return;
      }
      backButtonSub = sub;
      await CapacitorStatusBar.setStyle({ style: Style.Dark });
      await CapacitorStatusBar.setBackgroundColor({ color: "#0c1324" });
      await SplashScreen.hide();
    })();
    return () => {
      cancelled = true;
      backButtonSub?.remove();
    };
  }, [navigationRef]);

  // En web no bloqueamos el render esperando las fuentes: el navegador ya
  // muestra el texto con la fuente de sistema como fallback y hace el swap
  // solo cuando el @font-face termina de cargar (evita pantalla en blanco
  // + un salto de layout enorme, que es justamente lo que castiga Core
  // Web Vitals). En nativo sí hace falta esperar: RN no tiene ese fallback.
  if (Platform.OS !== "web" && (!soraLoaded || !interLoaded)) {
    return <View style={{ flex: 1, backgroundColor: colors.surface }} />;
  }

  return (
    <AuthProvider>
      <RegionProvider>
        <FavoritesProvider>
          <NavigationContainer ref={navigationRef} linking={linking}>
            <StatusBar style="light" />
            <Suspense fallback={<View style={{ flex: 1, backgroundColor: colors.surface }} />}>
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Search" component={SearchScreen} />
                <Stack.Screen name="Detail" component={DetailScreen} />
                <Stack.Screen name="MyList" component={MyListScreen} />
                <Stack.Screen name="Profile" component={ProfileScreen} />
                <Stack.Screen name="Category" component={CategoryScreen} />
                <Stack.Screen name="Auth" component={AuthScreen} />
              </Stack.Navigator>
            </Suspense>
          </NavigationContainer>
        </FavoritesProvider>
      </RegionProvider>
    </AuthProvider>
  );
}
