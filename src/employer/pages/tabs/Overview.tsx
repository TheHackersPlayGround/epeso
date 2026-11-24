// A summary of the company: counts, and what the PESO decided recently.
import { ArrowRight, Briefcase, Building2, ClipboardList, UserCheck, UserPlus, type LucideIcon } from 'lucide-react'
import type { Overview as OverviewData, PortalRequest } from '../../api'
import { Badge, Card, Spinner } from '../../components/ui'
import { fmtWhen, requestSummary, requestTitle } from '../../lib'

type Go = 'referrals' | 'placements' | 'vacancies' | 'requests'

// The same icons as the sidebar entries these cards lead to.
function Tile({ label, value, hint, icon: Icon, onClick }: { label: string; value: number; hint: string; icon: LucideIcon; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="text-left flex flex-col items-stretch justify-start bg-white rounded-xl shadow-md p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all border-2 border-transparent hover:border-brand-blue">
      <div className="flex items-start justify-between gap-3">
        <p className="text-3xl font-bold text-brand-blue">{value}</p>
        <span className="w-10 h-10 rounded-lg bg-blue-50 text-brand-blue flex items-center justify-center shrink-0"><Icon size={20} /></span>
      </div>
      <p className="text-sm font-semibold text-gray-800 mt-1">{label}</p>
      <p className="text-xs text-gray-500 mt-0.5">{hint}</p>
    </button>
  )
}

const TYPE_ICON: Record<PortalRequest['type'], LucideIcon> = {
  referral_status: UserPlus, placement_status: UserCheck, placement_promotion: UserCheck, vacancy_new: Briefcase, vacancy_update: Briefcase, company_info: Building2,
}
// The coloured strip on the left of a decision: the result at a glance.
const STRIP: Record<string, string> = { Approved: 'border-l-green-500', Rejected: 'border-l-red-400', Withdrawn: 'border-l-gray-300' }

export default function Overview({ data, error, loading, onGo }: { data: OverviewData | null; error: string; loading: boolean; onGo: (t: Go) => void }) {
  if (loading && !data) return <Card><Spinner /></Card>
  if (!data) return <Card className="p-6"><p role="alert" className="text-sm text-red-700">{error || 'Could not load the overview.'}</p></Card>

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <Tile label="Referrals in progress" value={data.openReferrals} hint="Applicants sent to you, waiting for a decision" icon={UserPlus} onClick={() => onGo('referrals')} />
        <Tile label="Active employees" value={data.activePlacements} hint="Hired through the PESO" icon={UserCheck} onClick={() => onGo('placements')} />
        <Tile label="Open vacancies" value={data.openVacancies} hint="Your job openings" icon={Briefcase} onClick={() => onGo('vacancies')} />
        <Tile label="Pending requests" value={data.pendingRequests} hint="Sent to the PESO, waiting for a decision" icon={ClipboardList} onClick={() => onGo('requests')} />
      </div>

      <Card className="p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-3">Recent decisions</h2>
        {data.recentDecisions.length === 0 ? (
          <p className="text-sm text-gray-400">The PESO's answers to your requests will show here.</p>
        ) : (
          <>
            {/* Compact rows: an icon for the kind of request, the title and one line, then the result and the date. The strip on the left shows the result. */}
            <ul className="m-0 p-0 list-none grid grid-cols-2 gap-3 max-lg:grid-cols-1">
              {data.recentDecisions.map(r => {
                const Icon = TYPE_ICON[r.type]
                return (
                  <li key={r.id} className={`flex items-center gap-3 px-4 py-3 border border-gray-200 border-l-4 ${STRIP[r.status] ?? 'border-l-gray-300'} rounded-lg`}>
                    <span className="w-9 h-9 rounded-full bg-blue-50 text-brand-blue flex items-center justify-center shrink-0"><Icon size={17} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 m-0 truncate">{requestTitle(r)}</p>
                      <p className="text-xs text-gray-500 m-0 mt-0.5 truncate" title={requestSummary(r)}>{requestSummary(r)}</p>
                      {r.status === 'Rejected' && r.reviewNote && <p className="text-xs text-red-600 m-0 mt-0.5 truncate" title={r.reviewNote}>Reason: {r.reviewNote}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge value={r.status} />
                      <span className="text-[11px] text-gray-400 whitespace-nowrap">{fmtWhen(r.reviewedAt ?? r.submittedAt)}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
            <div className="mt-4 text-right">
              <button type="button" onClick={() => onGo('requests')} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-blue hover:underline">
                View all requests<ArrowRight size={15} />
              </button>
            </div>
          </>
        )}
      </Card>

      <p className="text-xs text-gray-500 text-center">This information comes straight from the PESO's records and is always up to date.</p>
    </div>
  )
}
