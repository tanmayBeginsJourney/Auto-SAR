import type { FeatureCollection } from 'geojson'
import { geoMercator, geoPath } from 'd3-geo'
import worldData from 'world-atlas/countries-110m.json'
import { feature } from 'topojson-client'

interface MapNode {
  locationKey: string
  label: string
  lat: number
  lng: number
  country: string
  city: string
  linkedCaseCount: number
  linkedAlertCount: number
  totalAmount: number
  highestRiskLevel: string
  riskReason: string
  caseIds: string[]
  resolutionSource: string
  severity: string
}

const topoData = worldData as unknown as { objects: { countries: unknown } }
const worldFeature = feature(topoData as never, topoData.objects.countries as never) as unknown as FeatureCollection

export function RiskWorldMap({
  nodes,
  onSelect,
}: {
  nodes: MapNode[]
  onSelect?: (caseIds: string[]) => void
}) {
  const width = 900
  const height = 360
  const projection = geoMercator().fitSize([width, height], worldFeature)
  const path = geoPath(projection)

  return (
    <div className="relative overflow-hidden rounded-lg border border-[#F0EFE9] bg-shell">
      <svg className="h-[320px] w-full" viewBox={`0 0 ${width} ${height}`}>
        {worldFeature.features.map((shape, index) => (
          <path key={index} d={path(shape) ?? ''} fill="#D1D5DB" stroke="#E5E4DF" strokeWidth={0.4} />
        ))}
        {nodes.map((node) => {
          const point = projection([node.lng, node.lat])
          if (!point) return null
          const tone =
            node.severity === 'critical'
              ? { fill: '#DC2626', ring: 'rgba(220,38,38,0.18)' }
              : node.severity === 'elevated'
                ? { fill: '#D97706', ring: 'rgba(217,119,6,0.18)' }
                : { fill: '#16A34A', ring: 'rgba(22,163,74,0.18)' }
          return (
            <g className="cursor-pointer" key={node.locationKey} onClick={() => onSelect?.(node.caseIds)}>
              <title>{`${node.country}${node.city ? ` - ${node.city}` : ''}: ${node.riskReason}`}</title>
              <circle cx={point[0]} cy={point[1]} fill={tone.ring} r={18} />
              <circle cx={point[0]} cy={point[1]} fill={tone.fill} r={8} />
            </g>
          )
        })}
      </svg>
      <div className="grid gap-2 border-t border-[#F0EFE9] bg-white px-4 py-3 text-xs text-muted md:grid-cols-3">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-danger" /> Critical
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-warn" /> Elevated
        </span>
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-success" /> Standard
        </span>
      </div>
    </div>
  )
}
