import { getScoreDisplay } from '../lib/scoring'
import { Flame } from 'lucide-react'

// Badge compact pour les cartes et la liste
export function ScoreBadge({ score, size = 'sm' }) {
  if (score == null) return null
  const display = getScoreDisplay(score)

  if (size === 'xs') {
    return (
      <span
        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
        style={{ backgroundColor: display.bg, color: display.color }}
        title={`Score : ${score}/100 (${display.label})`}
      >
        {score >= 75 && <Flame size={9} />}
        {score}
      </span>
    )
  }

  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
      style={{ backgroundColor: display.bg, color: display.color }}
    >
      {score >= 75 && <Flame size={11} />}
      {score}/100
      <span className="font-medium">{display.label}</span>
    </span>
  )
}

// Détail du score avec breakdown pour la fiche prospect
export function ScoreBreakdown({ result }) {
  if (!result) return null
  const { total, breakdown } = result
  const display = getScoreDisplay(total)

  const categories = [
    { key: 'qualification', label: 'Qualification' },
    { key: 'engagement', label: 'Engagement' },
    { key: 'financier', label: 'Potentiel financier' },
    { key: 'signaux', label: 'Signaux / Momentum' },
  ]

  return (
    <div className="p-3 bg-bg-main border border-border rounded-lg mb-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-text-secondary">Score prospect</span>
        <span
          className="text-sm font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
          style={{ backgroundColor: display.bg, color: display.color }}
        >
          {total >= 75 && <Flame size={13} />}
          {total}/100 — {display.label}
        </span>
      </div>

      {/* Barre de progression */}
      <div className="w-full h-2 bg-bg-card rounded-full mb-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${total}%`, backgroundColor: display.color }}
        />
      </div>

      {/* Détail par catégorie */}
      <div className="space-y-2">
        {categories.map(({ key, label }) => {
          const cat = breakdown[key]
          return (
            <div key={key}>
              <div className="flex items-center justify-between text-xs mb-0.5">
                <span className="text-text-secondary">{label}</span>
                <span className="text-text-primary font-medium">{cat.score}/{cat.max}</span>
              </div>
              <div className="w-full h-1 bg-bg-card rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(cat.score / cat.max) * 100}%`,
                    backgroundColor: display.color,
                    opacity: 0.7,
                  }}
                />
              </div>
              {cat.details.length > 0 && (
                <p className="text-[10px] text-text-secondary mt-0.5">
                  {cat.details.join(' · ')}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
