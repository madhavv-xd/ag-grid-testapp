import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

app.use('*', cors())

type Employee = {
  id: number
  name: string
  department: string
  role: string
  salary: number
  startDate: string
  active: boolean
}

// --- In-memory dataset (generated once at startup) ---------------------------

const FIRST_NAMES = [
  'Ada', 'Grace', 'Alan', 'Katherine', 'Margaret', 'Linus', 'Barbara', 'Tim',
  'Dennis', 'Radia', 'Edsger', 'Donald', 'John', 'Marvin', 'Claude', 'Vint',
  'Ken', 'Brian', 'Bjarne', 'Guido', 'James', 'Anita', 'Shafi', 'Frances',
]
const LAST_NAMES = [
  'Lovelace', 'Hopper', 'Turing', 'Johnson', 'Hamilton', 'Torvalds', 'Liskov',
  'Berners-Lee', 'Ritchie', 'Perlman', 'Dijkstra', 'Knuth', 'Backus', 'Minsky',
  'Shannon', 'Cerf', 'Thompson', 'Kernighan', 'Stroustrup', 'Rossum', 'Gosling',
  'Borg', 'Goldwasser', 'Allen',
]
const DEPARTMENTS = ['Engineering', 'Research', 'Data', 'Infrastructure', 'Product', 'Design', 'Sales']
const ROLES = [
  'Staff Engineer', 'Engineering Manager', 'Principal Researcher', 'Data Scientist',
  'Senior Engineer', 'Systems Architect', 'Research Lead', 'Product Director',
  'Data Engineer', 'Designer', 'Account Executive',
]

const ROW_COUNT = 100_000

// Index-seeded so generation is deterministic, instant and allocation-light.
function buildDataset(): Employee[] {
  const rows: Employee[] = new Array(ROW_COUNT)
  for (let i = 0; i < ROW_COUNT; i++) {
    const first = FIRST_NAMES[i % FIRST_NAMES.length]
    const last = LAST_NAMES[(i * 7) % LAST_NAMES.length]
    const year = 2010 + (i % 15)
    const month = String((i % 12) + 1).padStart(2, '0')
    const day = String((i % 28) + 1).padStart(2, '0')
    rows[i] = {
      id: i + 1,
      name: `${first} ${last} ${i + 1}`,
      department: DEPARTMENTS[i % DEPARTMENTS.length],
      role: ROLES[(i * 3) % ROLES.length],
      salary: 90_000 + ((i * 137) % 110_000),
      startDate: `${year}-${month}-${day}`,
      active: i % 4 !== 0,
    }
  }
  return rows
}

const DATA = buildDataset()

// --- Filtering / sorting -----------------------------------------------------

type SortItem = { colId: string; sort: 'asc' | 'desc' }

// AG Grid column filter shapes (community: text & number filters).
type TextFilter = {
  filterType: 'text'
  type: 'contains' | 'equals' | 'notEqual' | 'startsWith' | 'endsWith'
  filter?: string
}
type NumberFilter = {
  filterType: 'number'
  type: 'equals' | 'notEqual' | 'greaterThan' | 'lessThan' | 'inRange'
  filter?: number
  filterTo?: number
}
type FilterModel = Record<string, TextFilter | NumberFilter>

function matchesText(value: string, f: TextFilter): boolean {
  const v = value.toLowerCase()
  const t = (f.filter ?? '').toLowerCase()
  switch (f.type) {
    case 'contains': return v.includes(t)
    case 'equals': return v === t
    case 'notEqual': return v !== t
    case 'startsWith': return v.startsWith(t)
    case 'endsWith': return v.endsWith(t)
    default: return true
  }
}

function matchesNumber(value: number, f: NumberFilter): boolean {
  const a = f.filter ?? 0
  switch (f.type) {
    case 'equals': return value === a
    case 'notEqual': return value !== a
    case 'greaterThan': return value > a
    case 'lessThan': return value < a
    case 'inRange': return value >= a && value <= (f.filterTo ?? a)
    default: return true
  }
}

function matchesFilterModel(row: Employee, model: FilterModel): boolean {
  for (const colId in model) {
    const f = model[colId]
    const cell = (row as Record<string, unknown>)[colId]
    if (f.filterType === 'number') {
      if (typeof cell !== 'number' || !matchesNumber(cell, f)) return false
    } else if (f.filterType === 'text') {
      if (!matchesText(String(cell ?? ''), f)) return false
    }
  }
  return true
}

function matchesQuickSearch(row: Employee, q: string): boolean {
  return (
    row.name.toLowerCase().includes(q) ||
    row.department.toLowerCase().includes(q) ||
    row.role.toLowerCase().includes(q)
  )
}

function compareRows(a: Employee, sortModel: SortItem[]): (b: Employee) => number {
  return (b: Employee) => {
    for (const { colId, sort } of sortModel) {
      const av = (a as Record<string, unknown>)[colId] as string | number | boolean
      const bv = (b as Record<string, unknown>)[colId] as string | number | boolean
      if (av < bv) return sort === 'asc' ? -1 : 1
      if (av > bv) return sort === 'asc' ? 1 : -1
    }
    return 0
  }
}

function parseJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

// --- Routes ------------------------------------------------------------------

app.get('/', (c) => {
  return c.text('Hello from bun!')
})

app.get('/api/employees', (c) => {
  const startRow = Number(c.req.query('startRow') ?? 0)
  const endRow = Number(c.req.query('endRow') ?? 100)
  const q = (c.req.query('q') ?? '').trim().toLowerCase()
  const sortModel = parseJson<SortItem[]>(c.req.query('sort'), [])
  const filterModel = parseJson<FilterModel>(c.req.query('filter'), {})
  const hasFilter = Object.keys(filterModel).length > 0

  let rows = DATA
  if (q || hasFilter) {
    rows = rows.filter(
      (row) =>
        (!q || matchesQuickSearch(row, q)) &&
        (!hasFilter || matchesFilterModel(row, filterModel)),
    )
  }

  if (sortModel.length > 0) {
    // Copy before sorting so we never mutate the source dataset.
    rows = rows.slice().sort((a, b) => compareRows(a, sortModel)(b))
  }

  const lastRow = rows.length
  const page = rows.slice(startRow, endRow)

  return c.json({ rows: page, lastRow })
})

export default app
