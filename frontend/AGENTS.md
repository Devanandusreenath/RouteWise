<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## RouteWise AI architecture
- All data access goes through `src/lib/api.ts`; demo mode activates only when `VITE_API_BASE_URL` is unset, and live failures must surface as errors — so the FastAPI backend can plug in without component changes.
- Leaflet maps load only via `components/map/RouteMap` (lazy + ClientOnly) because Leaflet breaks SSR; use react-leaflet v5 for React 19.
- Map marker/route colours are applied through CSS classes in styles.css, since Leaflet SVG attributes can't read CSS variables.
- Demo route evaluation lives in `src/lib/routing.ts` over the pilot graph in `src/data/pilot.ts`; UI never computes suitability itself.
