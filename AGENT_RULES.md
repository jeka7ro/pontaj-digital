# Reguli Stricte pentru Git Push și Commit

Acest set de reguli definește protocolul obligatoriu pe care trebuie să îl urmez înainte de a face orice modificare în repository-ul Git (commit sau push). 

Scopul este evitarea oricăror confuzii între proiecte și asigurarea controlului total al utilizatorului asupra codului trimis în producție.

## Datele Oficiale ale Proiectului (Unde se trimite codul)
- **Git Repository:** `https://github.com/jeka7ro/pontaj-digital.git` (pe branch-ul `main`)
- **Netlify (Frontend):** `igs.pontaj.app` (își face deploy automat la orice push pe main)

## 1. Verificarea Contextului (Repository-ul corect)
Înainte de a iniția orice proces de salvare a codului, voi rula `git status` și voi verifica explicit directorul curent pentru a confirma în ce proiect mă aflu. 
**Regulă:** Nu mă voi baza pe reguli globale mai vechi dacă directorul curent de lucru indică un alt repository.

## 2. Prezentarea Modificărilor (Review)
Nu voi face niciodată `git commit` sau `git push` din proprie inițiativă. În schimb, voi urma acești pași:
1. Voi rula `git status` și/sau `git diff` pentru a vedea exact ce s-a modificat.
2. Îți voi prezenta o listă clară cu:
   - **Fișierele modificate**
   - **Mesajul de commit propus** (ex: `fix: ...`)
   - **Repository-ul (link-ul)** către care urmează să se facă push-ul (care trebuie să fie mereu `https://github.com/jeka7ro/pontaj-digital.git`).

## 3. Aprobarea Explicită (Mecanismul de Siguranță)
După ce îți prezint detaliile de la punctul 2, **mă voi opri și voi aștepta confirmarea ta explicită**.
Doar după ce răspunzi cu "da", "ok", "push", sau ceva similar, voi executa comanda efectivă de `git add`, `git commit` și `git push`.

## 4. Raportarea Rezultatului
După executarea push-ului, îți voi confirma că acțiunea s-a finalizat cu succes, menționând exact ramura (branch-ul) și mediul actualizat.
