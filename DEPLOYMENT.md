# Руководство по деплою

Это руководство объясняет, как развернуть блог на Cloudflare Pages.

## Настройка Cloudflare Pages

### Автоматический деплой из GitHub

1. **Подключить репозиторий к Cloudflare Pages:**
   - Перейти в [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Открыть **Workers & Pages** → **Create Application** → **Pages** → **Connect to Git**
   - Выбрать GitHub репозиторий: `shikoucore/vremyavnikuda_blog`

2. **Настроить параметры сборки:**
   ```
   Production branch: main
   Build command: npm run build
   Build output directory: dist
   Root directory: (оставить пустым)
   Environment variables: (не требуются)
   ```

3. **Версия Node.js:**
   - Добавить переменную окружения: `NODE_VERSION = 20`

4. **Деплой:**
   - Нажать **Save and Deploy**
   - Cloudflare Pages автоматически соберет и развернет проект при каждом push в `main`

### Конфигурация сборки

Процесс сборки выполняет:
1. Проверка типов: `astro check`
2. Сборка: `astro build`
3. Выходная директория: `dist/`

### Preview деплойменты

Cloudflare Pages автоматически создает preview деплойменты для:
- Каждого pull request
- Каждого push в ветку

Формат preview URL: `https://<branch>.<project>.pages.dev`

### Настройка кастомного домена

1. **Добавить кастомный домен:**
   - В настройках проекта Cloudflare Pages
   - Перейти в **Custom domains**
   - Нажать **Set up a custom domain**
   - Ввести имя домена
   - Следовать инструкциям по настройке DNS

2. **SSL/HTTPS:**
   - Автоматически предоставляется Cloudflare
   - Бесплатный SSL сертификат включен
   - Автоматические редиректы на HTTPS

### Настройка редиректов

Для настройки редиректов (например, www → non-www), создайте `public/_redirects`:

```
# Редирект с www на non-www (пример)
https://www.yourdomain.com/* https://yourdomain.com/:splat 301

# Редирект с корня на японскую версию (если нужно)
/ /ja 301
```

## Альтернатива: Деплой на Vercel

Если вы предпочитаете Vercel вместо Cloudflare Pages:

1. **Импортировать проект:**
   - Перейти в [Vercel Dashboard](https://vercel.com/dashboard)
   - Нажать **Add New** → **Project**
   - Импортировать `shikoucore/vremyavnikuda_blog`

2. **Настройки сборки:**
   ```
   Framework Preset: Astro
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm ci
   ```

3. **Переменные окружения:**
   - Не требуются для базовой настройки

4. **Деплой:**
   - Vercel автоматически определяет Astro и настраивает всё
   - Автоматический деплой при push в `main`
   - Preview деплойменты для PR

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/ci.yml`) запускается:
- При каждом push в `main`
- При каждом pull request

Выполняет:
- Проверку типов (`npm run check`)
- Проверку сборки (`npm run build`)
- Загрузку артефактов сборки (только для main ветки)

## Мониторинг

### Cloudflare Pages
- Проверка статуса деплоя в Cloudflare Dashboard
- Просмотр логов сборки для каждого деплоя
- Аналитика доступна в дашборде

### GitHub Actions
- Проверка статуса CI в GitHub репозитории
- Просмотр запусков workflow во вкладке **Actions**
- Неудачные сборки будут показаны в pull requests

## Откат версии

Если деплой вызвал проблемы:

**Cloudflare Pages:**
1. Перейти во вкладку **Deployments**
2. Найти предыдущий рабочий деплой
3. Нажать **⋯** → **Rollback to this deployment**

**Vercel:**
1. Перейти во вкладку **Deployments**
2. Найти предыдущий рабочий деплой
3. Нажать **⋯** → **Promote to Production**

## Оптимизация производительности

Чек-лист после деплоя:
- [ ] Запустить Lighthouse audit на production URL
- [ ] Проверить Core Web Vitals
- [ ] Протестировать на мобильных устройствах
- [ ] Проверить работу RSS feed
- [ ] Протестировать форму email подписки
- [ ] Проверить все языковые версии (ja, en)

## Устранение неполадок

### Сборка падает с ошибками типов
- Запустить `npm run check` локально
- Исправить ошибки TypeScript
- Сделать push исправлений и пересобрать

### 404 на некоторых маршрутах
- Проверить конфигурацию роутинга Astro
- Убедиться, что все страницы находятся в `src/pages/`
- Убедиться, что trailing slashes используются последовательно

### Медленная сборка
- Проверить размер бандла: `npm run build -- --verbose`
- Рассмотреть уменьшение зависимостей
- Оптимизировать изображения перед загрузкой

### Проблемы, специфичные для окружения
- Протестировать сборку локально: `npm run build && npm run preview`
- Проверить, что версия Node.js совпадает с production (v20)
- Убедиться, что все зависимости указаны в `package.json`

## Контакты и поддержка

По вопросам деплоя:
- Cloudflare Pages: [Cloudflare Community](https://community.cloudflare.com/)
- Vercel: [Vercel Support](https://vercel.com/support)
- Astro: [Astro Discord](https://astro.build/chat)

