# Urnik Lastnika - Admin Schedule Management Guide

## 📋 Pregled Funkcionalnosti

Nova sekcija "Urnik Lastnika" v zavihku **"Storitve in Brivci"** omogoča upravljanje osebne dostopnosti lastnika z naslednjimi funkcionalnostmi:

### ✨ Tipi Vnosov
- **Prost Dan** (rdeča) - Dan, ko lastnik ni razpoložljiv
- **Pavza** (oranžna) - Kratka pavza med delom
- **Malica** (temno oranžna) - Čas za malico
- **Dopust** (modra) - Planirani dopust
- **Bolniška** (vijolična) - Bolniška odsotnost

---

## 🎯 Kako Dodati Vnos v Urnik

### Korak 1: Izbira Tipa
Iz spustnega seznama izberi tip vprašane odsotnosti:
- Prost Dan
- Pavza
- Malica
- Dopust
- Bolniška

### Korak 2: Nastavitev Datuma in Časa
1. **Datum Začetka** - Izberi dan, ko se vnos začne
2. **Čas Začetka** - Vnesi uro (0-23) ali pusti privzeto
3. **Datum Konca** - Izberi dan, ko se vnos konča
4. **Čas Konca** - Vnesi končno uro (0-23) ali pusti privzeto
5. **Opombe** (opciono) - Dodaj posebne opombe

### Korak 3: Shranjevanje
Klikni na gumb **"+ Dodaj Vnos"** za shranjevanje.

---

## 📊 Pogledi Urnikom

### 1️⃣ Mesečni Pogled (📅 Mesečni Pogled)
**Kaj vidiš:**
- Celoten mesec na pogled
- Dnevi obarvani po tipu odsotnosti
- Hitro pregledovanje vnošenih podatkov

**Kako ga uporabiti:**
- Klikni gumba **← Prejšnji** in **Naslednji →** za navigacijo med meseci
- Obarva se celoten dan, če ima kaj vnosov
- V primeru večih vnosov se prikaže prvi (po prioriteti)

---

### 2️⃣ Tedenski Pogled (📋 Tedenski Pogled)
**Kaj vidiš:**
- 7 dni v tednu
- 24 ur na dan
- Natančni pregled po urah

**Kako ga uporabiti:**
- Vidiš točne ure vnosov za vsak dan
- Vsaka celica predstavlja 1 uro
- Obarvana je s teoretičnim tipom vnosov
- Klikni **← Prejšnji** in **Naslednji →** za navigacijo med tedni

---

### 3️⃣ Dnevni Pogled (⏰ Dnevni Pogled)
**Kaj vidiš:**
- Posamezni dan izbran v polju za izbiro datuma
- Detajlne ure z opombami

**Kako ga uporabiti:**
1. Izberi dan v polju datuma
2. Pregled vseh vnosov za ta dan v tabelarni obliki
3. Klikni **← Prejšnji** in **Naslednji →** za premik na prejšnji/naslednji dan

**Kaj je prikazano:**
- Točna ura (npr. 9:00 - 10:00)
- Tip odsotnosti
- Opombe (če obstajajo)

---

### 4️⃣ Seznam Vnosov (📝 Seznam Vnosov)
**Kaj vidiš:**
- Kronološki seznam vseh vnosov
- Najnovejši vnosi na vrhu
- Možnost hitrega brisanja

**Kako ga uporabiti:**
1. Pregled celotnega seznama odsotnosti
2. Vsak vnos prikazuje:
   - Tip (z barvo in oznako)
   - Datumi in ure
   - Opombe (če obstajajo)
3. Klikni **Izbriši** za brisanje vnosov

---

## 🎨 Legenda Barv

| Barva | Tip | Pomen |
|-------|-----|-------|
| 🔴 Rdeča | Prost Dan | Lastnik ni razpoložljiv celega dne |
| 🟠 Oranžna | Pavza | Kratka pavza med delom |
| 🟠 Temno oranžna | Malica | Čas za malico |
| 🔵 Modra | Dopust | Planirani dopust |
| 🟣 Vijolična | Bolniška | Bolniška odsotnost |

---

## 📝 Primeri Uporabe

### Primer 1: Teden Dopusta
```
Tip: Dopust
Datum Začetka: 10.02.2026
Čas Začetka: 0
Datum Konca: 16.02.2026
Čas Konca: 23
Opombe: Valentinov dopust
```

### Primer 2: Malica Vsak Dan
```
Tip: Malica
Datum Začetka: 01.02.2026
Čas Začetka: 12
Datum Konca: 28.02.2026
Čas Konca: 13
Opombe: Povečini od 12:00 do 13:00
```

### Primer 3: Bolniška Odsotnost
```
Tip: Bolniška
Datum Začetka: 05.02.2026
Čas Začetka: 0
Datum Konca: 07.02.2026
Čas Konca: 23
Opombe: Gripa
```

---

## 🔄 Upravljanje Vnosov

### Brisanje Vnosov
1. Pojdi v **Seznam Vnosov** (📝)
2. Poišči vnos, ki ga želiš izbrisati
3. Klikni **Izbriši**
4. Potrdi brisanje v pojavnem oknu

### Urejanje Vnosov
Če želiš spremeniti vnos:
1. Izbriši stari vnos
2. Dodaj novega s pravimi podatki

---

## 💾 Shranjevanje in Sinhronizacija

- **Avtomatsko shranjevanje**: Vsi vnosi se avtomatsko shranijo v localStorage
- **Varnost**: Podatki ostanejo tudi po zapiranju zavihka
- **Sinhronizacija**: Spremembe se takoj vidijo v vseh pogledam

---

## ⚙️ Tehnični Podatki

### Struktura Podatkov
```javascript
{
  id: timestamp,
  type: 'prost_dan|pavza|malica|dopust|bolniska',
  startDate: 'YYYY-MM-DD',
  startTime: 0-23,
  endDate: 'YYYY-MM-DD',
  endTime: 0-23,
  notes: 'string (optional)',
  createdAt: 'ISO timestamp'
}
```

### Shranjeno v
Podatki se shranijo v `SITE_CONFIG.adminSchedule.entries`

---

## 🚀 Napredne Funkcije

### Filtriranje po Tipu (v Seznamu Vnosov)
Polje **"Filtriraj po tipu..."** ti omogoča hitro iskanje vnosov po tipu, čeprav ta funkcija zahteva malo više kodiranja za полную implementacijo.

### Navigacija Med Datumi
Vsi pogledi omogočajo navigacijo s puščičastimi gumbi za enostavno premikanje na prejšnje/naslednje mesece, tedne ali dni.

---

## ⚡ Hitri Namigi

1. **Hitro dodaj ponavljajoče se vnose** - Npr. za malico: nastavi roček čez celoten mesec
2. **Uporabi opombe** - Dodaj dodatne informacije (npr. "Počitnice na morju")
3. **Preklapi med pogledi** - Mesečni za hitro pregled, tedenski za detajle, dnevni za specifičen dan
4. **Naredi redne urnike** - Nastavi ponavljajoče se pavze ali malice za konsistentnost

---

## 📞 Opombe

- Vsi vnosi so relativni na Slovenski čas (sl-SI lokalo)
- Podatki se shranijo lokalno v brskalniku
- Za bolj kompleksne urnike razmisli o dodajanju bolj podrobnih opomb

---

**Zadnja posodobka**: februar 2026
