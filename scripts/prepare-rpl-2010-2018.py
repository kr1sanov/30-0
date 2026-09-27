#!/usr/bin/env python3
"""Validate the nine supplied league pages and emit deterministic season snapshots.

Source names, IDs, ratings and positions are retained. A player can have two
club records in one edition; both are kept under the same stable player ID.
"""
import argparse
import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

from importlib.machinery import SourceFileLoader

ROOT = Path(__file__).resolve().parents[1]
POSITIONS = SourceFileLoader('fifa10_positions', str(ROOT / 'scripts/prepare-fifa10-rpl.py')).load_module().POSITIONS | {
    'ПФД': 'ПВ', 'ЛВ': 'ЛВ', 'ПВ': 'ПВ',
}
CANONICAL_CLUBS = {
    '100764': 'Krylya Sovetov Samara', '100765': 'Lokomotiv Moscow',
    '100766': 'Anzhi Makhachkala', '100767': 'Spartak Moscow',
    '100768': 'Torpedo Moskva', '100769': 'Zenit St. Petersburg',
    '110089': 'Kuban Krasnodar', '110101': 'SKA Khabarovsk',
    '110103': 'Spartak Nalchik', '110106': 'Mordovia Saransk',
    '110109': 'Akhmat Grozny', '110225': 'Saturn Ramenskoye',
    '110227': 'Rubin Kazan', '110229': 'FC Moskva',
    '110230': 'Alania Vladikavkaz', '110231': 'FC Rostov',
    '110233': 'Tom Tomsk', '110234': 'Amkar Perm',
    '110239': 'FC Khimki', '110756': 'Arsenal Tula',
    '110822': 'FC Ufa', '111264': 'Ural Ekaterinburg',
    '111266': 'Sibir Novosibirsk', '112217': 'Volga',
    '112218': 'FC Krasnodar', '112261': 'FC Orenburg',
    '113704': 'FC Tosno', '312': 'Dynamo Moscow',
    '315': 'CSKA Moscow',
}
CLUB_LINK = re.compile(r'\[!\[\]\((https://images\.fifaindex\.com/fifa\d+/teams/(\d+)\.png)\)([^]]+)\]\((https://fifaindex\.com/ru/teams/[^)]+)\)')
PLAYER_LINK = re.compile(r'^\[([^]]+)\]\((https://fifaindex\.com/ru/players/(\d+)-[^)]+)\)$')
NATION = re.compile(r'!\[([^]]+)\]')
COUNT = re.compile(r'Состав \((\d+) игроков\)')


def parse(input_dir: Path):
    files = {year: input_dir / f'Russia Premier League {year}.md' for year in range(2010, 2019)}
    missing = [str(path) for path in files.values() if not path.is_file()]
    if missing:
        raise ValueError('Не хватает сезонов: ' + ', '.join(missing))
    registry = defaultdict(lambda: {'rawNames': set(), 'seasons': set()})
    identity = defaultdict(lambda: {'names': set(), 'seasons': set()})
    snapshots = {}
    for year, path in files.items():
        text = path.read_text(encoding='utf-8')
        sections = re.split(r'(?m)^# (.+)$', text)
        table = {}
        for line in sections[0].splitlines():
            match = CLUB_LINK.search(line)
            if not match:
                continue
            _logo, club_id, raw_name, _url = match.groups()
            if club_id not in CANONICAL_CLUBS or club_id in table:
                raise ValueError(f'{year}: unknown/duplicate club ID {club_id}')
            cells = [v.strip() for v in line.split('|')[2:-1]]
            if len(cells) != 6 or any(not v.isdigit() for v in cells[:4]):
                raise ValueError(f'{year}: invalid club row {raw_name}')
            table[club_id] = {'sourceClubId': club_id, 'sourceName': raw_name,
                              'ratings': list(map(int, cells[:4]))}
        if len(table) != 16 or len(sections[1::2]) != 16:
            raise ValueError(f'{year}: expected 16 table rows and 16 complete squad sections')
        clubs = []
        matched = set()
        for header, body in zip(sections[1::2], sections[2::2]):
            matches = [c for c in table.values() if header == c['sourceName'] or
                       (c['sourceClubId'] == '100766' and header in ('Anzhi Makhachkala', 'Anji Makhachkala'))]
            if len(matches) != 1:
                raise ValueError(f'{year}: cannot link squad to stable club ID: {header}')
            club = matches[0].copy()
            club_id = club['sourceClubId']
            if club_id in matched:
                raise ValueError(f'{year}: duplicate squad for {header}')
            matched.add(club_id)
            count = COUNT.search(body)
            if not count:
                raise ValueError(f'{year}: missing squad count for {header}')
            players = []
            seen_in_club = set()
            for line_number, line in enumerate(body.splitlines(), 1):
                if not line.startswith('|') or '/players/' not in line:
                    continue
                cells = [v.strip() for v in line.split('|')[1:-1]]
                match = PLAYER_LINK.fullmatch(cells[1]) if len(cells) == 10 else None
                nation = NATION.search(cells[2]) if match else None
                if not match or not nation or cells[3] not in POSITIONS:
                    raise ValueError(f'{year}/{header}:{line_number} invalid name, nation or position')
                name, _url, player_id = match.groups()
                if player_id in seen_in_club:
                    raise ValueError(f'{year}/{header}: duplicate player ID {player_id}')
                seen_in_club.add(player_id)
                try:
                    number, age, overall, potential = [int(cells[i]) for i in (0, 4, 5, 6)]
                except ValueError as exc:
                    raise ValueError(f'{year}/{header}:{line_number} invalid numeric field') from exc
                if not (1 <= number <= 99 and 15 <= age <= 50 and 1 <= overall <= 99 and 1 <= potential <= 99):
                    raise ValueError(f'{year}/{header}:{line_number} out-of-range field')
                players.append({'sourcePlayerId': player_id, 'sourceName': name,
                                'nationality': nation.group(1),
                                'shirtNumber': number, 'age': age,
                                'sourcePosition': cells[3], 'mainPosition': POSITIONS[cells[3]],
                                'rating': overall, 'primeRating': potential})
                identity[player_id]['names'].add(name)
                identity[player_id]['seasons'].add(year)
            if len(players) != int(count.group(1)):
                raise ValueError(f'{year}/{header}: parsed {len(players)} != source {count.group(1)}')
            club['sectionName'] = header
            club['players'] = players
            clubs.append(club)
            registry[club_id]['rawNames'].update((club['sourceName'], header))
            registry[club_id]['seasons'].add(year)
        if matched != set(table):
            raise ValueError(f'{year}: table/squad club ID mismatch')
        snapshots[year] = {'year': year,
                           'sourceFileSha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                           'clubs': clubs, 'audit': {'clubs': len(clubs),
                                                     'playerSeasonRecords': sum(len(c['players']) for c in clubs)}}
    if set(registry) != set(CANONICAL_CLUBS):
        raise ValueError(f'Club registry mismatch: {set(CANONICAL_CLUBS) ^ set(registry)}')

    def canonical_name(names):
        # Prefer complete source spellings and preserve Unicode diacritics.
        return sorted(names, key=lambda s: (-len(s.split()), -len(s), -sum(ord(c) > 127 for c in s), s))[0]

    clubs = {id: {'canonicalName': CANONICAL_CLUBS[id],
                  'rawNames': sorted(v['rawNames']), 'seasons': sorted(v['seasons']),
                  'seasonAppearances': len(v['seasons'])}
             for id, v in sorted(registry.items())}
    players = {id: {'canonicalName': canonical_name(v['names']), 'rawNames': sorted(v['names'])}
               for id, v in sorted(identity.items())}
    manifest = []
    for id, club in clubs.items():
        records = [p for data in snapshots.values() for c in data['clubs'] if c['sourceClubId'] == id for p in c['players']]
        positions = {p['mainPosition'] for p in records}
        complete = ('ВР' in positions and bool(positions & {'ЦЗ', 'ПЗ', 'ЛЗ', 'ЛФЗ', 'ПФЗ'})
                    and bool(positions & {'ОП', 'ЦП', 'АП', 'ЛП', 'ПП'})
                    and bool(positions & {'НП', 'ЦН', 'ЛВ', 'ПВ'}))
        manifest.append({'clubId': id, 'name': club['canonicalName'],
                         'seasons': club['seasons'], 'seasonAppearances': club['seasonAppearances'],
                         'uniquePlayers': len({p['sourcePlayerId'] for p in records}),
                         'playerSeasonCards': len(records),
                         'eligible': club['seasonAppearances'] >= 5 and complete and
                                     len({p['sourcePlayerId'] for p in records}) >= 30})
    return snapshots, {'years': list(files), 'clubs': clubs, 'players': players,
                       'eligibleClubManifest': manifest,
                       'audit': {'clubs': len(clubs), 'players': len(players),
                                 'playerSeasonRecords': sum(s['audit']['playerSeasonRecords'] for s in snapshots.values()),
                                 'positionCounts': dict(Counter(p['mainPosition'] for s in snapshots.values() for c in s['clubs'] for p in c['players']))}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input-dir', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, default=ROOT / 'docs/research/rpl-2010-2018')
    args = parser.parse_args()
    snapshots, registry = parse(args.input_dir)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    for year, data in snapshots.items():
        (args.output_dir / f'season-{year}.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(f'{year}: {data["audit"]["clubs"]} clubs, {data["audit"]["playerSeasonRecords"]} records')
    (args.output_dir / 'registry.json').write_text(json.dumps(registry, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(registry['audit'], ensure_ascii=False))


if __name__ == '__main__':
    main()
