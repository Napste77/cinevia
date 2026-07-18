import React, { Suspense, lazy } from "react";
import { View, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, LinkingOptions } from "@react-navigation/native";
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
          <NavigationContainer linking={linking}>
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
