import type { Project } from '../components/projects/types';

export const PROJECT_STATUS_VALUES = ['active', 'maintenance', 'completed', 'archived'] as const;
export type ProjectStatusValue = (typeof PROJECT_STATUS_VALUES)[number];

export const PROJECT_CATEGORY_VALUES = ['projects', 'contributing'] as const;
export type ProjectCategoryValue = (typeof PROJECT_CATEGORY_VALUES)[number];
export type ProjectCategoryFilter = 'all' | ProjectCategoryValue;

export interface ProjectNavigatorFilters {
  query: string;
  statuses: Set<ProjectStatusValue>;
  category: ProjectCategoryFilter;
  focusTitle?: string | null;
}

export interface ProjectWithChildren extends Project {
  children: ProjectWithChildren[];
}

export interface ProjectFilterResult {
  visibleProjects: Project[];
  matchedCount: number;
  primaryMatchedCount: number;
  visibleCount: number;
  totalCount: number;
  focusCount: number;
}

interface ProjectGraph {
  byTitle: Map<string, Project>;
  childrenByTitle: Map<string, string[]>;
}

const normalize = (value: string): string => value.trim().toLowerCase();

const isKnownStatus = (status: string): status is ProjectStatusValue => {
  return PROJECT_STATUS_VALUES.includes(status as ProjectStatusValue);
};

const sortByTypeAndTitle = (a: Project, b: Project): number => {
  const typeScore = (project: Project): number => {
    if (project.projectType === 'category') return 0;
    if (project.projectType === 'project') return 1;
    return 2;
  };

  const scoreDiff = typeScore(a) - typeScore(b);
  if (scoreDiff !== 0) return scoreDiff;
  return a.title.localeCompare(b.title, 'en', { sensitivity: 'base' });
};

const buildProjectGraph = (projects: Project[]): ProjectGraph => {
  const byTitle = new Map<string, Project>();
  const childrenByTitle = new Map<string, string[]>();

  for (const project of projects) {
    byTitle.set(project.title, project);
    childrenByTitle.set(project.title, []);
  }

  for (const project of projects) {
    if (!project.parentProject) continue;
    const children = childrenByTitle.get(project.parentProject);
    if (children) {
      children.push(project.title);
    }
  }

  return { byTitle, childrenByTitle };
};

const collectAncestorTitles = (title: string, graph: ProjectGraph): Set<string> => {
  const ancestors = new Set<string>();
  const visited = new Set<string>();
  let current = graph.byTitle.get(title);

  while (current?.parentProject) {
    const parentTitle = current.parentProject;
    if (visited.has(parentTitle)) break;
    visited.add(parentTitle);
    ancestors.add(parentTitle);
    current = graph.byTitle.get(parentTitle);
  }

  return ancestors;
};

const collectDescendantTitles = (title: string, graph: ProjectGraph): Set<string> => {
  const descendants = new Set<string>();
  const queue: string[] = [title];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    const children = graph.childrenByTitle.get(current) ?? [];
    for (const child of children) {
      if (descendants.has(child)) continue;
      descendants.add(child);
      queue.push(child);
    }
  }

  descendants.delete(title);
  return descendants;
};

const intersectTitles = (left: Set<string>, right: Set<string>): Set<string> => {
  const result = new Set<string>();
  for (const value of left) {
    if (right.has(value)) result.add(value);
  }
  return result;
};

export const matchesProjectQuery = (project: Project, query: string): boolean => {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return true;

  const roadmapText = (project.roadmap ?? [])
    .flatMap((entry) => [entry.version, entry.releaseStatus, ...(entry.items ?? [])])
    .join(' ');

  const haystack = [
    project.title,
    project.description,
    project.version ?? '',
    project.projectType ?? '',
    project.category ?? '',
    ...project.tags,
    roadmapText,
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalizedQuery);
};

export const filterProjectsForNavigator = (
  projects: Project[],
  filters: ProjectNavigatorFilters,
): ProjectFilterResult => {
  if (projects.length === 0) {
    return {
      visibleProjects: [],
      matchedCount: 0,
      primaryMatchedCount: 0,
      visibleCount: 0,
      totalCount: 0,
      focusCount: 0,
    };
  }

  const graph = buildProjectGraph(projects);
  const normalizedQuery = normalize(filters.query);

  const candidates = projects.filter((project) => {
    const categoryMatch = filters.category === 'all' || project.category === filters.category;
    if (!categoryMatch) return false;

    if (!isKnownStatus(project.status)) return false;
    return filters.statuses.has(project.status);
  });

  const candidateTitles = new Set(candidates.map((project) => project.title));

  const matchedTitles = new Set<string>();
  const primaryMatchedTitles = new Set<string>();
  for (const project of candidates) {
    if (normalizedQuery && !matchesProjectQuery(project, normalizedQuery)) {
      continue;
    }
    matchedTitles.add(project.title);

    if (!normalizedQuery) continue;
    const titleMatch = project.title.toLowerCase().includes(normalizedQuery);
    const idMatch = project.id.toLowerCase().includes(normalizedQuery);
    if (titleMatch || idMatch) {
      primaryMatchedTitles.add(project.title);
    }
  }

  let visibleTitles: Set<string>;
  if (normalizedQuery) {
    const seedMatches = primaryMatchedTitles.size > 0 ? primaryMatchedTitles : matchedTitles;
    visibleTitles = new Set(seedMatches);

    for (const title of seedMatches) {
      const ancestors = collectAncestorTitles(title, graph);
      for (const ancestor of ancestors) {
        if (candidateTitles.has(ancestor)) {
          visibleTitles.add(ancestor);
        }
      }
    }

    if (primaryMatchedTitles.size > 0) {
      for (const primaryTitle of primaryMatchedTitles) {
        const descendants = collectDescendantTitles(primaryTitle, graph);
        for (const descendant of descendants) {
          if (candidateTitles.has(descendant)) {
            visibleTitles.add(descendant);
          }
        }
      }
    }
  } else {
    visibleTitles = new Set(candidateTitles);
  }

  let focusCount = 0;
  if (filters.focusTitle && graph.byTitle.has(filters.focusTitle)) {
    const focusBranch = new Set<string>([filters.focusTitle]);
    const ancestors = collectAncestorTitles(filters.focusTitle, graph);
    const descendants = collectDescendantTitles(filters.focusTitle, graph);

    for (const ancestor of ancestors) focusBranch.add(ancestor);
    for (const descendant of descendants) focusBranch.add(descendant);

    const focusedVisible = intersectTitles(visibleTitles, focusBranch);
    focusCount = focusedVisible.size;

    const withContext = new Set(focusedVisible);
    for (const title of focusedVisible) {
      const branchAncestors = collectAncestorTitles(title, graph);
      for (const ancestor of branchAncestors) {
        if (candidateTitles.has(ancestor)) withContext.add(ancestor);
      }
    }
    visibleTitles = withContext;
  }

  const visibleProjects = projects
    .filter((project) => visibleTitles.has(project.title))
    .sort(sortByTypeAndTitle);

  return {
    visibleProjects,
    matchedCount: normalizedQuery ? matchedTitles.size : candidates.length,
    primaryMatchedCount: normalizedQuery ? primaryMatchedTitles.size : candidates.length,
    visibleCount: visibleProjects.length,
    totalCount: projects.length,
    focusCount,
  };
};

export const buildProjectHierarchy = (projects: Project[]): ProjectWithChildren[] => {
  const byTitle = new Map<string, ProjectWithChildren>();
  const roots: ProjectWithChildren[] = [];

  for (const project of projects) {
    byTitle.set(project.title, { ...project, children: [] });
  }

  for (const project of projects) {
    const node = byTitle.get(project.title);
    if (!node) continue;

    if (project.parentProject) {
      const parent = byTitle.get(project.parentProject);
      if (parent) {
        parent.children.push(node);
        continue;
      }
    }

    roots.push(node);
  }

  const sortRecursively = (nodes: ProjectWithChildren[]): void => {
    nodes.sort(sortByTypeAndTitle);
    for (const node of nodes) {
      if (node.children.length > 0) {
        sortRecursively(node.children);
      }
    }
  };

  sortRecursively(roots);
  return roots;
};
