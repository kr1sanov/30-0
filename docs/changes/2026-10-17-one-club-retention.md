# One Club, challenge archive and retention

- Active-run restoration supports exact run IDs and the latest solo save across modes, including a new empty draft. Cloud responses cannot overwrite a draft/configuration changed after the request began.
- The ready squad launches simulation directly. Scouting and random pre-season forecasts are removed; legacy saved scouting stages recover at the ready squad screen.
- Team identity is computed from the selected club or signed-in player. Mode-specific challenge names cannot leak into new Classic/One Club runs.
- One Club supports season/prime cards and an optional historical opposition season. Omitted season selection is stable per run ID. The league, rosters, strengths and player statistics come from one eligible imported season; opposition uses that season's ratings even when the user's cards are prime. Existing runs default to a random eligible historical season. `GameRun.opponentSeasonYear` is nullable and added consistently to SQLite/MySQL/PostgreSQL schemas.
- Administrators can archive, reopen, hide or schedule challenge issues. Archived access continues to use the existing archive entitlement.
- CSKA Blitz and Akron Keeper challenges award dedicated persistent achievements.
- Editable RU/EN retention templates use inactivity stages 3, 7, 10 and 30 days, one stage per inactivity period. Users must have started the bot and opted into project news. A send-time check cancels a queued reminder after the user returns or the campaign is paused/archived. Templates are seeded idempotently without overwriting admin edits.
- Russian name overrides use established RPL spellings instead of mechanical transliteration. Examples checked against official RPL material: Ugalde, Cordoba, Spertsyan, Mohebi, Bongonda, Dzhikiya and Giorgiy Shelia.

Name sources: https://premierliga.ru/resources/53/52/Otchet_RPL_po_itogam_vtorogo_registratsionnogo_perioda_24_25.pdf ; https://cdn.premierliga.ru/resources/sb_pdf/preview/RPL_2025-2026_MD22_AKH-ROS_PREVIEW.pdf ; https://cdn.premierliga.ru/resources/sb_pdf/participants/RPL_2025-2026_MD10_ROS-KRA_LU_RU.pdf ; https://cdn.premierliga.ru/resources/sb_pdf/participants/RPL_2023-2024_MD07_KRA-SPA_LU_RU.pdf ; https://premierliga.ru/netcat_files/23/18/Prev_yu_RPL_Spartak_Kryl_ya_Sovetov.pdf
