import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { AgGridReact } from 'ag-grid-react'
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  iconSetMaterial,
  type ColDef,
  type GridReadyEvent,
  type GridApi,
  type IDatasource,
  type IGetRowsParams,
} from 'ag-grid-community'
import './App.css'

// Register all Community features (v33+ requires explicit module registration).
ModuleRegistry.registerModules([AllCommunityModule])

// Theming API (v33+): customize the built-in Quartz theme instead of importing CSS.
// Two param sets keyed by mode name; the active one is chosen via the
// `data-ag-theme-mode` attribute on a wrapping element (see below).
const gridTheme = themeQuartz
  .withParams(
    {
      accentColor: '#aa3bff',
      backgroundColor: '#ffffff',
      foregroundColor: '#08060d',
      borderColor: '#e5e4e7',
      headerBackgroundColor: '#f4f3ec',
      oddRowBackgroundColor: '#faf9fc',
      rowHoverColor: 'rgba(170, 59, 255, 0.08)',
      selectedRowBackgroundColor: 'rgba(170, 59, 255, 0.14)',
      borderRadius: 6,
      wrapperBorderRadius: 10,
      headerFontWeight: 600,
      rowVerticalPaddingScale: 1.1,
    },
    'light',
  )
  .withParams(
    {
      accentColor: '#c084fc',
      backgroundColor: '#16171d',
      foregroundColor: '#f3f4f6',
      borderColor: '#2e303a',
      headerBackgroundColor: '#1f2028',
      oddRowBackgroundColor: '#1a1b22',
      rowHoverColor: 'rgba(192, 132, 252, 0.1)',
      selectedRowBackgroundColor: 'rgba(192, 132, 252, 0.18)',
      borderRadius: 6,
      wrapperBorderRadius: 10,
      headerFontWeight: 600,
      rowVerticalPaddingScale: 1.1,
    },
    'dark',
  )
  .withPart(iconSetMaterial);
// Follow the OS / browser color-scheme preference, updating live when it changes.
function usePrefersDark() {
  const [isDark, setIsDark] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches,
  )

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (e: MediaQueryListEvent) => setIsDark(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  return isDark
}

// Manual theme override; 'system' defers to the OS preference above.
type ThemeMode = 'light' | 'dark' | 'system'
const THEME_MODES: ThemeMode[] = ['light', 'dark', 'system']

type Employee = {
  id: number
  name: string
  department: string
  role: string
  salary: number
  startDate: string
  active: boolean
}

const currencyFormatter = (params: { value: number | undefined }) =>
  // Infinite row model renders loading placeholder rows with undefined values
  // before data arrives, so the formatter must tolerate a missing value.
  params.value == null
    ? ''
    : params.value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

// Fetch one block of rows from the Bun/Hono API for the Infinite Row Model.
// AG Grid's sort/filter model is forwarded as query params; the latest search
// box text is read from a ref so it is always current when getRows fires.
function makeDatasource(searchRef: { current: string }): IDatasource {
  return {
    getRows(params: IGetRowsParams) {
      const query = new URLSearchParams({
        startRow: String(params.startRow),
        endRow: String(params.endRow),
        sort: JSON.stringify(params.sortModel),
        filter: JSON.stringify(params.filterModel),
      })
      if (searchRef.current) query.set('q', searchRef.current)

      fetch(`/api/employees?${query.toString()}`)
        .then((res) => res.json() as Promise<{ rows: Employee[]; lastRow: number }>)
        .then(({ rows, lastRow }) => params.successCallback(rows, lastRow))
        .catch(() => params.failCallback())
    },
  }
}

function App() {
  const prefersDark = usePrefersDark()

  // Theme override + live quick-filter text typed into the search box.
  const [themeMode, setThemeMode] = useState<ThemeMode>('system')
  const [quickFilterText, setQuickFilterText] = useState('')
  const isDark = themeMode === 'system' ? prefersDark : themeMode === 'dark'

  // Grid api + a ref holding the latest search text for the datasource.
  const gridApiRef = useRef<GridApi<Employee> | null>(null)
  const searchRef = useRef('')
  // eslint-disable-next-line react-hooks/refs
const datasource = useMemo(() => makeDatasource(searchRef), [])

  const onGridReady = useCallback((params: GridReadyEvent<Employee>) => {
    gridApiRef.current = params.api
  }, [])

  // Server-side search: keep the input controlled, then refresh the grid's
  // cache so getRows refetches with the new `q`.
  const onSearchChange = useCallback((value: string) => {
    setQuickFilterText(value)
    searchRef.current = value
    gridApiRef.current?.purgeInfiniteCache()
  }, [])

  const [columnDefs] = useState<ColDef<Employee>[]>([
    { field: 'name', headerName: 'Name', flex: 1, minWidth: 160 },
    { field: 'department', flex: 1, minWidth: 140 },
    { field: 'role', flex: 1, minWidth: 180 },
    {
      field: 'salary',
      valueFormatter: currencyFormatter,
      type: 'rightAligned',
      width: 130,
      filter: 'agNumberColumnFilter',
    },
    { field: 'startDate', headerName: 'Start Date', width: 130 },
    {
      field: 'active',
      headerName: 'Active',
      width: 110,
      filter: false,
      sortable: false,
      cellRenderer: (params: { value: boolean }) => (params.value ? '✅' : '—'),
    },
  ])

  const defaultColDef = useMemo<ColDef>(
    () => ({ sortable: true, resizable: true, filter: 'agTextColumnFilter' }),
    [],
  )

  return (
    <div className="grid">
      <h1>AG Grid sample</h1>

      <div className="toolbar">
        <label className="search">
          <span className="search-icon" aria-hidden>🔍</span>
          <input
            type="search"
            value={quickFilterText}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search employees…"
            aria-label="Search employees"
          />
        </label>

        <div className="theme-toggle" role="group" aria-label="Theme">
          {THEME_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              className={mode === themeMode ? 'active' : ''}
              aria-pressed={mode === themeMode}
              onClick={() => setThemeMode(mode)}
            >
              {mode[0].toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid-wrapper" data-ag-theme-mode={isDark ? 'dark' : 'light'}>
        <AgGridReact<Employee>
          theme={gridTheme}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          rowModelType="infinite"
          datasource={datasource}
          cacheBlockSize={100}
          onGridReady={onGridReady}
          rowSelection={{ mode: 'multiRow', checkboxes: true, headerCheckbox: false }}
          pagination
          paginationPageSize={20}
          paginationPageSizeSelector={[20, 50, 100]}
        />
      </div>
    </div>
  )
}

export default App
