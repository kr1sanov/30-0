#!/usr/bin/env python3
"""Parse user supplied FIFA 10 RPL Markdown into an auditable game import.

Run with --input-dir containing the league page and all sixteen club pages.
This script never changes a database. Original player IDs, names, positions,
overall ratings, and potential are retained alongside game position mappings.
"""

import argparse
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CLUB_NAMES = {
    "Zenit St. Petersburg": "Зенит Санкт-Петербург",
    "CSKA Moskva": "ЦСКА Москва",
    "Spartak Moskva": "Спартак Москва",
    "Dinamo Moskva": "Динамо Москва",
    "Lokomotiv Moskva": "Локомотив Москва",
    "Rubin Kazan": "Рубин Казань",
    "Saturn Ramenskoye": "Сатурн Раменское",
    "Krylya Sovetov Samara": "Крылья Советов Самара",
    "Terek Grozny": "Терек Грозный",
    "FC Moskva": "ФК Москва",
    "Amkar Perm": "Амкар Пермь",
    "FC Rostov": "Ростов",
    "Tom Tomsk": "Томь Томск",
    "Kuban Krasnodar": "Кубань Краснодар",
    "FC Khimki": "Химки",
    "Spartak Nalchik": "Спартак-Нальчик",
}

# The game has 15 slots. Retain sourcePosition even where left/right centre
# detail is collapsed into its game slot. Never swap left and right flanks.
POSITIONS = {
    "ВРТ": "ВР", "ЦЗ": "ЦЗ", "ЛЦЗ": "ЦЗ", "ПЦЗ": "ЦЗ",
    "ЛЗ": "ЛЗ", "ПЗ": "ПЗ", "ЛФЗ": "ЛФЗ", "ПФЗ": "ПФЗ",
    "ЦОП": "ОП", "ЛОП": "ОП", "ПОП": "ОП",
    "ЦП": "ЦП", "ЛЦП": "ЦП", "ПЦП": "ЦП",
    "ЦАП": "АП", "ЛАП": "АП", "ПАП": "АП",
    "ЛП": "ЛП", "ПП": "ПП", "LWM": "ЛП", "RWM": "ПП",
    "ЛФД": "ЛВ", "ПФ": "ПВ", "ЦФД": "ЦН", "ФРВ": "НП",
}

CLUB_LINK = re.compile(r"\[!\[\]\([^)]*?/teams/(\d+)\.png\)([^]]+)\]\((https://fifaindex\.com/ru/teams/[^)]+/fifa10)\)")
PLAYER_LINK = re.compile(r"\[([^]]+)\]\((https://fifaindex\.com/ru/players/(\d+)-[^)]+/fifa10)\)")
NATION = re.compile(r"!\[([^]]+)\]")
COUNT = re.compile(r"Состав \((\d+) игроков\)")


def parse(input_dir, name_map):
    league = input_dir / "Команды Russia Premier League (1) 2010.md"
    if not league.is_file():
        raise ValueError(f"Нет списка клубов: {league}")
    clubs = []
    all_players = []
    hashes = {league.name: hashlib.sha256(league.read_bytes()).hexdigest()}
    seen_player_ids = set()
    for line in league.read_text(encoding="utf-8").splitlines():
        if not line.startswith("|") or not (match := CLUB_LINK.search(line)):
            continue
        source_id, name, source_url = match.groups()
        if name not in CLUB_NAMES:
            raise ValueError(f"Неизвестный клуб: {name}")
        fields = [field.strip() for field in line.split("|")[2:-1]]
        if len(fields) != 6:
            raise ValueError(f"Неполная строка клуба: {name}")
        ratings = [int(value) for value in fields[:4]]
        if any(not 1 <= value <= 99 for value in ratings):
            raise ValueError(f"Неверный рейтинг клуба: {name}")
        page = input_dir / f"{name}.md"
        body = page.read_text(encoding="utf-8")
        hashes[page.name] = hashlib.sha256(page.read_bytes()).hexdigest()
        header = COUNT.search(body)
        if not header:
            raise ValueError(f"Не указано количество игроков: {page}")
        players = []
        for source_line, row in enumerate(body.splitlines(), 1):
            if not row.startswith("|") or not (player_match := PLAYER_LINK.search(row)):
                continue
            cells = [cell.strip() for cell in row.split("|")[1:-1]]
            if len(cells) != 10:
                raise ValueError(f"Неверное число полей: {page}:{source_line}")
            original, player_url, player_id = player_match.groups()
            if player_id in seen_player_ids:
                raise ValueError(f"Повтор ID игрока {player_id}: {page}:{source_line}")
            seen_player_ids.add(player_id)
            nation = NATION.search(cells[2])
            raw_position = cells[3]
            if not nation or raw_position not in POSITIONS:
                raise ValueError(f"Неизвестная страна/позиция: {page}:{source_line}")
            shirt, age, overall, potential = (int(cells[i]) for i in (0, 4, 5, 6))
            if not (0 <= shirt <= 99 and 15 <= age <= 50 and 1 <= overall <= 99 and 1 <= potential <= 99):
                raise ValueError(f"Недопустимые значения: {page}:{source_line}")
            if any(cells[i] != "-" for i in (7, 8, 9)):
                raise ValueError(f"Обнаружены дополнительные поля для разбора: {page}:{source_line}")
            # FIFAIndex provides a display name only. Preserve it verbatim;
            # do not guess which token is a family name (e.g. mononyms).
            display_name = original
            player = {
                "sourcePlayerId": player_id,
                "sourceUrl": player_url,
                "sourceLine": source_line,
                "nameOriginal": original,
                "nameRu": display_name,
                "firstNameRu": None,
                "lastNameRu": display_name,
                "nationality": nation.group(1),
                "shirtNumber": shirt,
                "age": age,
                "sourcePosition": raw_position,
                "mainPosition": POSITIONS[raw_position],
                "rating": overall,
                "primeRating": potential,
            }
            players.append(player)
            all_players.append(player)
        if len(players) != int(header.group(1)):
            raise ValueError(f"Неполный состав {name}: {len(players)} != {header.group(1)}")
        clubs.append({
            "sourceClubId": source_id, "sourceUrl": source_url,
            "nameOriginal": name, "nameRu": name,
            "logoUrl": f"https://images.fifaindex.com/fifa10/teams/{source_id}.png",
            "teamRatings": dict(zip(("overall", "attack", "midfield", "defence"), ratings)),
            "players": players,
        })
    if len(clubs) != 16 or len({club["sourceClubId"] for club in clubs}) != 16:
        raise ValueError(f"Ожидалось 16 уникальных клубов, найдено {len(clubs)}")
    if set(name_map) - seen_player_ids:
        raise ValueError(f"Словарь имен содержит неизвестные ID: {sorted(set(name_map) - seen_player_ids)}")
    return {
        "source": "FIFAIndex FIFA 10, user supplied Russian locale Markdown",
        # FIFA 10 contains FC Moskva, Khimki and Kuban: the RPL's 2009 clubs.
        # FIFA edition number is not the Russian league season year.
        "season": {"startYear": 2009, "endYear": 2009, "label": "2009 (FIFA 10)", "matchesPerTeam": 30},
        "sourceFilesSha256": hashes,
        "clubs": clubs,
        "audit": {
            "clubs": len(clubs), "players": len(all_players),
            "namesAsSource": sum(player["nameRu"] == player["nameOriginal"] for player in all_players),
            "sourcePositions": dict(sorted(Counter(player["sourcePosition"] for player in all_players).items())),
        },
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=ROOT / "docs/research/verified-fifa10-rpl.json")
    args = parser.parse_args()
    data = parse(args.input_dir, {})
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(data["audit"], ensure_ascii=False))


if __name__ == "__main__":
    main()
