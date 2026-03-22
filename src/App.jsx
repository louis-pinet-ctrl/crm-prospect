import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Kanban,
  List,
  MessageSquare,
  Bell,
  LogOut,
  Menu,
  X,
  Search,
  CalendarDays,
} from 'lucide-react'
import { useProspects } from './hooks/useProspects'
import { onAuthStateChange, signOut, getSession, supabase } from './lib/supabase'
import { isRelanceOverdue } from './lib/constants'
import KanbanPage from './pages/KanbanPage'
import DashboardPage from './pages/DashboardPage'
import ListPage from './pages/ListPage'
import LoginPage from './pages/LoginPage'
import CommentairesPage from './pages/CommentairesPage'
import AgendaPage from './pages/AgendaPage'
import ProspectModal from './components/ProspectModal'
import GlobalSearch from './components/GlobalSearch'
import { useToast } from './components/Toast'

export default function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedProspect, setSelectedProspect] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const prospectData = useProspects()
  const location = useLocation()
  const toast = useToast()

  useEffect(() => {
    getSession().then(s => {
      setSession(s)
      setAuthLoading(false)
    })
    const { data: { subscription } } = onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Recharger les prospects quand la session change (login/logout)
  useEffect(() => {
    if (session) {
      prospectData.reload()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session])

  useEffect(() => {
    setSidebarOpen(false)
  }, [location])

  // Ctrl+K / Cmd+K pour ouvrir la recherche globale
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-main">
        <div className="text-text-secondary">Chargement...</div>
      </div>
    )
  }

  if (!session) {
    return <LoginPage />
  }

  const relancesCount = prospectData.prospects.filter(p =>
    isRelanceOverdue(p.date_relance)
  ).length

  const navItems = [
    { to: '/', icon: Kanban, label: 'Kanban' },
    { to: '/dashboard', icon: LayoutDashboard, label: 'Tableau de bord' },
    { to: '/agenda', icon: CalendarDays, label: 'Agenda' },
    { to: '/list', icon: List, label: 'Liste' },
    { to: '/commentaires', icon: MessageSquare, label: 'Commentaires' },
  ]

  return (
    <div className="flex min-h-screen bg-bg-main">
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-text-primary">
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <span className="font-semibold text-primary text-sm">Avocat des Restaurateurs</span>
        <div className="w-6" />
      </div>

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-40 h-screen w-60 bg-bg-card border-r border-border
        flex flex-col transition-transform md:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-5 border-b border-border">
          <h1 className="text-primary font-bold text-lg leading-tight">
            Avocat des<br />Restaurateurs
          </h1>
          <p className="text-text-secondary text-xs mt-1">
            Je défends ceux qui nous nourrissent
          </p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {/* Recherche globale */}
          <button
            onClick={() => setShowSearch(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
          >
            <Search size={18} />
            <span className="flex-1 text-left">Rechercher</span>
            <kbd className="text-[10px] px-1.5 py-0.5 bg-bg-main border border-border rounded">⌘K</kbd>
          </button>

          {/* eslint-disable-next-line no-unused-vars */}
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 space-y-1 border-t border-border">
          {relancesCount > 0 && (
            <div className="flex items-center gap-3 px-3 py-2.5 text-warning text-sm">
              <Bell size={18} />
              {relancesCount} relance{relancesCount > 1 ? 's' : ''}
            </div>
          )}
          <button
            onClick={() => signOut()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-text-secondary hover:bg-bg-hover hover:text-danger w-full transition-colors"
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:pt-0 pt-14 min-w-0">
        <Routes>
          <Route
            path="/"
            element={
              <KanbanPage
                {...prospectData}
                onSelectProspect={setSelectedProspect}
                onAddProspect={() => setShowAddModal(true)}
              />
            }
          />
          <Route
            path="/dashboard"
            element={<DashboardPage prospects={prospectData.prospects} allFactures={prospectData.allFactures} />}
          />
          <Route
            path="/agenda"
            element={
              <AgendaPage
                prospects={prospectData.prospects}
                onSelectProspect={setSelectedProspect}
              />
            }
          />
          <Route
            path="/commentaires"
            element={<CommentairesPage />}
          />
          <Route
            path="/list"
            element={
              <ListPage
                {...prospectData}
                onSelectProspect={setSelectedProspect}
                onAddProspect={() => setShowAddModal(true)}
              />
            }
          />
        </Routes>
      </main>

      {/* Prospect detail modal */}
      {selectedProspect && (
        <ProspectModal
          prospect={selectedProspect}
          onClose={() => setSelectedProspect(null)}
          onUpdate={prospectData.update}
          onDelete={async (id) => {
            try {
              await prospectData.remove(id)
              setSelectedProspect(null)
              toast.success('Prospect supprimé')
            } catch {
              toast.error('Erreur lors de la suppression')
            }
          }}
          onReload={() => prospectData.reload()}
          onSelectProspect={async (p) => {
            // Charger le prospect complet directement depuis Supabase
            const { data } = await supabase.from('prospects').select('*').eq('id', p.id).single()
            setSelectedProspect(data || p)
            prospectData.reload()
          }}
        />
      )}

      {/* Add prospect modal */}
      {showAddModal && (
        <ProspectModal
          prospect={null}
          onClose={() => setShowAddModal(false)}
          onAdd={async (data) => {
            const created = await prospectData.add(data)
            setShowAddModal(false)
            return created
          }}
        />
      )}

      {/* Global search (Ctrl+K) */}
      {showSearch && (
        <GlobalSearch
          prospects={prospectData.prospects}
          onSelectProspect={(p) => {
            setSelectedProspect(p)
            setShowSearch(false)
          }}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  )
}
