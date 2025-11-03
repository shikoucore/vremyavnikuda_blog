# План разработки личного сайта-визитки

## 1) Предлагаемый стек
**Astro + Markdown (MDX) + Tailwind + three.js**, деплой на **Cloudflare Pages / Vercel**.

**Преимущества:**
- Быстро (SSG)
- Просто писать статьи в .md/.mdx
- Подписки без бэкенда (RSS + Buttondown/Mailchimp)
- three.js только на нужных страницах
- Низкая стоимость / бесплатно

Альтернативы: **Hugo**, **11ty**, **Next.js (SSG)**.

---

## 2) Структура контента
- `/` — главная: кратко о себе, последние статьи, подписка
- `/blog` — лента статей
- `/blog/<slug>` — статья
- `/projects` — проекты
- `/about` — контакты / описание
- `/rss.xml`, `/atom.xml`
- `/privacy`

---

## 3) Подписки
- RSS/Atom — генерация при билде
- Email-подписка: *Buttondown* / *Mailchimp* / *ConvertKit*
- Поддержка «RSS-to-email»

---

## 4) Анимация three.js
- Эффект частиц/линий на главной
- Динамическая подгрузка
- Фолбэк при `prefers-reduced-motion`

---

## 5) Производительность и приватность
- Оптимизация изображений
- Tailwind CSS
- Аналитика без куки: Plausible/Umami
- SEO: метатеги, OG, sitemap, robots

---

## 6) Комментарии (опционально)
- **Utterances** или **Giscus** (GitHub Discussions)

---

## 7) Поиск (опционально)
- Pagefind (статический поиск)

---

## 8) Хостинг
- Хостинг: Cloudflare Pages / Vercel
- Домен: любой регистратор

---

## 9) Структура репозитория
/ src  
  / content  
    / blog/*.mdx  
    / projects/*.md  
  / components  
    Header.astro  
    Footer.astro  
    PostCard.astro  
    SubscribeForm.astro  
    HeroCanvas.astro  
    HeroCanvas.tsx  
  / layouts  
    BaseLayout.astro  
    PostLayout.astro  
/ public  
  favicon.svg  
  og-default.png  
astro.config.mjs  
package.json  
tailwind.config.cjs  
tsconfig.json  

---

## 10) План работ (по этапам)
**Этап 0. Подготовка**
- Домен, GitHub, подключение CI/CD

**Этап 1. Базовый сайт**
- Astro, Tailwind
- Страницы: `/`, `/blog`, `/projects`, `/about`
- Пример статей
- RSS, sitemap

**Этап 2. Подписки**
- Форма Buttondown
- Проверка отправки писем

**Этап 3. Анимация three.js**
- Эффект на главной
- Оптимизация, отключение при необходимости

**Этап 4. Полировка**
- SEO, OG
- Аналитика
- Тёмная тема

**Этап 5. Контент**
- 3–5 статей + карточки проектов
- Проверка Lighthouse

---

## 11) Минимальные зависимости
- `astro`, `@astrojs/mdx`, `@astrojs/tailwind`, `three`, `pagefind` (опц.)

---

## 12) Риски
- Производительность → ограничить сложность анимаций
- Спам → double-opt-in
- CI/CD → автоматические проверки
