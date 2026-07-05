export type RouteKey = "Home" | "Search" | "MyList" | "Profile";

export const NAV_ITEMS: { key: RouteKey; label: string; icon: string }[] = [
  { key: "Home", label: "Explorar", icon: "explore" },
  { key: "Search", label: "Buscar", icon: "search" },
  { key: "MyList", label: "Mi Lista", icon: "bookmark" },
  { key: "Profile", label: "Perfil", icon: "person" },
];
