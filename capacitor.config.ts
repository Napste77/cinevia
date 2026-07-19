import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Empaqueta el MISMO build web (react-native-web, `expo export --platform
 * web`) que se despliega en Netlify dentro de un WebView nativo de
 * Android/iOS — una sola base de código, sin reescribir pantallas. Ver
 * README.md "Generar el APK con Capacitor" para el flujo completo.
 */
const config: CapacitorConfig = {
  appId: "com.nastex.nowsee",
  appName: "NowSee",
  webDir: "dist",
  backgroundColor: "#0c1324",
  server: {
    // https (no "capacitor://") para que las cookies/almacenamiento y los
    // headers CORS del backend se comporten igual que en un navegador real.
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      // Se oculta a mano desde App.tsx una vez que React montó, en vez de
      // dejar que el plugin la saque sola a los ~3s aunque la app todavía
      // no esté lista para mostrarse.
      launchAutoHide: false,
      backgroundColor: "#0c1324",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
  },
};

export default config;
