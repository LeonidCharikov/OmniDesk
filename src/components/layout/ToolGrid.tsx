import React from 'react';
import { 
  Star, 
  ArrowUpRight, 
  WifiOff, 
  FileText, 
  Binary, 
  Compass, 
  Calculator, 
  FileCode, 
  Globe, 
  Cpu, 
  Grid, 
  BarChart3, 
  Hash, 
  Coins, 
  Layers,
  FlaskConical,
  TrendingUp,
  GitCompare,
  KeyRound,
  QrCode,
  Code2,
  Clock,
  LineChart,
  Palette,
  Activity,
  Eye,
  Flame,
  Calendar,
  FileBox,
  CalendarCheck,
  Wrench,
  Percent,
  ShoppingCart,
  Mic,
  Pencil,
  Ruler,
  Scissors,
} from 'lucide-react';
import { ToolDefinition, ToolCategory } from '../../types/tool';
import { useI18n } from '../../i18n/context';

interface ToolGridProps {
  tools: ToolDefinition[];
  favorites: string[];
  onSelectTool: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  isOffline: boolean;
  activeCategory: ToolCategory;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  FileText: <FileText className="w-5 h-5 text-indigo-400" />,
  Binary: <Binary className="w-5 h-5 text-indigo-400" />,
  Compass: <Compass className="w-5 h-5 text-indigo-400" />,
  Calculator: <Calculator className="w-5 h-5 text-indigo-400" />,
  FileCode: <FileCode className="w-5 h-5 text-indigo-400" />,
  Globe: <Globe className="w-5 h-5 text-indigo-400" />,
  Cpu: <Cpu className="w-5 h-5 text-indigo-400" />,
  Grid: <Grid className="w-5 h-5 text-indigo-400" />,
  BarChart3: <BarChart3 className="w-5 h-5 text-indigo-400" />,
  Hash: <Hash className="w-5 h-5 text-indigo-400" />,
  Coins: <Coins className="w-5 h-5 text-indigo-400" />,
  Layers: <Layers className="w-5 h-5 text-indigo-400" />,
  FlaskConical: <FlaskConical className="w-5 h-5 text-indigo-400" />,
  TrendingUp: <TrendingUp className="w-5 h-5 text-indigo-400" />,
  GitCompare: <GitCompare className="w-5 h-5 text-indigo-400" />,
  KeyRound: <KeyRound className="w-5 h-5 text-indigo-400" />,
  QrCode: <QrCode className="w-5 h-5 text-indigo-400" />,
  Code2: <Code2 className="w-5 h-5 text-indigo-400" />,
  Clock: <Clock className="w-5 h-5 text-indigo-400" />,
  LineChart: <LineChart className="w-5 h-5 text-indigo-400" />,
  Palette: <Palette className="w-5 h-5 text-indigo-400" />,
  Activity: <Activity className="w-5 h-5 text-indigo-400" />,
  Eye: <Eye className="w-5 h-5 text-indigo-400" />,
  Flame: <Flame className="w-5 h-5 text-indigo-400" />,
  Calendar: <Calendar className="w-5 h-5 text-indigo-400" />,
  Percent: <Percent className="w-5 h-5 text-amber-400" />,
  ShoppingCart: <ShoppingCart className="w-5 h-5 text-emerald-400" />,
  Mic: <Mic className="w-5 h-5 text-rose-400" />,
  Pencil: <Pencil className="w-5 h-5 text-indigo-400" />,
  Ruler: <Ruler className="w-5 h-5 text-cyan-400" />,
  Scissors: <Scissors className="w-5 h-5 text-indigo-400" />,
};

export const ToolGrid: React.FC<ToolGridProps> = ({
  tools,
  favorites,
  onSelectTool,
  onToggleFavorite,
  isOffline,
  activeCategory,
}) => {
  const { t } = useI18n();

  const CATEGORIES_METADATA: Array<{
    id: ToolCategory;
    label: string;
    icon: React.ReactNode;
    desc: string;
  }> = [
    {
      id: 'files',
      label: t('cat_files', 'Soubory & Dokumenty'),
      icon: <FileBox className="w-4 h-4 text-indigo-400" />,
      desc: t('desc_cat_files', 'Textový editor, offline konverze Wordu a multi-formátový převodník'),
    },
    {
      id: 'programming',
      label: t('cat_programming', 'Programování & Kód'),
      icon: <Code2 className="w-4 h-4 text-emerald-400" />,
      desc: t('desc_cat_prog', 'RegEx tester, formátovač JSON, porovnávač diff a kryptografické hashe'),
    },
    {
      id: 'planning',
      label: t('cat_planning', 'Plánování & Produktivita'),
      icon: <CalendarCheck className="w-4 h-4 text-amber-400" />,
      desc: t('desc_cat_plan', 'Interaktivní kalendář, Pomodoro časovač a světová časová pásma'),
    },
    {
      id: 'math',
      label: t('cat_math', 'Matematika & Kalkulačky'),
      icon: <Calculator className="w-4 h-4 text-blue-400" />,
      desc: t('desc_cat_math', 'Vědecké výpočty, matice libovolných rozměrů, grafy funkcí 2D a LaTeX'),
    },
    {
      id: 'science',
      label: t('cat_science', 'Věda & Chemie'),
      icon: <FlaskConical className="w-4 h-4 text-purple-400" />,
      desc: t('desc_cat_science', 'Oficiální periodická tabulka 118 prvků, molární hmotnost a vědecké převody'),
    },
    {
      id: 'finance',
      label: t('cat_finance', 'Finance & Kryptoměny'),
      icon: <Coins className="w-4 h-4 text-yellow-400" />,
      desc: t('desc_cat_finance', 'Měnový konvertor, živé i vlastní kurzy kryptoměn a hypotéční kalkulačka'),
    },
    {
      id: 'utilities',
      label: t('cat_utilities', 'Utility & Nástroje'),
      icon: <Wrench className="w-4 h-4 text-cyan-400" />,
      desc: t('desc_cat_util', 'Generátor bezpečných hesel, QR kódy, barvy, kontrast a systémový monitor'),
    },
  ];

  const renderToolCard = (tool: ToolDefinition) => {
    const isFav = favorites.includes(tool.id);
    const isLocked = tool.requiresOnline && isOffline;

    return (
      <div
        key={tool.id}
        onClick={() => onSelectTool(tool.id)}
        className={`p-5 rounded-2xl bg-slate-900/40 border transition-all duration-200 cursor-pointer flex flex-col justify-between group hover:shadow-lg ${
          isLocked
            ? 'border-slate-800/60 opacity-75 hover:border-amber-700/60'
            : 'border-slate-800 hover:border-indigo-500/50 hover:bg-slate-900/70'
        }`}
      >
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center group-hover:border-indigo-500/30 transition-colors">
              {ICON_MAP[tool.icon] || <Cpu className="w-5 h-5 text-indigo-400" />}
            </div>
            <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
              {tool.requiresOnline && (
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
                    isOffline
                      ? 'bg-amber-950/60 border-amber-800/60 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  {isOffline && <WifiOff className="w-2.5 h-2.5" />}
                  {isOffline ? 'Offline zamčeno' : 'Online API'}
                </span>
              )}
              <button
                onClick={() => onToggleFavorite(tool.id)}
                title={isFav ? 'Odebrat z oblíbených' : 'Přidat do oblíbených'}
                className="p-1.5 rounded-lg text-slate-500 hover:text-amber-400 transition-colors"
              >
                <Star className={`w-4 h-4 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-100 group-hover:text-indigo-300 transition-colors flex items-center gap-1">
              <span>{t(`tool_${tool.id.replace(/-/g, '_')}_title`, tool.title)}</span>
              <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-indigo-400" />
            </h3>
            <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
              {t(`tool_${tool.id.replace(/-/g, '_')}_desc`, tool.shortDesc)}
            </p>
          </div>
        </div>

        {/* Zero-pill metadata footer */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5 truncate">
            <span className="uppercase font-mono tracking-wider">
              {t(`cat_${tool.category}`, tool.category)}
            </span>
            <span aria-hidden="true">·</span>
            <span>{tool.requiresOnline ? t('online_badge', 'Online') : t('offline_badge', 'Offline')}</span>
          </div>
          <span className="font-mono text-slate-600 group-hover:text-slate-400 transition-colors">
            {t('open', 'Otevřít')} &rarr;
          </span>
        </div>
      </div>
    );
  };

  if (tools.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl bg-slate-900/20 border border-slate-800 space-y-3">
        <Star className="w-8 h-8 text-slate-600 mx-auto" />
        <h3 className="text-base font-semibold text-slate-300">{t('no_tools_found', 'Žádné nástroje')}</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          {activeCategory === 'favorites'
            ? t(
                'no_favorites_hint',
                'Zatím jste nepřidali žádný nástroj do oblíbených. Klikněte na hvězdičku u libovolného nástroje pro jeho připnutí.'
              )
            : t('no_tools_category', 'V této sekci se nenachází žádné moduly.')}
        </p>
      </div>
    );
  }

  // CASE 1: MAIN PAGE (activeCategory === 'all') -> Grouped into distinct Category Sections with Headings
  if (activeCategory === 'all') {
    return (
      <div className="space-y-10">
        {/* Main lead */}
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {t('cat_all', 'Všechny integrované nástroje')}
          </h2>
          <p className="text-xs text-slate-400">
            {t(
              'subtitle_all',
              'Všechny integrované nástroje rozdělené do přehledných kategorií pro okamžitou práci přímo na vašem zařízení.'
            )}
          </p>
        </div>

        {/* Category Sections */}
        {CATEGORIES_METADATA.map(cat => {
          const categoryTools = tools.filter(t => t.category === cat.id);
          if (categoryTools.length === 0) return null;

          return (
            <section key={cat.id} className="space-y-4">
              {/* Category Section Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 shadow-sm">
                    {cat.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                      <span>{cat.label}</span>
                    </h3>
                    <p className="text-xs text-slate-400">{cat.desc}</p>
                  </div>
                </div>

                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-slate-900/80 border border-slate-800 text-slate-400">
                  {t(
                    categoryTools.length === 1
                      ? 'tools_count_one'
                      : categoryTools.length < 5
                        ? 'tools_count_few'
                        : 'tools_count_many',
                    categoryTools.length === 1 ? '{count} tool' : '{count} tools',
                    { count: categoryTools.length }
                  )}
                </span>
              </div>

              {/* Tool Cards for this Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {categoryTools.map(renderToolCard)}
              </div>
            </section>
          );
        })}
      </div>
    );
  }

  // CASE 2: SINGLE CATEGORY (Specific Category View or Favorites)
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-white">
          {activeCategory === 'favorites' ? t('cat_favorites', 'Oblíbené nástroje') : t(`cat_${activeCategory}`, activeCategory)}
        </h2>
        <p className="text-xs text-slate-400">
          {activeCategory === 'favorites'
            ? t('subtitle_fav', 'Rychlý přístup k nástrojům připnutým hvězdičkou.')
            : t(`desc_cat_${activeCategory}`, 'Nástroje v této kategorii.')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tools.map(renderToolCard)}
      </div>
    </div>
  );
};
