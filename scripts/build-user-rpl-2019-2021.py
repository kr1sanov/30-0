"""Convert the three user-provided Markdown rosters into auditable game snapshots.

Usage: python3 scripts/build-user-rpl-2019-2021.py <directory-with-md-files>
The generated JSON is committed; this converter is only needed to regenerate it.
"""
import hashlib
import json
import re
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
sources = Path(sys.argv[1])
target = root / 'docs/research/rpl-2019-2021'
target.mkdir(parents=True, exist_ok=True)
registry = json.loads((root / 'docs/research/rpl-2010-2018/registry.json').read_text())
valid = {'GK':'ВР','CB':'ЦЗ','RB':'ПЗ','LB':'ЛЗ','RWB':'ПФЗ','LWB':'ЛФЗ','CDM':'ОП','CM':'ЦП','CAM':'АП','LM':'ЛП','RM':'ПП','LW':'ЛВ','RW':'ПВ','ST':'НП','CF':'ЦН'}
clubs = {
 'Akhmat Grozny':'110109', 'Anzhi Makhachkala':'100766', 'Arsenal Tula':'110756',
 'CSKA Moskva':'315', 'CSKA Moscow':'315', 'Dinamo Moscow':'312', 'Dynamo Moscow':'312',
 'FC Krasnodar':'112218', 'Krasnodar':'112218', 'FC Orenburg':'112261', 'Orenburg':'112261',
 'FC Rostov':'110231', 'Rostov':'110231', 'FC Ufa':'110822', 'Ufa':'110822',
 'FC Ural':'111264', 'Ural Yekaterinburg':'111264',
 'Krylya Sovetov Samara':'100764', 'Lokomotiv Moskva':'100765', 'Lokomotiv Moscow':'100765',
 'Rubin Kazan':'110227', 'Spartak Moskva':'100767', 'Spartak Moscow':'100767',
 'Yenisey Krasnoyarsk':'111059', 'Zenit':'100769', 'Zenit Saint Petersburg':'100769',
 'Tambov':'tambov', 'Sochi':'sochi', 'Khimki':'110239', 'Nizhny Novgorod':'nizhny-novgorod',
}
existing_names = {}
for source_id, player in registry['players'].items():
 existing_names.setdefault(player['canonicalName'], []).append(source_id)

all_names = ['Russia Premier League 2019.md', 'Russian Premier League 2020.md', 'Russian Premier League 2021.md']
id_by_name = {name: ids[0] for name, ids in existing_names.items() if len(ids) == 1}
for filename in all_names:
 year = int(re.search(r'20\d\d', filename).group())
 raw = (sources / filename).read_bytes()
 current = None
 records = []
 club_counts = {}
 adjustments = []
 for lineno, line in enumerate(raw.decode('utf-8-sig').splitlines(), 1):
  if line.startswith('## '):
   heading = line[3:].strip()
   current = re.sub(r' \(ID \d+; \d+ игроков\)$', '', heading)
   if current not in clubs: raise ValueError(f'{filename}:{lineno}: unknown club {current}')
   if current in club_counts: raise ValueError(f'{filename}:{lineno}: repeated club')
   club_counts[current] = 0
   continue
  if not current or not line.startswith('|'): continue
  parts = [p.strip() for p in line.strip().strip('|').split('|')]
  if year == 2019:
   if len(parts) != 8 or not parts[0].isdigit(): continue
   source_id, name, nationality, primary, secondary, rating, potential, number = parts
   positions = [primary, *[p.strip() for p in secondary.split(',')]]
  else:
   if len(parts) != 5 or not parts[2].isdigit(): continue
   name, position_text, rating, potential, number = parts
   positions = [p.strip() for p in position_text.split(',')]
   source_id = None
   nationality = None
  if not name or not rating.isdigit() or not potential.isdigit() or not number.isdigit():
   raise ValueError(f'{filename}:{lineno}: incomplete player card')
  known = [valid[p] for p in positions if p in valid]
  if not known: raise ValueError(f'{filename}:{lineno}: no supported position for {name}')
  if len(known) != len([p for p in positions if p != '—']):
   adjustments.append({'line':lineno,'name':name,'sourcePositions':positions,'usablePositions':known})
  if not (1 <= int(rating) <= 100 and 1 <= int(potential) <= 100):
   raise ValueError(f'{filename}:{lineno}: invalid OVR/POT')
  if source_id is None:
   source_id = id_by_name.get(name)
   if source_id is None:
    source_id = 'name-' + hashlib.sha256(name.encode()).hexdigest()[:16]
  else:
   if name in id_by_name and id_by_name[name] != source_id:
    raise ValueError(f'{filename}:{lineno}: conflicting player ID for {name}')
   id_by_name[name] = source_id
  card = {'clubId':clubs[current], 'clubName':current, 'sourcePlayerId':source_id,
          'name':name, 'positions':known, 'sourcePositions':positions,
          'rating':int(rating), 'potential':int(potential), 'number':int(number)}
  if nationality: card['nationality'] = nationality
  records.append(card)
  club_counts[current] += 1
 if len(club_counts) != 16: raise ValueError(f'{filename}: expected 16 clubs, got {len(club_counts)}')
 duplicate_names = []
 for card in records:
  same = [item for item in records if item['clubId'] == card['clubId'] and item['name'] == card['name']]
  if len(same) > 1:
   duplicate_names.append({'club':card['clubName'], 'name':card['name'], 'number':card['number']})
   card['sourcePlayerId'] = 'ambiguous-' + hashlib.sha256(f"{year}:{card['clubId']}:{card['name']}:{card['number']}".encode()).hexdigest()[:16]
 if len({(r['clubId'],r['sourcePlayerId']) for r in records}) != len(records):
  raise ValueError(f'{filename}: duplicate club/player card')
 snapshot = {'year':year,'edition':str(year), 'sourceFile':filename,
             'sourceSha256':hashlib.sha256(raw).hexdigest(), 'clubCounts':club_counts,
             'positionAdjustments':adjustments, 'duplicateNames':duplicate_names, 'players':records}
 (target / f'season-{year}.json').write_text(json.dumps(snapshot, ensure_ascii=False, indent=2)+'\n')
 print(f'{year}: {len(club_counts)} clubs, {len(records)} cards, {len(adjustments)} unresolved position tokens')
