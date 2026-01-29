# 🗓️ Urnik Lastnika - Hitna Referenca

## Kaj Je Novo?

Nov zavihek **"Urnik Lastnika"** v sekciji **"Storitve in Brivci"** omogoča upravljanje osebne odsotnosti in razpoložljivosti.

---

## ⚡ Hitni Start

### 1. Odpri Admin Panel
```
URL: /admin-panel.html
Prijava: admin / admin123
```

### 2. Pojdi na Zavihek "Storitve in Brivci"

### 3. Doli v Novo Sekcijo "📅 Urnik Lastnika"

### 4. Dodaj Vnos
```
1. Izberi Tip: Prost Dan / Pavza / Malica / Dopust / Bolniška
2. Izberi Datum Začetka
3. Izberi Čas Začetka (0-23)
4. Izberi Datum Konca
5. Izberi Čas Konca (0-23)
6. Dodaj Opombe (opciono)
7. Klikni "+ Dodaj Vnos"
```

---

## 4️⃣ Pogledi

| Pogled | Opis | Uporaba |
|--------|------|---------|
| 📅 Mesečni | Celoten mesec | Hitri pregled |
| 📋 Tedenski | Urna razdelitev | Detajlno planeranje |
| ⏰ Dnevni | Izbrani dan | Točen pregled |
| 📝 Seznam | Vsi vnosi | Upravljanje |

---

## 🎨 Barve

- 🔴 **Prost Dan** - Ni razpoložljiv
- 🟠 **Pavza** - Pavza
- 🟠 **Malica** - Čas za jed
- 🔵 **Dopust** - Počitnice
- 🟣 **Bolniška** - Bolniška

---

## 💡 Primeri

### Primer 1: Teden Dopusta
```
Tip: Dopust
Od: 10.02.2026 ob 0:00
Do: 16.02.2026 ob 23:00
```

### Primer 2: Dnevna Malica
```
Tip: Malica
Od: 01.02.2026 ob 12:00
Do: 28.02.2026 ob 13:00
```

### Primer 3: Bolniška
```
Tip: Bolniška
Od: 05.02.2026 ob 0:00
Do: 07.02.2026 ob 23:00
Opombe: Gripa
```

---

## ❌ Brisanje Vnosa

1. Pojdi na **"📝 Seznam Vnosov"**
2. Poišči vnos
3. Klikni **Izbriši**
4. Potrdi

---

## 📊 Kaj Se Vidi Kje

### Mesečni Pogled
```
┌─────────────────────┐
│ Pon Tor Sre Čet Pet │
├─────────────────────┤
│ [1]  [2]  [3] [4]  [5]  │ ← Dnevi obarvani
│ [6] 🔴 [8]  [9] [10] │ ← Prost Dan = Rdeča
│ ...                  │
└─────────────────────┘
```

### Tedenski Pogled
```
┌───┬────┬────┬────┬────┬────┬────┬────┐
│   │Pon │Tor │Sre │Čet │Pet │Sob │Ned │
├───┼────┼────┼────┼────┼────┼────┼────┤
│0:00   │    │    │🟠  │    │    │    │    │← Pavza ob 0:00
│1:00   │    │    │🟠  │    │    │    │    │
│...    │    │    │    │    │    │    │    │
└───┴────┴────┴────┴────┴────┴────┴────┘
```

### Dnevni Pogled
```
Četrtek, 5. februar 2026

┌──────────────────────────────────┐
│ Ura         │ Tip      │ Opombe   │
├──────────────────────────────────┤
│ 0:00-1:00   │ Bolniška │ Gripa    │
│ 1:00-2:00   │ Bolniška │ Gripa    │
│ ...         │          │          │
└──────────────────────────────────┘
```

### Seznam Vnosov
```
[Dopust] Ponedjeljek, 10.02.2026 - Nedelja, 16.02.2026
        Opombe: Valentinov dopust
        [Izbriši]

[Malica] Torek, 01.02.2026 - Torek, 28.02.2026
        Opombe: Običajno od 12:00 do 13:00
        [Izbriši]
```

---

## 🔑 Ključne Informacije

- ✅ Vsi vnosi se avtomatsko shranijo
- ✅ Podatki ostanejo tudi po zaprtju
- ✅ Spremembe so takoj vidne
- ✅ Ni zunanje baze potrebne
- ✅ Vsak vnos se datira
- ✅ Lahko ima opombe

---

## 🚀 Kaj Je Mogoče Narediti

✅ Nastavi proste dneve  
✅ Označi vakuum dneve  
✅ Uredi malice/pavze  
✅ Dodaj bolniško  
✅ Preglej po mesecih/tednih/dneh  
✅ Hitro izbriši vnose  
✅ Dodaj opombe k vnosom  

---

## 📞 Potrebuješ Pomoč?

Pojdi na: **ADMIN_SCHEDULE_GUIDE.md** za podrobno dokumentacijo

---

**Verzija**: 1.0
**Datum**: Februar 2026
