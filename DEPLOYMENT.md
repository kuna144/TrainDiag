# TrainDiag - Instrukcja Wdrożenia

## 🚀 Jak uruchomić aplikację na dowolnym komputerze

### Wymagania
- Node.js (wersja 18 lub nowsza)
- npm

### Kroki instalacji

1. **Skopiuj cały folder aplikacji** na docelowy komputer

2. **Zainstaluj zależności**:
   ```bash
   npm install
   ```

3. **Zbuduj aplikację**:
   ```bash
   npm run build
   ```

4. **Uruchom serwer**:
   ```bash
   npm run server
   ```
   
   Lub alternatywnie (build + start jedną komendą):
   ```bash
   npm run serve
   ```

### 🌐 Dostęp do aplikacji
- Aplikacja będzie dostępna pod adresem: **http://localhost:3000**
- API Proxy: **http://localhost:3000/api**

### ⚙️ Konfiguracja
- Adres IP sterownika można zmienić w pliku `src/config.json`
- Domyślny adres: `192.168.0.100`

### 📦 Zawartość serwera
- **Frontend**: Pliki React z folderu `dist/`
- **API Proxy**: Przekierowanie zapytań do sterownika
- **Port**: 3000 (można zmienić ustawiając zmienną PORT)

### 🔧 Komendy npm

| Komenda | Opis |
|---------|------|
| `npm run build` | Buduje aplikację do folderu `dist/` |
| `npm run server` | Uruchamia serwer z proxy |
| `npm run serve` | Buduje i uruchamia serwer (wszystko w jednym) |
| `npm start` | Tryb deweloperski (z hot reload) |

### 📋 Rozwiązywanie problemów

**Problem**: Serwer nie startuje
- Sprawdź czy port 3000 nie jest zajęty
- Upewnij się, że zainstalowałeś wszystkie zależności (`npm install`)

**Problem**: Brak połączenia z sterownikiem
- Sprawdź adres IP w `src/config.json`
- Upewnij się, że sterownik jest dostępny w sieci

**Problem**: Aplikacja nie ładuje się
- Sprawdź czy zostały zbudowane pliki w folderze `dist/`
- Uruchom ponownie `npm run build`

### 🌟 Zalety tego rozwiązania
- ✅ Wszystko w jednej aplikacji (frontend + proxy)
- ✅ Łatwe przenoszenie między komputerami
- ✅ Nie wymaga osobnej konfiguracji proxy
- ✅ Pojedynczy port dla całej aplikacji
- ✅ Gotowe do produkcji