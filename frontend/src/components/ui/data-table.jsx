import React, { useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender
} from '@tanstack/react-table'
import { ArrowUpDown, ChevronDown, ChevronUp, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'
import { EmptyState } from './empty-state'

export function DataTable({
  columns,
  data,
  searchKey = '',
  searchPlaceholder = 'Filter records...',
  className,
  emptyMessage = 'No records found'
}) {
  const [sorting, setSorting] = useState([])
  const [globalFilter, setGlobalFilter] = useState('')

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 10
      }
    }
  })

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search / Filter Toolbar */}
      {searchPlaceholder && (
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 transition-colors"
            />
          </div>
          <div className="text-xs text-slate-500 tabular-nums">
            Showing {table.getRowModel().rows.length} of {data.length} records
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 sticky top-0 z-10 backdrop-blur-sm">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort()
                    const sortDirection = header.column.getIsSorted()
                    return (
                      <th
                        key={header.id}
                        onClick={header.column.getToggleSortingHandler()}
                        className={cn(
                          'py-3 px-4 font-semibold text-slate-700 select-none whitespace-nowrap',
                          canSort && 'cursor-pointer hover:bg-slate-100/70 transition-colors'
                        )}
                      >
                        <div className="flex items-center gap-1.5">
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                          {canSort && (
                            <span className="text-slate-400">
                              {sortDirection === 'asc' ? (
                                <ChevronUp size={12} className="text-blue-600" />
                              ) : sortDirection === 'desc' ? (
                                <ChevronDown size={12} className="text-blue-600" />
                              ) : (
                                <ArrowUpDown size={11} />
                              )}
                            </span>
                          )}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-50/70 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="py-3 px-4 text-slate-700 whitespace-nowrap">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="py-10 text-center"
                  >
                    <EmptyState
                      title="No matching records"
                      description={emptyMessage}
                      className="py-6"
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {table.getPageCount() > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500">
            <div>
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
