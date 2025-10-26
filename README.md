# Diagnostyka Toalet Próżniowych - PWA

Progressive Web Application do diagnostyki i sterowania sterownikami toalet próżniowych.

## 🚀 Instalacja

```bash
npm install
```

## 💻 Uruchomienie aplikacji (tryb deweloperski)

```bash
npm start
```

Aplikacja będzie dostępna pod adresem: `http://localhost:3000`

## 📦 Build produkcyjny

```bash
npm run build
```

Zbudowana aplikacja znajdzie się w katalogu `dist/`

## 📱 Funkcje

- ✅ **Sterowanie ręczne** - kontrola wyjść LED
- ✅ **Odczyty czujników** - monitoring wartości analogowych
- ✅ **Lista błędów** - podgląd i kasowanie błędów
- ✅ **Historia błędów** - zapisywanie błędów lokalnie
- ✅ **Auto-odświeżanie** - automatyczna aktualizacja danych
- ✅ **Tryb offline** - działa po pierwszym załadowaniu
- ✅ **Instalowalna** - możliwość instalacji jako aplikacja
- ✅ **Touch-optimized** - zoptymalizowana pod ekrany dotykowe

## ⚙️ Konfiguracja

### Ustawienia połączenia

W aplikacji w zakładce "Ustawienia" możesz skonfigurować:
- Adres IP sterownika (domyślnie: `192.168.0.100`)
- Nazwa użytkownika (domyślnie: `guest`)
- Hasło (domyślnie: `guest`)

### Edycja endpointów

Endpointy API można edytować w pliku `src/config.json`:

```json
{
  "endpoints": {
    "errorCounter": "/errorcounter.cgx",
    "errorCounterDetail": "/errorcounter.cgi?counter={id}",
    "outputs": "/out.cgx",
    "manualControl": "/manualControl.cgi"
  },
  "defaultSettings": {
    "ipAddress": "192.168.0.100",
    "username": "guest",
    "password": "guest"
  },
  "refreshInterval": 2000,
  "timeout": 5000
}
```

## 🔧 Struktura projektu

```
TrainDiag/
├── public/
│   ├── index.html          # Główny plik HTML
│   ├── manifest.json       # Manifest PWA
│   └── service-worker.js   # Service Worker (offline)
├── src/
│   ├── components/
│   │   ├── Settings.js          # Ustawienia połączenia
│   │   ├── ManualControl.js     # Sterowanie ręczne
│   │   ├── SensorReadings.js    # Odczyty czujników
│   │   └── ErrorList.js         # Lista błędów
│   ├── utils/
│   │   └── api.js          # Komunikacja z API
│   ├── config.json         # Konfiguracja endpointów
│   ├── App.js              # Główny komponent
│   ├── App.css             # Style
│   └── index.js            # Entry point
├── package.json
├── webpack.config.js
└── README.md
```

## 🌐 Instalacja jako PWA

1. Otwórz aplikację w przeglądarce
2. W menu przeglądarki wybierz "Zainstaluj aplikację" lub "Dodaj do ekranu głównego"
3. Aplikacja będzie dostępna jako natywna aplikacja

## 📊 API Endpoints

Aplikacja komunikuje się ze sterownikiem przez następujące endpointy:

- `GET /errorcounter.cgx` - pobiera liczniki błędów
- `GET /errorcounter.cgi?counter={id}` - szczegóły licznika błędów
- `GET /out.cgx` - stan wyjść i wejść
- `POST /manualControl.cgi` - sterowanie wyjściami

Wszystkie żądania używają Basic Authentication.

## 🔒 Bezpieczeństwo

- Aplikacja używa Basic Authentication
- Dane logowania są przechowywane lokalnie w localStorage
- Zalecane jest używanie w bezpiecznej sieci lokalnej

## 📝 Licencja

MIT
