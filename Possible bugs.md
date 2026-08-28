# Possible bugs

Checked 29 August 2026 after priority logging, villager movement, and seasonal-work updates.

## Fixed

- **Births could never accumulate.** Growth was calculated as small fractional amounts, then the resident-roster synchronisation rounded the population back down on every simulation tick. `populationChangeProgress` now persists the fractional remainder and creates a village-born child when it reaches one full resident. The same mechanism prevents fractional hardship losses from removing a resident too early.
- **Logging-priority regression test could fail despite correct gameplay.** Its final assertion assumed it was still daytime after several simulated shifts plus real-time long-hold delays. The test now checks that residents match the *current* day/night shift instead.
- **Tree priority tool could render as a half-width orphan.** The planning toolbar uses two columns; its third button now spans the full row.
- **Children could be enrolled in an unstaffed school.** School seats now become available only while at least one teacher is assigned, so pupils travel to a functioning school rather than an empty building.
- **Villager travel did not match the time control exactly.** Movement now scales directly with 1×, 2× or 3×, including pauses between work steps. Farmers also remain in their assigned fields and visibly work there instead of immediately beginning a delivery trip.
- **Citizens could stall at waterways or building edges.** Their destination routing now uses obstacle-aware breadth-first paths instead of a purely greedy next-tile choice.
- **Farmers and pupils could target non-walkable building icon tiles.** Farm work now selects only walkable field tiles, while pupils route inside staffed schools and remain there through school hours.
- **Staffed work used the same daylight window in every season.** Work, production forecasts, school attendance and day/night diagnostics now use the seasonal shift: 07:00–20:30 in summer, 07:00–17:30 in winter, and 07:00–18:30 otherwise.
- **Priority control skipped existing stumps.** Stumps can now be marked or unmarked through the same long-hold and Tree priority controls, with remote stumps assigned to the nearest Logging Camp.
- **Priority stumps could wait behind priority trees.** The logging queue now processes priority stumps first, then priority trees, then ordinary stumps and automatic tree targets.
- **Several Logging Camps could duplicate a remote priority job.** Each staffed camp now chooses its nearest marked tree or stump; camps that choose the same outside-zone target combine their assigned workers on one progress bar. Every logger supplies 0.5× standard two-worker speed, so four workers take a five-hour outside job in 2.5 hours and six take about 1 hour 40 minutes.

## Remaining risks to monitor

- **Aggregate birth model:** The growth rate is village-wide rather than based on a specific adult household. This is intentional for a lightweight simulation, but it can produce a birth in a village with no adult residents if a custom save or event creates that state.
- **Very large manual time jumps:** Normal play limits each simulation update to 250 ms, but unusually large time jumps (for example, a developer tool or a future offline-progress feature) calculate wellbeing and population conditions only at the start of the jump. Such a jump should be processed in small slices.
- **Custom/edited saves:** Invalid or manually edited save data can still cause unusual demographic mixes. The game repairs missing lifecycle fields and now repairs missing birth-progress data, but it cannot infer a player’s intended population history.
- **Large tree-priority selections:** Dragging across a very large forest area marks every standing tree in that rectangle; dragging an area where every tree is already marked removes those priorities. This is intentional, but players should use small areas when they only mean to redirect one logging crew.
- **Imported saves:** Imports are limited to compatible Wildroot JSON saves under 5 MB and are normalised before loading. Malformed or heavily edited saves may still lose invalid map elements during normalisation.

## Verification

- `tests/population_growth.html` passes: a well-supplied 10-person village with spare housing gains one village-born child after two simulated days, retaining the remaining fractional progress.
- `tests/lifecycle_events.html` passes: resident ageing, natural death, travellers, and events continue to behave as expected.
- `tests/logging_priority_movement.html` passes: logging priority, remote stumps, and resident day/night movement are covered.
- `tests/smoke.html` passes: the primary build, inspect, navigation and destroy flow remains functional.
