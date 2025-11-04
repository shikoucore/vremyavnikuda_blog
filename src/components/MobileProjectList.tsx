import { useState, useMemo } from 'react';

interface Project {
  id: string;
  title: string;
  description: string;
  version?: string;
  status: string;
  tags: string[];
  github?: string;
  link?: string;
  projectType?: 'category' | 'project' | 'contribution';
  category?: 'projects' | 'contributing';
  parentProject?: string;
  roadmap?: Array<{
    version: string;
    releaseStatus: 'release' | 'dev';
    items?: string[];
  }>;
}

interface Props {
  projects: Project[];
}

interface ProjectWithChildren extends Project {
  children?: ProjectWithChildren[];
}

export default function MobileProjectList({ projects }: Props) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<{
    projectTitle: string;
    version: string;
    releaseStatus: 'release' | 'dev';
    items?: string[];
  } | null>(null);

  // Build hierarchy - memoized to avoid recalculation
  // ВАЖНО: useMemo должен быть до любых условных return!
  const hierarchy = useMemo(() => {
    if (!projects || projects.length === 0) {
      return [];
    }
    
    const projectsMap = new Map<string, ProjectWithChildren>();
    const rootProjects: ProjectWithChildren[] = [];

    projects.forEach(project => {
      projectsMap.set(project.title, { ...project, children: [] });
    });

    projects.forEach(project => {
      const projectNode = projectsMap.get(project.title)!;
      
      if (project.parentProject) {
        const parentNode = projectsMap.get(project.parentProject);
        if (parentNode) {
          parentNode.children!.push(projectNode);
        } else {
          rootProjects.push(projectNode);
        }
      } else {
        rootProjects.push(projectNode);
      }
    });

    return rootProjects;
  }, [projects]);

  const toggleProject = (projectTitle: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectTitle)) {
        next.delete(projectTitle);
      } else {
        next.add(projectTitle);
      }
      return next;
    });
  };

  const statusColors: Record<string, string> = {
    active: 'bg-green-500/20 text-green-400 border-green-500/40',
    maintenance: 'bg-blue-500/20 text-blue-400 border-blue-500/40',
    completed: 'bg-purple-500/20 text-purple-400 border-purple-500/40',
    archived: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
  };

  const renderProject = (project: ProjectWithChildren, level: number = 0) => {
    const isExpanded = expandedProjects.has(project.title);
    const hasChildren = project.children && project.children.length > 0;
    const hasVersions = project.roadmap && project.roadmap.length > 0;
    const hasExpandable = hasChildren || hasVersions;

    return (
      <div key={project.id} className="mb-2">
        {/* Project Header */}
        <div
          className={`flex items-center min-h-[44px] p-3 rounded-lg border transition-colors ${
            statusColors[project.status] || statusColors.archived
          }`}
          style={{ marginLeft: `${level * 16}px` }}
        >
          {/* Expand/Collapse Button */}
          {hasExpandable && (
            <button
              onClick={() => toggleProject(project.title)}
              className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-lg mr-2 hover:bg-white/5 rounded transition-colors"
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          
          {/* Project Info */}
          <div 
            className="flex-1 min-w-0"
            onClick={() => setSelectedProject(project)}
          >
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-sm truncate">{project.title}</h3>
              {project.version && (
                <span className="text-xs opacity-70 flex-shrink-0">
                  v{project.version}
                </span>
              )}
            </div>
            <p className="text-xs opacity-80 line-clamp-1">{project.description}</p>
          </div>

          {/* Info Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedProject(project);
            }}
            className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-cyan-400 hover:bg-cyan-400/10 rounded transition-colors ml-2"
            aria-label="View details"
          >
            ⓘ
          </button>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-2 space-y-2">
            {/* Child Projects */}
            {hasChildren && project.children!.map(child => renderProject(child, level + 1))}

            {/* Versions */}
            {hasVersions && (
              <div className="space-y-1" style={{ marginLeft: `${(level + 1) * 16}px` }}>
                {project.roadmap!.map((milestone) => (
                  <button
                    key={milestone.version}
                    onClick={() => setSelectedVersion({
                      projectTitle: project.title,
                      version: milestone.version,
                      releaseStatus: milestone.releaseStatus,
                      items: milestone.items,
                    })}
                    className={`w-full flex items-center min-h-[44px] p-3 rounded-lg border transition-colors ${
                      milestone.releaseStatus === 'release'
                        ? 'bg-green-500/10 text-green-400 border-green-500/30'
                        : 'bg-orange-500/10 text-orange-400 border-orange-500/30'
                    } hover:bg-opacity-80`}
                  >
                    <span className="text-lg mr-2">
                      {milestone.releaseStatus === 'release' ? '🟢' : '🟠'}
                    </span>
                    <span className="font-mono text-sm">v{milestone.version}</span>
                    <span className="ml-2 text-xs opacity-70">
                      {milestone.releaseStatus === 'release' ? 'Release' : 'Dev'}
                    </span>
                    {milestone.items && milestone.items.length > 0 && (
                      <span className="ml-auto text-xs opacity-50">
                        {milestone.items.length} item{milestone.items.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render empty state if no projects
  if (!projects || projects.length === 0 || hierarchy.length === 0) {
    return (
      <div className="p-4 text-center text-[var(--color-text-secondary)]">
        <p>No projects found</p>
      </div>
    );
  }

  return (
    <div className="mobile-project-list p-4">
      {/* Header */}
      <div className="mb-4 p-4 bg-[var(--color-bg-secondary)] rounded-lg">
        <h2 className="text-lg font-bold text-cyan-400 mb-1">Projects</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Tap to expand projects and view versions
        </p>
      </div>

      {/* Project List */}
      <div className="space-y-2">
        {hierarchy.map(project => renderProject(project))}
      </div>

      {/* Project Details Modal */}
      {selectedProject && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4"
          onClick={() => setSelectedProject(null)}
        >
          <div
            className="bg-[var(--color-bg)] border border-cyan-400 rounded-lg p-6 max-w-lg max-h-[80vh] overflow-y-auto w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-cyan-400 pr-8">{selectedProject.title}</h2>
              <button
                onClick={() => setSelectedProject(null)}
                className="text-[var(--color-text-secondary)] hover:text-cyan-400 text-2xl flex-shrink-0"
              >
                ✕
              </button>
            </div>

            <p className="text-[var(--color-text)] mb-4">{selectedProject.description}</p>

            <div className="flex flex-wrap gap-2 mb-4">
              {selectedProject.tags.map(tag => (
                <span key={tag} className="text-xs px-2 py-1 bg-[var(--color-bg-secondary)] rounded">
                  {tag}
                </span>
              ))}
            </div>

            {selectedProject.version && (
              <p className="text-sm text-cyan-400 mb-4">Current Version: v{selectedProject.version}</p>
            )}

            <div className="flex flex-wrap gap-3 mb-6">
              {selectedProject.github && (
                <a
                  href={selectedProject.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline text-sm"
                >
                  GitHub →
                </a>
              )}
              {selectedProject.link && (
                <a
                  href={selectedProject.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:underline text-sm"
                >
                  Visit →
                </a>
              )}
            </div>

            {selectedProject.roadmap && selectedProject.roadmap.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-cyan-400 mb-3">Roadmap</h3>
                <div className="space-y-3">
                  {selectedProject.roadmap.map(milestone => (
                    <div key={milestone.version} className="border border-[var(--color-border)] rounded-lg p-3">
                      <h4 className="font-bold mb-2 flex items-center gap-2">
                        <span>v{milestone.version}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          milestone.releaseStatus === 'release' 
                            ? 'bg-green-900/30 text-green-400' 
                            : 'bg-orange-900/30 text-orange-400'
                        }`}>
                          {milestone.releaseStatus === 'release' ? 'Release' : 'Dev'}
                        </span>
                      </h4>
                      {milestone.items && milestone.items.length > 0 && (
                        <ul className="space-y-1">
                          {milestone.items.map((item, idx) => (
                            <li key={idx} className="text-sm text-[var(--color-text-secondary)]">
                              • {item}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Version Details Modal */}
      {selectedVersion && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4"
          onClick={() => setSelectedVersion(null)}
        >
          <div
            className="bg-[var(--color-bg)] border border-cyan-400 rounded-lg p-6 max-w-lg max-h-[80vh] overflow-y-auto w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-cyan-400">{selectedVersion.projectTitle}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <h3 className="text-lg font-bold">v{selectedVersion.version}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${
                    selectedVersion.releaseStatus === 'release' 
                      ? 'bg-green-900/30 text-green-400' 
                      : 'bg-orange-900/30 text-orange-400'
                  }`}>
                    {selectedVersion.releaseStatus === 'release' ? 'Release' : 'Dev'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedVersion(null)}
                className="text-[var(--color-text-secondary)] hover:text-cyan-400 text-2xl flex-shrink-0"
              >
                ✕
              </button>
            </div>

            {selectedVersion.items && selectedVersion.items.length > 0 ? (
              <div>
                <h4 className="text-base font-bold text-cyan-400 mb-3">Changes</h4>
                <ul className="space-y-2">
                  {selectedVersion.items.map((item, idx) => (
                    <li key={idx} className="text-sm text-[var(--color-text)]">
                      • {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-text-secondary)] italic">
                No detailed changelog available for this version.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
