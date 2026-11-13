# Authentic assets and confirmations still needed

## Photography

| Location | Needed | Replacement |
|---|---|---|
| Home masthead | Higher-resolution version of the supplied campus façade photo; current source becomes soft on large screens | `images.facade` in `src/images.js` |
| Athènes | Actual trip photos, captions, dates and confirmation of the described trip | `images.tripAthens` |
| Classe de neige | Actual trip photos, captions and dates | `images.tripSnow` |
| États-Unis | Actual NASA/space-trip photos, captions and dates | `images.tripUSA` |
| Sri Lanka | Actual trip photos, captions and dates | `images.tripSriLanka` |
| Voyages sportifs | Teams, actual destinations, photos, dates and captions | `images.tripSports` |
| Espagne | Actual trip photos, captions and dates | `images.tripSpain` |
| France | Actual trip photos, captions and dates | `images.tripFrance` |
| Facilities | FabLab, science rooms, art room, student lounge and canteen | `content.facilityImages` |
| Competition details | Nine authentic competition/project photo sets, participant permissions and captions | competition modal data in `src/app.js` |

Trip placeholders preserve a landscape space and work when real paths are supplied. Existing photographs are reused with their original subject associations, never reassigned as trip photographs.

## School confirmations

- Names, dates, disciplines and results associated with the football trophy and medals images. No result is currently asserted.
- Title, authors, date and description of the supplied science-project photograph.
- Actual Spotify URL and approved episode artwork/audio. `spotifyUrl` remains `null`.
- Club times, locations and participation procedures.
- Upcoming event dates; all seven original descriptions remain available.
- Current statistics: original 2,150 pupils/capacity, 75 nationalities, six languages, 99% brevet and 99% baccalauréat. The export conflates pupil count and capacity; the English official page mentions 49 nationalities. Figures are retained only as unverified source content.
- Approved registration information, current fees and recruitment vacancies.
- Publication permissions for images of pupils, approved legal/privacy information before publication.

## Fonts

Fraunces and Public Sans were downloaded from Google Fonts into `assets/fonts/`, retaining the original design's families. No remote font request is made by the redesign. For public distribution, retain the accompanying license files from the families' official repositories alongside these fonts.
