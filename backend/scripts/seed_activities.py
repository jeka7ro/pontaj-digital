"""
Seed script: Populate activity categories and activities from client's work stages.

Usage: cd backend && source ../.venv/bin/activate && python3 scripts/seed_activities.py
"""
import sys
sys.path.insert(0, '.')

from app.database import SessionLocal
from app.models import ActivityCategory, Activity, Organization

db = SessionLocal()

# Get the organization
org = db.query(Organization).first()
if not org:
    print("ERROR: No organization found. Create one first.")
    sys.exit(1)

print(f"Organization: {org.name} ({org.id})")

# Delete existing activities and categories for clean seed
existing_acts = db.query(Activity).filter(Activity.organization_id == org.id).all()
for a in existing_acts:
    from app.models import TimesheetLine
    usage = db.query(TimesheetLine).filter(TimesheetLine.activity_id == a.id).count()
    if usage == 0:
        db.delete(a)
db.commit()

existing_cats = db.query(ActivityCategory).filter(ActivityCategory.organization_id == org.id).all()
for c in existing_cats:
    db.delete(c)
db.commit()

# ═══════════════════════════════════════════════════════════════════
# Categories (Etapele muncilor)
# ═══════════════════════════════════════════════════════════════════

categories_data = [
    {"name": "Baterea stalpilor", "color": "#ef4444", "sort_order": 1},
    {"name": "Structura",         "color": "#eab308", "sort_order": 2},
    {"name": "Module",            "color": "#22c55e", "sort_order": 3},
    {"name": "Invertoare",        "color": "#3b82f6", "sort_order": 4},
    {"name": "Electric - Santier","color": "#8b5cf6", "sort_order": 5},
    {"name": "Electric - Camp",   "color": "#ec4899", "sort_order": 6},
    {"name": "Statii Trafo",      "color": "#06b6d4", "sort_order": 7},
    {"name": "Masuratori",        "color": "#64748b", "sort_order": 8},
]

categories = {}
for cat_data in categories_data:
    cat = ActivityCategory(
        organization_id=org.id,
        name=cat_data["name"],
        color=cat_data["color"],
        sort_order=cat_data["sort_order"],
    )
    db.add(cat)
    db.flush()
    categories[cat_data["name"]] = cat
    print(f"  + Categorie: {cat.name} ({cat.color})")

# ═══════════════════════════════════════════════════════════════════
# Activities (Denumirea lucrarilor)
# ═══════════════════════════════════════════════════════════════════

activities_data = [
    # 1. Baterea stalpilor
    {"cat": "Baterea stalpilor", "name": "Aliniament", "unit": "buc", "sort": 1,
     "desc": "Se traseaza masuratorile conform planului de stalpi, apoi cu ajutorul tarusilor de fier se delimiteaza inceputul/sfarsitul de masa dupa care se infig sforie pentru aliniament."},
    {"cat": "Baterea stalpilor", "name": "Imprastierea", "unit": "buc", "sort": 2,
     "desc": "Se impart stalpii in conformitate cu planul de stalpi, respectand dimensiunile si amplasarea acestora in punctele marcate pe fiecare masa."},
    {"cat": "Baterea stalpilor", "name": "Baterea stalpilor", "unit": "buc", "sort": 3,
     "desc": "Cu masina GAYK, un operator si un ajutor de operator incep sa bata stalpii in pamant conform planului, respectand cotele/gradele/dimensiunile facand verificari multiple la fiecare stalp."},
    {"cat": "Baterea stalpilor", "name": "Adunat material", "unit": "buc", "sort": 4,
     "desc": "Materialele care au fost folosite precum sfoara/tarusi/spray-uri/lemne/benzi de plastic/orice mizerie ramasa atunci cand randul a fost complet batut se aduna si se lasa campul curat."},
    
    # 2. Structura
    {"cat": "Structura", "name": "Imprastierea", "unit": "buc", "sort": 1,
     "desc": "Conform planului de structura, la baza stalpilor se vor imprastia materialele aferente in functie de tipul de structura ex: C/Z/UW-Profil / Ghidere / Suruburi / Conectori / Suporti s.a.m.d."},
    {"cat": "Structura", "name": "Montaj", "unit": "buc", "sort": 2,
     "desc": "Prinderea structurii de stalpi batuti, se face conform planului de structura, acestea trebuie sa respecte dimensiunile/locatiile/tipul de structura/suruburi pentru fixare masa."},
    {"cat": "Structura", "name": "Vinclu", "unit": "buc", "sort": 3,
     "desc": "Dupa ce structura a fost pusa pe pozitie, echipele trebuie sa vina si sa puna aceeasi structura in vinclu/cote conform planului pentru a se asigura ca masa este pregatita de montaj."},
    {"cat": "Structura", "name": "Dinamometrica", "unit": "buc", "sort": 4,
     "desc": "Dupa ce toata structura a fost instalata si verificata sa fie conform planului mecanic, aceasta date a dinamometrica cum e specificat, si marcata."},
    
    # 3. Module
    {"cat": "Module", "name": "Pregatirea", "unit": "buc", "sort": 1,
     "desc": "Conform planului de module, se impart pachetele de module si se pregatesc de instalare in functie de puterea mentionata pentru fiecare masa/rand."},
    {"cat": "Module", "name": "Pregatirea 2", "unit": "buc", "sort": 2,
     "desc": "Se studiaza planul de instalare pentru module, astfel incat toate masurile sa fie conforme, se face o masa de proba si a verifica cum merge progresul."},
    {"cat": "Module", "name": "Instalarea", "unit": "buc", "sort": 3,
     "desc": "Se porneste masa in sistemul 3-2-1, se verifica cotele, vinclul sa bata cu cel al mesei, se intinde sfoara de control si se porneste montajul propriu zis."},
    {"cat": "Module", "name": "Dinamometrica", "unit": "buc", "sort": 4,
     "desc": "Dupa/In timpul instalarii in functie de cum permite structura, acestea vor fi date cu dinamometrica pentru fixarea finala a modulelor pe masa."},
    {"cat": "Module", "name": "Curatenia", "unit": "buc", "sort": 5,
     "desc": "In urma montajului de module raman folie/cartoane/plastic/paleti acesta trebuie eliminate in mod util pentru a evita imprastierea acestora in santier."},
    
    # 4. Invertoare
    {"cat": "Invertoare", "name": "Pregatirea", "unit": "buc", "sort": 1,
     "desc": "Se studiaza planul, se pregatesc materialele taiate pe cote, date cu zinc, se duc pe pozitiile din camp."},
    {"cat": "Invertoare", "name": "Montaj", "unit": "buc", "sort": 2,
     "desc": "Se monteaza suportul de invertor se verifica sa fie in grada/cote, se da la dinamometrica apoi vine montaj invertorul pe suport."},
    {"cat": "Invertoare", "name": "Pat cablu", "unit": "m", "sort": 3,
     "desc": "In functie de santier, sub invertor se pregateste/monteaza un pat de cablu unde vor veni asezate stringurile cand sunt inserate in invertor."},
    
    # 5. Electric - Santier
    {"cat": "Electric - Santier", "name": "Pregatirea", "unit": "buc", "sort": 1,
     "desc": "Se studiaza traseul santurilor si a dimensiunilor de sapat in functie de tipul acesteia pe tot parcursul lui, apoi se marcheaza cu spray/sfoara."},
    {"cat": "Electric - Santier", "name": "Excavarea", "unit": "m", "sort": 2,
     "desc": "Operatorul excavatorului se apuca de sapat la adancimile si latimile necesare, curata santul in urma lui pentru a-l lasa pregatit pentru viitoarele munci."},
    {"cat": "Electric - Santier", "name": "Pregatirea 2", "unit": "buc", "sort": 3,
     "desc": "Cu operatorii de bobcat/vola/dumper se amenajaza lopata se pregatesc santurile cu coarda de impamantare putin pamant peste aceasta, apoi se pune patul de nisip."},
    {"cat": "Electric - Santier", "name": "Tragerea", "unit": "m", "sort": 4,
     "desc": "Se trag cablurile(AC/Medie/Comunicatie/Fibra/TUB) aferente conform planului, de la pozitiile invertoarelor la statiile trafo, respectand ordinea/numarul/distantele."},
    {"cat": "Electric - Santier", "name": "Finalizarea", "unit": "buc", "sort": 5,
     "desc": "Se acopera conform planului de sant cu nisip, pamant, banda avertizoare, inchide santul, se niveleaza, si se lasa totul la gata."},
    
    # 6. Electric - Camp
    {"cat": "Electric - Camp", "name": "Pregatirea", "unit": "buc", "sort": 1,
     "desc": "Se studiaza traseele cablurilor pe structura/tipul de cablu/modul mai rapid de executare/se face masa de proba cu modelul de pozat/mutat/modelul cablului."},
    {"cat": "Electric - Camp", "name": "Tragerea cablului", "unit": "m", "sort": 2,
     "desc": "Se trag cablurile in functie de modelul de la masa de proba, respectand fiecare timp de masa per model Linie/X/S/jumate."},
    {"cat": "Electric - Camp", "name": "Pregatit module", "unit": "buc", "sort": 3,
     "desc": "Se taie soricelul de la module, se mufeaza modulele intre ele in functie de model 1/3 - 2/4 sau altfel in functie de tipul de module."},
    {"cat": "Electric - Camp", "name": "Pregatit mufe", "unit": "buc", "sort": 4,
     "desc": "Pe capetele de string care raman in camp, se decableaza/se crimpeaza pin-ul/se pune mufa aferenta apoi se conecteaza la modul."},
    {"cat": "Electric - Camp", "name": "Pregatit mufe WR", "unit": "buc", "sort": 5,
     "desc": "Se masoara polaritatea fiecarui string, se scurteaza/noteaza din nou pe pozitie, se decableaza/crimpeaza/pune mufa apoi sunt semi-prinse in pozitia din MPP a invertorului."},
    
    # 7. Statii Trafo
    {"cat": "Statii Trafo", "name": "Pregatirea", "unit": "buc", "sort": 1,
     "desc": "Se studiaza planul fundamentului pentru statia trafo, amplasarea acesteia in punctele cheie definite in santier."},
    {"cat": "Statii Trafo", "name": "Executarea", "unit": "buc", "sort": 2,
     "desc": "Conform planului, se excaveaza groapa, apoi este pus ringul de impamantare, se vine cu material geotextil, se pune piatra cubica/piatra sparta, se compacteaza si se pregateste."},
    {"cat": "Statii Trafo", "name": "Executarea 2", "unit": "buc", "sort": 3,
     "desc": "In functie de santier, tipul de statie aici pot aparea diferente cum ar fi postamente de beton ex:Schonefeld, sau direct pe un sir de sort."},
    {"cat": "Statii Trafo", "name": "Amplasarea", "unit": "buc", "sort": 4,
     "desc": "Statiile sunt de obicei achizitionate si amplasate de catre Beneficiar, IGS va asista la aceasta daca cumva este nevoie de interventie de ultim moment."},
    {"cat": "Statii Trafo", "name": "Conectarea", "unit": "buc", "sort": 5,
     "desc": "Dupa ce a fost instalata, se vor aduce/pune pe pozitile cablurile aferente Medie/AC/Comunicatie/Fibra/Senzori/Alimentari si vor fi conectat in baza documentatiei."},
    
    # 8. Masuratori
    {"cat": "Masuratori", "name": "Pregatirea", "unit": "buc", "sort": 1,
     "desc": "Toate cablurile electrice din santier, vor fi verificate cu ajutorul aparaturilor specifice Benning/PV/Metes/s.a.m.d astfel incat sa nu fie erori de polaritate/volte/tensiune."},
    {"cat": "Masuratori", "name": "Raportul", "unit": "buc", "sort": 2,
     "desc": "Fiecare masuratoare efectuata pe AC/MV/DC/Impamantare sunt salvate in functie de tipul de aparat necesar, verificat si apoi trimise catre client."},
]

created = 0
for act_data in activities_data:
    cat = categories[act_data["cat"]]
    act = Activity(
        organization_id=org.id,
        category_id=cat.id,
        name=act_data["name"],
        description=act_data["desc"],
        unit_type=act_data["unit"],
        sort_order=act_data["sort"],
    )
    db.add(act)
    created += 1

db.commit()
db.close()

print(f"\n--- Seed complet: {len(categories_data)} categorii, {created} activitati ---")
