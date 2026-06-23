"use client";

import { useState, useEffect } from "react";
import {
  getSnippets,
  addSnippet,
  updateSnippet,
  deleteSnippet,
  getCategories,
  Snippet,
  Category,
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

interface SnippetsTabProps {
  onRefreshStats?: () => void;
}

export default function SnippetsTab({ onRefreshStats }: SnippetsTabProps) {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingSnippets, setLoadingSnippets] = useState<boolean>(true);

  // Snippet Inline Edit States
  const [editingSnippetId, setEditingSnippetId] = useState<number | null>(null);
  const [editSnippetTitle, setEditSnippetTitle] = useState<string>("");
  const [editSnippetContent, setEditSnippetContent] = useState<string>("");
  const [editSnippetOrderIndex, setEditSnippetOrderIndex] = useState<number>(0);
  const [editSnippetCategoryId, setEditSnippetCategoryId] = useState<number | null>(null);

  const loadSnippets = async () => {
    setLoadingSnippets(true);
    try {
      const data = await getSnippets();
      setSnippets(data);
    } catch (error) {
      console.error("Failed to load snippets", error);
    } finally {
      setLoadingSnippets(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error("Failed to load categories", error);
    }
  };

  useEffect(() => {
    loadSnippets();
    loadCategories();
  }, []);

  const handleAddSnippet = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      await addSnippet(formData);
      form.reset();
      await loadSnippets();
      if (onRefreshStats) onRefreshStats();
    } catch (error) {
      alert("Failed to add snippet.");
      console.error(error);
    }
  };

  const startEditSnippet = (snippet: Snippet) => {
    setEditingSnippetId(snippet.id);
    setEditSnippetTitle(snippet.title);
    setEditSnippetContent(snippet.content);
    setEditSnippetOrderIndex(snippet.order_index);
    setEditSnippetCategoryId(snippet.category_id);
  };

  const cancelEditSnippet = () => {
    setEditingSnippetId(null);
    setEditSnippetTitle("");
    setEditSnippetContent("");
    setEditSnippetOrderIndex(0);
    setEditSnippetCategoryId(null);
  };

  const handleUpdateSnippet = async (id: number) => {
    if (!editSnippetTitle.trim() || !editSnippetContent.trim()) {
      alert("Title and Content cannot be empty.");
      return;
    }

    const formData = new FormData();
    formData.append("title", editSnippetTitle);
    formData.append("content", editSnippetContent);
    formData.append("order_index", editSnippetOrderIndex.toString());
    formData.append("category_id", editSnippetCategoryId !== null ? editSnippetCategoryId.toString() : "");

    try {
      await updateSnippet(id, formData);
      setEditingSnippetId(null);
      await loadSnippets();
      if (onRefreshStats) onRefreshStats();
    } catch (error) {
      alert("Failed to update snippet.");
      console.error(error);
    }
  };

  const handleDeleteSnippet = async (id: number, title: string) => {
    if (confirm(`Are you sure you want to delete snippet "${title}"?`)) {
      try {
        await deleteSnippet(id);
        await loadSnippets();
        if (onRefreshStats) onRefreshStats();
      } catch (error) {
        alert("Failed to delete snippet.");
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
      {/* Left Form: Add Snippet */}
      <div className="col-lg-4">
        <div className="card shadow-sm border-secondary-subtle">
          <div className="card-header bg-dark text-white fw-medium py-2">
            Add New Snippet
          </div>
          <div className="card-body">
            <form onSubmit={handleAddSnippet}>
              <div className="mb-3">
                <label htmlFor="new-title" className="form-label small fw-semibold text-secondary">
                  Snippet Title
                </label>
                <input
                  type="text"
                  id="new-title"
                  name="title"
                  className="form-control border-secondary-subtle"
                  placeholder="e.g. Git Setup Instructions"
                  required
                />
              </div>

              <div className="mb-3">
                <label htmlFor="new-category" className="form-label small fw-semibold text-secondary">
                  Category Assignment
                </label>
                <select
                  id="new-category"
                  name="category_id"
                  className="form-select border-secondary-subtle"
                >
                  <option value="">-- No Category (Uncategorized) --</option>
                  {flattenedOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {"\u00A0\u00A0".repeat(opt.depth)}
                      {opt.depth > 0 ? "↳ " : ""}
                      {opt.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-3">
                <label htmlFor="new-order" className="form-label small fw-semibold text-secondary">
                  Order Index (Optional)
                </label>
                <input
                  type="number"
                  id="new-order"
                  name="order_index"
                  className="form-control border-secondary-subtle"
                  placeholder="Auto-assigns next index"
                  min="0"
                />
                <div className="form-text small text-muted">
                  Leave blank to append to the end of the category automatically.
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="new-content" className="form-label small fw-semibold text-secondary">
                  Snippet Content (Markdown / Code)
                </label>
                <textarea
                  id="new-content"
                  name="content"
                  className="form-control font-monospace border-secondary-subtle"
                  rows={6}
                  placeholder="Boilerplate markdown or commands..."
                  style={{ fontSize: "0.85rem" }}
                  required
                ></textarea>
              </div>

              <button type="submit" className="btn btn-primary w-100 py-2 fw-medium">
                Create Snippet
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Right Table: List Snippets */}
      <div className="col-lg-8">
        <div className="card shadow-sm border-secondary-subtle">
          <div className="card-header bg-dark text-white fw-medium py-2">
            Existing Snippets
          </div>
          <div className="card-body p-0">
            {loadingSnippets ? (
              <div className="p-5 text-center">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : snippets.length === 0 ? (
              <div className="p-5 text-center text-muted">
                No snippets found. Create one using the form on the left.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th style={{ width: "8%" }} className="ps-3">Order</th>
                      <th style={{ width: "22%" }}>Title</th>
                      <th style={{ width: "25%" }}>Category Path</th>
                      <th style={{ width: "30%" }}>Content Preview</th>
                      <th style={{ width: "15%" }} className="text-end pe-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedSnippets.map((snippet) => {
                      const isEditing = editingSnippetId === snippet.id;
                      return (
                        <tr key={snippet.id} className={isEditing ? "table-warning" : ""}>
                          {/* Order */}
                          <td className="ps-3 font-monospace">
                            {isEditing ? (
                              <input
                                type="number"
                                className="form-control form-control-sm font-monospace"
                                value={editSnippetOrderIndex}
                                onChange={(e) => setEditSnippetOrderIndex(parseInt(e.target.value) || 0)}
                                min="0"
                                style={{ width: "60px" }}
                              />
                            ) : (
                              snippet.order_index
                            )}
                          </td>

                          {/* Title */}
                          <td>
                            {isEditing ? (
                              <input
                                type="text"
                                className="form-control form-control-sm fw-medium"
                                value={editSnippetTitle}
                                onChange={(e) => setEditSnippetTitle(e.target.value)}
                              />
                            ) : (
                              <span className="fw-semibold">{snippet.title}</span>
                            )}
                          </td>

                          {/* Category Dropdown */}
                          <td>
                            {isEditing ? (
                              <select
                                className="form-select form-select-sm"
                                value={editSnippetCategoryId || ""}
                                onChange={(e) => setEditSnippetCategoryId(e.target.value ? parseInt(e.target.value) : null)}
                              >
                                <option value="">-- Uncategorized --</option>
                                {flattenedOptions.map((opt) => (
                                  <option key={opt.id} value={opt.id}>
                                    {"\u00A0\u00A0".repeat(opt.depth)}
                                    {opt.depth > 0 ? "↳ " : ""}
                                    {opt.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              (() => {
                                const fullPath = getCategoryPath(categories, snippet.category_id, false);
                                const displayPath = getCategoryPath(categories, snippet.category_id, true);
                                return fullPath === "None" ? (
                                  <span className="text-muted small">None</span>
                                ) : (
                                  <span className="badge bg-info-subtle text-info-emphasis" title={fullPath}>
                                    {displayPath}
                                  </span>
                                );
                              })()
                            )}
                          </td>

                          {/* Content Preview */}
                          <td>
                            {isEditing ? (
                              <textarea
                                className="form-control form-control-sm font-monospace"
                                rows={3}
                                value={editSnippetContent}
                                onChange={(e) => setEditSnippetContent(e.target.value)}
                                style={{ fontSize: "0.8rem" }}
                              ></textarea>
                            ) : (
                              <div
                                className="text-muted font-monospace text-truncate"
                                style={{ maxWidth: "250px", fontSize: "0.8rem" }}
                                title={snippet.content}
                              >
                                {snippet.content}
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
                                  onClick={() => handleUpdateSnippet(snippet.id)}
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary"
                                  onClick={cancelEditSnippet}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="btn-group btn-group-sm">
                                <button
                                  type="button"
                                  className="btn btn-outline-primary"
                                  onClick={() => startEditSnippet(snippet)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-danger"
                                  onClick={() => handleDeleteSnippet(snippet.id, snippet.title)}
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
