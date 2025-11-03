# vremyavnikuda_blog

Личный блог разработчика, построенный на Astro + Three.js.

## Требования

### Шрифт
Сайт использует **Cascadia Code** в качестве основного шрифта для всех элементов.

**Установка Cascadia Code:**
- **Windows/Linux:** [Скачать с GitHub](https://github.com/microsoft/cascadia-code/releases)
- **macOS:** `brew install --cask font-cascadia-code`

Если шрифт не установлен в системе, будет использован fallback: `monospace`.

## Разработка

```bash
# Установка зависимостей
npm install

# Dev сервер
npm run dev

# Сборка
npm run build

# Preview production build
npm run preview
```

## Технологии

- **Astro** v5.15.3 - SSG framework
- **Tailwind CSS** v3 - стили
- **Three.js** - 3D анимация на главной
- **TypeScript** - strict mode
- **MDX** - контент блога

## Особенности

- ✅ 100% тёмная тема
- ✅ Минималистичный дизайн
- ✅ Мультиязычность (日本語 + English)
- ✅ RSS feed
- ✅ SEO оптимизация
- ✅ Строгая типизация
- ✅ Zero JavaScript (кроме Three.js canvas)
- ✅ prefers-reduced-motion support
- ✅ Cascadia Code шрифт