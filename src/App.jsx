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
} from 'lucide-react'
import { useProspects } from './hooks/useProspects'
import { onAuthStateChange, signOut, getSession } from './lib/supabase'
import { isRelanceOverdue } from './lib/constants'
import KanbanPage from './pages/KanbanPage'
import DashboardPage from './pages/DashboardPage'
import ListPage from './pages/ListPage'
import LoginPage from './pages/LoginPage'
import CommentairesPage from './pages/CommentairesPage'
import ProspectModal from './components/ProspectModal'

export default function App() {
  const [session, setSession] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedProspect, setSelectedProspect] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const prospectData = useProspects()
  const location = useLocation()

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
  }, [session])

  useEffect(() => {
    setSidebarOpen(false)
  }, [location])

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
            element={<DashboardPage prospects={prospectData.prospects} />}
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
            await prospectData.remove(id)
            setSelectedProspect(null)
          }}
          onReload={() => prospectData.reload()}
          onSelectProspect={(p) => {
            // Si c'est un objet partiel (depuis DossiersLies), retrouver le complet
            const full = prospectData.prospects.find(pr => pr.id === p.id)
            setSelectedProspect(full || p)
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
    </div>
  )
}
