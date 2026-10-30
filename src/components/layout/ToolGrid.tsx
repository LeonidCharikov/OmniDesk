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
  Calendar
} from 'lucide-react';
import { ToolDefinition, ToolCategory } from '../../types/tool';

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
};

import { useI18n } from '../../i18n/context';

export const ToolGrid: React.FC<ToolGridProps> = ({
  tools,
  favorites,
  onSelectTool,
  onToggleFavorite,
  isOffline,
  activeCategory,
}) => {
  const { t } = useI18n();

  const getCategoryTitle = () => {
    switch (activeCategory) {
      case 'all': return t('cat_all', 'Všechny integrované nástroje');
      case 'favorites': return t('cat_favorites', 'Vaše oblíbené nástroje');
      case 'files': return t('cat_files', 'Soubory & Dokumenty');
      case 'math': return t('cat_math', 'Matematika & Kalkulačky');
      case 'science': return t('cat_science', 'Věda & Chemie');
      case 'finance': return t('cat_finance', 'Finance & Kryptoměny');
      case 'utilities': return t('cat_utilities', 'Vývojářské a systémové utility');
      default: return t('catalog', 'Katalog nástrojů');
    }
  };

  const getCategorySubtitle = () => {
    switch (activeCategory) {
      case 'all': return t('subtitle_all', 'Všechny integrované nástroje pro okamžitou práci přímo na vašem zařízení.');
      case 'favorites': return t('subtitle_fav', 'Rychlý přístup k nástrojům uloženým ve vašem lokálním konfiguračním souboru.');
      case 'files': return t('subtitle_files', 'Univerzální konverze dokumentů, dat a optimalizace obrázků bez serveru.');
      case 'math': return t('subtitle_math', 'Klasické, vědecké, maticové a statistické výpočetní nástroje.');
      case 'science': return t('subtitle_science', 'Vysoce přesné chemické a fyzikální výpočty, periodická tabulka a převody jednotek.');
      case 'finance': return t('subtitle_finance', 'Konvertor měn, krypto-ceny v reálném čase, hypotéky a splátkové kalendáře.');
      case 'utilities': return t('subtitle_utilities', 'Systémový hardware monitor, vývojářské utility, QR kódy a generátory hesel.');
      default: return t('subtitle_default', 'Vyberte nástroj pro okamžitou práci přímo na vašem zařízení.');
    }
  };

  if (tools.length === 0) {
    return (
      <div className="p-12 text-center rounded-2xl bg-slate-900/20 border border-slate-800 space-y-3">
        <Star className="w-8 h-8 text-slate-600 mx-auto" />
        <h3 className="text-base font-semibold text-slate-300">{t('no_tools_found', 'Žádné nástroje')}</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          {activeCategory === 'favorites' 
            ? t('no_favorites_hint', 'Zatím jste nepřidali žádný nástroj do oblíbených. Klikněte na hvězdičku u libovolného nástroje pro jeho připnutí.')
            : t('no_tools_category', 'V této sekci se nenachází žádné moduly.')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category Hero / Lead */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-white">{getCategoryTitle()}</h2>
        <p className="text-xs text-slate-400">{getCategorySubtitle()}</p>
      </div>

      {/* Grid of Tool Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tools.map(tool => {
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
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border flex items-center gap-1 ${
                        isOffline 
                          ? 'bg-amber-950/60 border-amber-800/60 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}>
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
                  <span className="uppercase font-mono tracking-wider">{tool.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{tool.requiresOnline ? t('online_badge', 'Online') : t('offline_badge', 'Offline')}</span>
                </div>
                <span className="font-mono text-slate-600 group-hover:text-slate-400 transition-colors">
                  {t('open', 'Otevřít')} &rarr;
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
