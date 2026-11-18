// The people currently hired into one job opening, as a full page (like the applicant page). It opens from the opening's
// details window on the Vacancies tab. "Currently hired" = active placements, the same people the "Hired" number counts.
import { useMemo, useState } from 'react'
import { ArrowLeft, Search } from 'lucide-react'
import { listPlacements, type ApplicantContext } from '../api'
import { Card, EmptyState, Spinner } from '../components/ui'
import { btnBack, btnSmall, fmtDate, useData, usePaged } from '../lib'
import TablePagination from '../../pages/employment/shared/TablePagination'

export default function HiredApplicantsView({ vacancyId, title, tick, onBack, onView }: {
  vacancyId: number; title: string; tick: number; onBack: () => void; onView: (applicantId: number, context: ApplicantContext) => void
}) {
  const { data, error, loading } = useData(listPlacements, tick)
  const [search, setSearch] = useState('')

  const hired = useMemo(() => (data ?? []).filter(p => p.vacancyId === vacancyId && p.status === 'Active'), [data, vacancyId])
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q ? hired.filter(p => p.applicantName.toLowerCase().includes(q)) : hired
  }, [hired, search])
  const pg = usePaged(rows, search)

  return (
    <div>
      <div className="mb-5 max-sm:mb-3 flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-800 m-0 leading-tight break-words">Hired: {title}</h1>
          <p className="text-sm text-gray-500 m-0 mt-1 max-w-3xl">
            People currently hired for this opening{data ? ` (${hired.length})` : ''}.
          </p>
        </div>
        <button type="button" onClick={onBack} className={btnBack}><ArrowLeft size={16} />Back to Vacancies</button>
      </div>

      <Card className="p-4">
        {error && !data && <p role="alert" className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{error}</p>}
        {loading && !data ? <Spinner /> : hired.length === 0 ? (
          <EmptyState title="No one is currently hired for this opening" hint="People hired through the PESO for this job appear here." />
        ) : (
          <>
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name…" aria-label="Search hired applicants"
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-brand-blue placeholder:text-gray-400" />
            </div>
            {rows.length === 0 ? (
              <EmptyState title="No one matches your search" hint="Try a different name." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="bg-brand-blue">
                      <th className="px-4 py-3 text-left text-white whitespace-nowrap">Employee</th>
                      <th className="px-4 py-3 text-left text-white whitespace-nowrap">Date hired</th>
                      <th className="px-4 py-3 text-left text-white whitespace-nowrap">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pg.paged.map(p => (
                      <tr key={p.id} className="border-b border-gray-100 align-middle hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-800">{p.applicantName}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(p.dateHired)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <button type="button" onClick={() => onView(p.applicantId, { jobTitle: p.jobTitle, verb: 'Hired', date: p.dateHired, status: p.status })} className={`${btnSmall} border border-gray-300 text-gray-700 hover:bg-gray-50`}>View applicant</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {rows.length > 0 && <TablePagination currentPage={pg.page} totalItems={pg.total} onPageChange={pg.setPage} itemsPerPage={pg.perPage} onItemsPerPageChange={pg.setPerPage} />}
          </>
        )}
      </Card>
    </div>
  )
}
