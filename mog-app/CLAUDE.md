# CLAUDE.md — mog-app

This file defines the project conventions Claude must follow. It mirrors the patterns used across other apps in this workspace (see ~/homegrown-1/sustainability as the reference).

---

## Tech Stack

- **Framework:** React Native + Expo (SDK 54, managed workflow)
- **Routing:** Expo Router (file-based, `app/` directory)
- **Backend:** Supabase (auth, database, storage)
- **Styling:** NativeWind + Tailwind CSS (primary), inline styles only for animations/dynamic values
- **Language:** TypeScript (strict mode)
- **State:** React Context API + hooks (no Redux or Zustand)
- **Fonts:** Poppins (@expo-google-fonts/poppins)
- **Animation:** React Native Animated API with `useRef`

---

## Folder Structure

```
app/              → All screens/routes (Expo Router file-based routing)
components/       → Reusable UI components
  ui/             → Low-level primitives (icons, collapsible, etc.)
contexts/         → React Context providers (one per domain)
hooks/            → Custom React hooks
lib/              → Library initialization (supabase.ts, etc.)
utils/            → Pure utility functions
types/            → TypeScript interfaces and type exports
constants/        → App-wide constants
assets/           → Images, fonts, static files
database/         → Supabase migrations and schema
supabase/         → Supabase config and edge functions
```

---

## File Naming Conventions

| Location | Convention | Example |
|---|---|---|
| `app/` screens | camelCase | `createPost.tsx`, `login.tsx` |
| `app/` dynamic routes | `[camelCase]` | `[id].tsx`, `[userId].tsx` |
| `components/` (complex) | PascalCase | `ListingCard.tsx`, `AnimatedButton.tsx` |
| `components/` (utility) | kebab-case | `themed-text.tsx`, `haptic-tab.tsx` |
| `contexts/` | PascalCase + "Context" | `AuthContext.tsx`, `PostsContext.tsx` |
| `hooks/` (generic) | kebab-case | `use-color-scheme.ts` |
| `hooks/` (specialized) | camelCase | `useProducts.ts`, `useMessages.ts` |
| `utils/`, `lib/` | camelCase | `supabase.ts`, `relativeTime.ts` |
| `types/` | kebab-case | `database.types.ts`, `index.ts` |

---

## Component Conventions

- Always use **`export default function`** declarations (not arrow functions)
- Define prop interfaces explicitly **above** the component
- Use `@/` absolute path imports — never relative `../`
- Order imports: third-party → local (contexts, hooks, components, utils, types)

```tsx
// Correct
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ProductCard } from '@/components/ProductCard';
import { Product } from '@/types';

interface ProductCardProps {
  item: Product;
  onPress: (id: string) => void;
}

export default function ProductCard({ item, onPress }: ProductCardProps) {
  ...
}
```

---

## Styling

- **Use Tailwind/NativeWind `className` for all static styles**
- **Use inline `style` only for animated/dynamic values**
- Never use `StyleSheet.create` unless interfacing with a third-party lib that requires it

```tsx
// Correct
<View className="flex-1 px-4 bg-background">
  <Animated.View style={{ opacity: fadeAnim }} className="rounded-xl p-4">
    <Text className="text-lg font-semibold text-primary">Hello</Text>
  </Animated.View>
</View>
```

---

## Context Pattern

Each context file exports:
1. A typed interface for the context value
2. A `Provider` component
3. A `useX` hook that throws if used outside the provider

```tsx
interface AuthContextType {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) { ... }

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
```

---

## State & Async Pattern

- Use `loading`, `error`, and `data` state triad in hooks
- Always use try/catch/finally for async operations
- Use `err instanceof Error` for type-safe error messages

```tsx
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

try {
  setLoading(true);
  const { data, error } = await supabase.from('table').select('*');
  if (error) throw error;
} catch (err) {
  setError(err instanceof Error ? err.message : 'Something went wrong');
} finally {
  setLoading(false);
}
```

---

## Navigation

Use Expo Router's `useRouter` for programmatic navigation:

```tsx
const router = useRouter();
router.push('/(tabs)/home');
router.replace('/login');
```

---

## TypeScript

- Strict mode is on — no `any`, no implicit `any`
- Put shared types in `types/index.ts`
- Put Supabase-generated DB types in `types/database.types.ts`
- Use union types for status/category fields instead of enums

```tsx
export type PostStatus = 'draft' | 'published' | 'archived';
export type ProductCategory = 'clothing' | 'electronics' | 'food';
```

---

## Supabase Conventions

- Client lives in `lib/supabase.ts` — import from there everywhere
- Use `EXPO_PUBLIC_` prefix for env vars exposed to the app
- Auth session is persisted via AsyncStorage
- DB types live in `types/database.types.ts` (generate with Supabase CLI)

---

## Current Setup State

- `lib/supabase.ts` — Supabase client configured
- `contexts/auth.tsx` — Auth context with Google OAuth (rename to `contexts/AuthContext.tsx` to match convention)
- `app/login.tsx` — Login screen with Google sign-in
- `app/_layout.tsx` — Root layout with AuthProvider and route protection
- `.env.local` — Supabase URL and anon key (gitignored)

---

## Do Not

- Do not use `StyleSheet.create` for general styling — use NativeWind
- Do not use relative imports (`../`) — use `@/` alias
- Do not add Redux, Zustand, or any external state library
- Do not create files speculatively — only what is needed for the current task
- Do not add comments unless the logic is non-obvious
