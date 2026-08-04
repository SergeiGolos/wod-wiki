/**
 * DashboardsNavPanel — L2 context panel for the /dashboard namespace.
 *
 * Renders the merged dashboard list: the Explorer (/dashboard) plus every
 * addressable dashboard from useDashboardCatalog — vault-created (editable)
 * first, then the unread prebuilt seeds. A "+ New dashboard" action creates
 * a blank dashboard note and navigates to it. This is the dynamic L2 the
 * static nav tree can't express (vault dashboards are runtime data).
 */
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavPanelProps } from '../navTypes';
import { useDashboardCatalog } from '../../hooks/useDashboards';
import { dashboardNotes } from '../../services/dashboardNotes';
import { parseFrontmatter } from '@/lib/frontmatter';
import { dashboardViewPath } from '../../lib/routes';

export function DashboardsNavPanel(_props: NavPanelProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { items, loading } = useDashboardCatalog();
  const [creating, setCreating] = useState(false);

  const handleNew = async () => {
    setCreating(true);
    try {
      const note = await dashboardNotes.createDashboard();
      const { meta } = parseFrontmatter(note.rawContent);
      const slug = typeof meta.slug === 'string' && meta.slug ? meta.slug : note.id;
      navigate(dashboardViewPath(slug));
    } finally {
      setCreating(false);
    }
  };

  const explorerActive = location.pathname === '/dashboard';

  return (
    <div className="flex flex-col gap-1 px-2 py-3" data-testid="dashboards-nav-panel">
      <NavRow
        label="Explorer"
        active={explorerActive}
        onClick={() => navigate('/dashboard')}
      />

      <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-3">
        Dashboards
      </div>

      {loading ? (
        <div className="px-3 py-2 text-xs text-muted-foreground/60">Loading…</div>
      ) : items.length === 0 ? (
        <div className="px-3 py-2 text-xs text-muted-foreground/60">No dashboards yet.</div>
      ) : (
        items.map((d) => (
          <NavRow
            key={d.slug}
            label={d.title}
            badge={d.editable ? undefined : 'prebuilt'}
            active={location.pathname === `/dashboard/${d.slug}`}
            onClick={() => navigate(dashboardViewPath(d.slug))}
          />
        ))
      )}

      <button
        type="button"
        onClick={handleNew}
        disabled={creating}
        data-testid="dashboards-nav-new"
        className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-50"
      >
        <Plus className="size-3.5" />
        New dashboard
      </button>
    </div>
  );
}

function NavRow({
  label,
  active,
  onClick,
  badge,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-left transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <span
        className={cn(
          'size-2 rounded-full shrink-0',
          active ? 'bg-primary' : 'bg-border',
        )}
      />
      <span className="truncate">{label}</span>
      {badge && (
        <span className="ml-auto text-[9px] font-bold uppercase tracking-wide text-muted-foreground/50 shrink-0">
          {badge}
        </span>
      )}
    </button>
  );
}
