# Инструкция по деплою игры «Мама, я богат!» на VPS

В этой инструкции подробно описан процесс развертывания веб-игры с поддержкой WebSockets (Socket.io), построенной на базе Fullstack Node.js (Express + React + Vite) на вашем собственном выделенном сервере (VPS/VDS).

---

## Требования к серверу
* **Операционная система:** Ubuntu / Debian (рекомендуется Ubuntu 22.04 или 24.04 LTS).
* **Характеристики:** Минимум 1 vCPU, 1 GB RAM, SSD.
* **Доступ:** Права суперпользователя `root` или доступ через `sudo`.
* **Домен:** Направленный на IP вашего VPS (A-запись в панели вашего DNS-провайдера).

---

## Шаг 1. Первоначальная настройка и установка ПО

Подключитесь к вашему VPS по SSH:
```bash
ssh root@your_vps_ip
```

Обновите индекс пакетов системы:
```bash
sudo apt update && sudo apt upgrade -y
```

### 1. Установка Node.js (версия 20)
Мы установим LTS-версию Node.js через официальный дистрибутив NodeSource:
```bash
sudo apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```
Проверьте корректность установки:
```bash
node -v  # Должно быть v20.x.x
npm -v   # Выведет версию npm
```

### 2. Установка Git, Nginx и Certbot
```bash
sudo apt install -y git nginx python3-certbot-nginx build-essential
```

---

## Шаг 2. Развертывание кодовой базы проекта

### 1. Клонирование репозитория
Рекомендуется размещать веб-приложения в директории `/var/www/`:
```bash
sudo mkdir -p /var/www/mama-ya-bogat
sudo chown -R $USER:$USER /var/www/mama-ya-bogat
cd /var/www/mama-ya-bogat

# Склонируйте ваш репозиторий (или скопируйте файлы через SFTP/SCP)
# git clone <ссылка_на_ваш_репозиторий> .
```

### 2. Установка зависимостей и сборка
Установите все npm-пакеты (включая devDependencies, необходимые для сборки на сервере):
```bash
npm install
```

Запустите команду сборки. Она скомпилирует клиентскую React-часть с помощью Vite (в папку `/dist`), а серверную часть упакует в единый оптимизированный Node-файл `/dist/server.cjs` с помощью Esbuild:
```bash
npm run build
```

---

## Шаг 3. Настройка процесса через PM2 (Process Manager)

Чтобы серверная часть игры работала в фоне, автоматически перезапускалась при крашах и после перезагрузки вашей VPS, установим и настроим менеджер процессов **PM2**:

```bash
# Установка PM2 глобально
sudo npm install -y pm2 -g

# Запуск приложения
# Игра запускает Node-сервер из собранной папки dist/server.cjs на порту 3000
pm2 start dist/server.cjs --name "mama-ya-bogat"

# Сохранение списка процессов для автозапуска
pm2 save

# Настройка автозапуска PM2 при ребуте операционной системы
pm2 startup
```
*Вам будет выведена команда со специальным токеном, скопируйте и выполните её в терминале (она начинается с `sudo env PATH=...`).*

Управление процессами:
* Проверить статус приложения: `pm2 status`
* Посмотреть логи реального времени: `pm2 logs mama-ya-bogat`
* Перезагрузить приложение: `pm2 restart mama-ya-bogat`

---

## Шаг 4. Настройка веб-сервера Nginx и WebSockets

Для корректной работы игры и игровых комнат по сети необходимо использовать Nginx как реверс-прокси, который перенаправляет внешние HTTP/HTTPS запросы на локальный порт `3000` приложения, **сохраняя активным соединение WebSockets**.

Создайте конфигурационный файл для вашего домена (замените `yourdomain.com` на ваш реальный домен):

```bash
sudo nano /etc/nginx/sites-available/yourdomain.com
```

Вставьте в файл следующую конфигурацию:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Ограничение размера загружаемых файлов (при необходимости)
    client_max_body_size 10M;

    # Главный прокси для приложения и WebSockets
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        
        # Заголовки, необходимые для правильной работы WebSockets (Socket.io)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Передача реальных заголовков клиентов приложению
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Таймауты для долгоживущих WebSocket-соединений
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Настройки кэширования для статических ассетов
    location /assets/ {
        proxy_pass http://127.0.0.1:3000;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```

Сохраните файл (`Ctrl+O`, затем `Enter`) и закройте текстовый редактор (`Ctrl+X`).

Активируйте созданный виртуальный хост:
```bash
sudo ln -s /etc/nginx/sites-available/yourdomain.com /etc/nginx/sites-enabled/
```

Проверьте синтаксис конфигурации Nginx на наличие ошибок:
```bash
sudo nginx -t
```
Если всё в порядке (`syntax is ok`, `test is successful`), перезапустите Nginx:
```bash
sudo systemctl restart nginx
```

---

## Шаг 5. Получение бесплатного SSL-сертификата (HTTPS/WSS)

Браузеры требуют безопасное соединение (HTTPS) для предоставления доступа к камере телефона (для сканирования QR-кодов) и для работы современных WebSocket-соединений (`wss://` вместо `ws://`).

Используем Certbot (Let's Encrypt) для автоматического выпуска SSL сертификата:

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

* Ответьте на простые вопросы в консоли (введите email, примите пользовательское соглашение).
* Certbot спросит, нужно ли настроить автоматическое перенаправление с HTTP на HTTPS — выберите опцию автоматического редиректа (**Redirect**).
* Программа автоматически обновит конфигурационный файл Nginx и включит SSL.

---

## Шаг 6. Настройка брандмауэра (Firewall)
Убедитесь, что порты `80` (HTTP) и `443` (HTTPS) открыты для внешних подключений, а прямой порт Node.js `3000` закрыт в целях безопасности:

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

---

## Готово! 🚀
Ваша игра запущена, работает на домене `https://yourdomain.com` с защищенным HTTPS протоколом и полноценно обслуживает WebSocket-соединения для совместной игры с мобильных телефонов.

Полезные команды для мониторинга:
* Чтение логов ошибок Nginx: `sudo tail -f /var/log/nginx/error.log`
* Чтение логов сервера Socket.io: `pm2 logs mama-ya-bogat`
