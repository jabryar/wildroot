# Possible bugs

Checked 26 August 2026 after repairing population births.

## Fixed

- **Births could never accumulate.** Growth was calculated as small fractional amounts, then the resident-roster synchronisation rounded the population back down on every simulation tick. `populationChangeProgress` now persists the fractional remainder and creates a village-born child when it reaches one full resident. The same mechanism prevents fractional hardship losses from removing a resident too early.

## Remaining risks to monitor

- **Aggregate birth model:** The growth rate is village-wide rather than based on a specific adult household. This is intentional for a lightweight simulation, but it can produce a birth in a village with no adult residents if a custom save or event creates that state.
- **Very large manual time jumps:** Normal play limits each simulation update to 250 ms, but unusually large time jumps (for example, a developer tool or a future offline-progress feature) calculate wellbeing and population conditions only at the start of the jump. Such a jump should be processed in small slices.
- **Custom/edited saves:** Invalid or manually edited save data can still cause unusual demographic mixes. The game repairs missing lifecycle fields and now repairs missing birth-progress data, but it cannot infer a player’s intended population history.

## Verification

- `tests/population_growth.html` passes: a well-supplied 10-person village with spare housing gains one village-born child after two simulated days, retaining the remaining fractional progress.
- `tests/lifecycle_events.html` passes: resident ageing, natural death, travellers, and events continue to behave as expected.
