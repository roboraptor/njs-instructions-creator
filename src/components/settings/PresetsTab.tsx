"use client";

import { useState, useEffect } from "react";
import {
  getSnippets,
  getCategories,
  getPresets,
  updatePreset,
  deletePreset,
  Snippet,
  Category,
  Preset,
} from "@/lib/actions";

interface CategoryNode extends Category {
  children: CategoryNode[];
}

interface FlatOption {
  id: number;
  name: string;
  depth: number;
}

function buildCategoryTree(list: Category[]): CategoryNode[] {
  const map: Record<number, CategoryNode> = {};
  const roots: CategoryNode[] = [];

  list.forEach((item) => {
    map[item.id] = { ...item, children: [] };
  });

  list.forEach((item) => {
    const node = map[item.id];
    if (item.parent_id === null) {
      roots.push(node);
    } else {
      const parent = map[item.parent_id];
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
  });

  const sortNodes = (nodes: CategoryNode[]) => {
    nodes.sort((a, b) => a.order_index - b.order_index);
    nodes.forEach((node) => sortNodes(node.children));
  };
  sortNodes(roots);

  return roots;
}

function getFlattenedOptions(nodes: CategoryNode[], depth = 0): FlatOption[] {
  let result: FlatOption[] = [];
  nodes.forEach((node) => {
    result.push({ id: node.id, name: node.name, depth });
    if (node.children.length > 0) {
      result = result.concat(getFlattenedOptions(node.children, depth + 1));
    }
  });
  return result;
}

function getCategoryPath(list: Category[], categoryId: number | null, truncateParents = false): string {
  if (categoryId === null) return "None";
  const path: string[] = [];
  let currentId: number | null = categoryId;
  while (currentId !== null) {
    const item = list.find((c) => c.id === currentId);
    if (!item) break;

    if (truncateParents && currentId !== categoryId) {
      path.unshift(item.name.length > 8 ? item.name.slice(0, 8) + ".." : item.name);
    } else {
      path.unshift(item.name);
    }

    currentId = item.parent_id;
  }
  return path.join(" > ");
}

interface PresetsTabProps {
  onRefreshStats?: () => void;
}

export default function PresetsTab({ onRefreshStats }: PresetsTabProps) {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loadingPresets, setLoadingPresets] = useState<boolean>(true);

  // Preset Inline Edit States
  const [editingPresetId, setEditingPresetId] = useState<number | null>(null);
  const [editPresetName, setEditPresetName] = useState<string>("");
  const [editPresetSnippetIds, setEditPresetSnippetIds] = useState<number[]>([]);

  const loadData = async () => {
    setLoadingPresets(true);
    try {
      const [snippetsData, categoriesData, presetsData] = await Promise.all([
        getSnippets(),
        getCategories(),
        getPresets(),
      ]);
      setSnippets(snippetsData);
      setCategories(categoriesData);
      setPresets(presetsData);
    } catch (error) {
      console.error("Failed to load presets tab data", error);
    } finally {
      setLoadingPresets(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const startEditPreset = (preset: Preset) => {
    setEditingPresetId(preset.id);
    setEditPresetName(preset.name);
    try {
      const ids = JSON.parse(preset.snippet_ids) as number[];
      setEditPresetSnippetIds(ids);
    } catch (e) {
      setEditPresetSnippetIds([]);
    }
  };

  const cancelEditPreset = () => {
    setEditingPresetId(null);
    setEditPresetName("");
    setEditPresetSnippetIds([]);
  };

  const handleToggleSnippetInPreset = (snippetId: number) => {
    setEditPresetSnippetIds((prev) =>
      prev.includes(snippetId)
        ? prev.filter((id) => id !== snippetId)
        : [...prev, snippetId]
    );
  };

  const handleUpdatePreset = async (id: number) => {
    if (!editPresetName.trim()) {
      alert("Preset name cannot be empty.");
      return;
    }
    if (editPresetSnippetIds.length === 0) {
      alert("Preset must contain at least one snippet.");
      return;
    }

    try {
      await updatePreset(id, editPresetName.trim(), editPresetSnippetIds);
      setEditingPresetId(null);
      await loadData();
      if (onRefreshStats) onRefreshStats();
    } catch (error) {
      alert("Failed to update preset.");
      console.error(error);
    }
  };

  const handleDeletePreset = async (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete preset "${name}"?`)) {
      try {
        await deletePreset(id);
        await loadData();
        if (onRefreshStats) onRefreshStats();
      } catch (error) {
        alert("Failed to delete preset.");
        console.error(error);
      }
    }
  };

  const categoryTree = buildCategoryTree(categories);
  const flattenedOptions = getFlattenedOptions(categoryTree);

  // Sort snippets by category tree hierarchy
  const catOrderMap = new Map<number | null, number>();
  flattenedOptions.forEach((opt, idx) => {
    catOrderMap.set(opt.id, idx);
  });
  catOrderMap.set(null, Infinity);

  const sortedSnippets = [...snippets].sort((a, b) => {
    const orderA = catOrderMap.get(a.category_id) ?? Infinity;
    const orderB = catOrderMap.get(b.category_id) ?? Infinity;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.order_index - b.order_index;
  });

  return (
    <div className="row g-2">
      <div className="col-12">
        <div className="alert alert-info border-info-subtle font-monospace py-2 px-3 mb-4 shadow-sm" style={{ fontSize: '0.85rem' }}>
          <strong>💡 Pro Tip:</strong> Presets are captured on the <a href="/" className="alert-link text-decoration-underline">Main Page</a> by checking desired boxes and entering a name. Use this page to manage existing presets, adjust names, or customize snippet associations.
        </div>

        <div className="card shadow-sm border-secondary-subtle">
          <div className="card-header bg-dark text-white fw-medium py-2">
            Saved Presets
          </div>
          <div className="card-body p-0">
            {loadingPresets ? (
              <div className="p-5 text-center">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : presets.length === 0 ? (
              <div className="p-5 text-center text-muted">
                No presets found. Go to the <a href="/" className="text-primary fw-medium text-decoration-none">Main Page</a>, select snippets, and save them as a preset.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th style={{ width: "25%" }} className="ps-3">Preset Name</th>
                      <th style={{ width: "15%" }}>Snippet Count</th>
                      <th style={{ width: "45%" }}>Associated Snippets</th>
                      <th style={{ width: "15%" }} className="text-end pe-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {presets.map((preset) => {
                      const isEditing = editingPresetId === preset.id;
                      let parsedIds: number[] = [];
                      try {
                        parsedIds = JSON.parse(preset.snippet_ids) as number[];
                      } catch (e) { }

                      return (
                        <tr key={preset.id} className={isEditing ? "table-warning" : ""}>
                          {/* Preset Name */}
                          <td className="ps-3">
                            {isEditing ? (
                              <input
                                type="text"
                                className="form-control form-control-sm fw-semibold"
                                value={editPresetName}
                                onChange={(e) => setEditPresetName(e.target.value)}
                              />
                            ) : (
                              <span className="fw-semibold text-primary">{preset.name}</span>
                            )}
                          </td>

                          {/* Snippet Count */}
                          <td>
                            <span className="badge bg-secondary font-monospace">
                              {isEditing ? editPresetSnippetIds.length : parsedIds.length} snippets
                            </span>
                          </td>

                          {/* Snippets Included */}
                          <td>
                            {isEditing ? (
                              <div className="border border-secondary-subtle rounded p-2 bg-dark-subtle" style={{ maxHeight: "200px", overflowY: "auto" }}>
                                {sortedSnippets.map((snippet) => {
                                  const isChecked = editPresetSnippetIds.includes(snippet.id);
                                  const catPath = getCategoryPath(categories, snippet.category_id, true);
                                  return (
                                    <div key={snippet.id} className="form-check form-check-inline me-3 mb-1">
                                      <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id={`preset-edit-snip-${snippet.id}`}
                                        checked={isChecked}
                                        onChange={() => handleToggleSnippetInPreset(snippet.id)}
                                      />
                                      <label className="form-check-label small" htmlFor={`preset-edit-snip-${snippet.id}`}>
                                        <span className="text-muted text-uppercase font-monospace me-1" style={{ fontSize: '0.7rem' }}>
                                          [{catPath}]
                                        </span>
                                        {snippet.title}
                                      </label>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-truncate text-muted small" style={{ maxWidth: "500px" }} title={
                                parsedIds.map(id => snippets.find(s => s.id === id)?.title).filter(Boolean).join(", ")
                              }>
                                {parsedIds.map(id => {
                                  const s = snippets.find(sn => sn.id === id);
                                  return s ? s.title : null;
                                }).filter(Boolean).join(", ") || <span className="text-danger">Empty Preset</span>}
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="text-end pe-3">
                            {isEditing ? (
                              <div className="btn-group btn-group-sm">
                                <button
                                  type="button"
                                  className="btn btn-success fw-medium"
                                  onClick={() => handleUpdatePreset(preset.id)}
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary"
                                  onClick={cancelEditPreset}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="btn-group btn-group-sm">
                                <button
                                  type="button"
                                  className="btn btn-outline-primary"
                                  onClick={() => startEditPreset(preset)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-danger"
                                  onClick={() => handleDeletePreset(preset.id, preset.name)}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
