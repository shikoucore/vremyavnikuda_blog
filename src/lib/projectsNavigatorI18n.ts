export type NavigatorLang = 'ja' | 'en';

interface NavigatorCopy {
  searchPlaceholder: string;
  tools: string;
  hideTools: string;
  resetView: string;
  clear: string;
  visible: string;
  matched: string;
  focusNodes: string;
  versionsHidden: string;
  category: string;
  status: string;
  focusAllBranches: string;
  linkedEdges: string;
  versionNodes: string;
  noNodesMatch: string;
  projectsNavigator: string;
  searchHint: string;
  showRelatedProjects: string;
  noProjectsMatch: string;
  focusCompact: string;
  categoryOptions: {
    all: string;
    projects: string;
    contributing: string;
  };
  statusOptions: {
    active: string;
    maintenance: string;
    completed: string;
    archived: string;
  };
}

const copy: Record<NavigatorLang, NavigatorCopy> = {
  en: {
    searchPlaceholder: 'Search projects, tags, versions, roadmap...',
    tools: 'Tools',
    hideTools: 'Hide tools',
    resetView: 'Reset view',
    clear: 'Clear',
    visible: 'Visible',
    matched: 'Matched',
    focusNodes: 'Focus nodes',
    versionsHidden: 'Versions: hidden',
    category: 'Category',
    status: 'Status',
    focusAllBranches: 'Focus: all branches',
    linkedEdges: 'Linked edges',
    versionNodes: 'Version nodes',
    noNodesMatch: 'No nodes match the current filters. Try resetting filters or broadening the search.',
    projectsNavigator: 'Projects Navigator',
    searchHint: 'Search, filter and focus on a branch to reduce noise.',
    showRelatedProjects: 'Show related projects',
    noProjectsMatch: 'No projects match current filters.',
    focusCompact: 'Focus',
    categoryOptions: {
      all: 'all',
      projects: 'projects',
      contributing: 'contributing',
    },
    statusOptions: {
      active: 'active',
      maintenance: 'maintenance',
      completed: 'completed',
      archived: 'archived',
    },
  },
  ja: {
    searchPlaceholder: 'プロジェクト、タグ、バージョン、ロードマップを検索...',
    tools: 'ツール',
    hideTools: 'ツールを閉じる',
    resetView: '表示をリセット',
    clear: 'クリア',
    visible: '表示',
    matched: '一致',
    focusNodes: 'フォーカス対象',
    versionsHidden: 'バージョン: 非表示',
    category: 'カテゴリ',
    status: 'ステータス',
    focusAllBranches: 'フォーカス: 全体',
    linkedEdges: '関連リンク線',
    versionNodes: 'バージョンノード',
    noNodesMatch: '現在のフィルターに一致するノードがありません。フィルターをリセットしてください。',
    projectsNavigator: 'プロジェクトナビゲーター',
    searchHint: '検索・フィルター・フォーカスでノイズを減らします。',
    showRelatedProjects: '関連プロジェクトを表示',
    noProjectsMatch: '現在のフィルターに一致するプロジェクトがありません。',
    focusCompact: 'フォーカス',
    categoryOptions: {
      all: 'すべて',
      projects: 'プロジェクト',
      contributing: '貢献',
    },
    statusOptions: {
      active: '稼働中',
      maintenance: '保守',
      completed: '完了',
      archived: 'アーカイブ',
    },
  },
};

export function getProjectsNavigatorCopy(lang: NavigatorLang): NavigatorCopy {
  return copy[lang];
}
