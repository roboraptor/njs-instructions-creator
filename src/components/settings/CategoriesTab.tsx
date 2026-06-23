"use client";

import { useState, useEffect } from "react";
import {
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
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

function isDescendant(list: Category[], parentId: number, childId: number): boolean {
  let currentId: number | null = childId;
  while (currentId !== null) {
    const item = list.find((c) => c.id === currentId);
    if (!item) break;
    if (item.parent_id === parentId) return true;
    currentId = item.parent_id;
  }
  return false;
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

interface CategoriesTabProps {
  onRefreshStats?: () => void;
}

export default function CategoriesTab({ onRefreshStats }: CategoriesTabProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(true);

  // Category Form & Inline Edit States
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editCategoryName, setEditCategoryName] = useState<string>("");
  const [editCategoryHeader, setEditCategoryHeader] = useState<string>("");
  const [editCategoryOrderIndex, setEditCategoryOrderIndex] = useState<number>(0);
  const [editCategoryParentId, setEditCategoryParentId] = useState<number | null>(null);

  const loadCategories = async () => {
    setLoadingCategories(true);
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) {
      console.error("Failed to load categories", error);
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleAddCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      await addCategory(formData);
      form.reset();
      await loadCategories();
      if (onRefreshStats) onRefreshStats();
    } catch (error) {
      alert("Failed to add category.");
      console.error(error);
    }
  };

  const startEditCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setEditCategoryName(category.name);
    setEditCategoryHeader(category.header_text);
    setEditCategoryOrderIndex(category.order_index);
    setEditCategoryParentId(category.parent_id);
  };

  const cancelEditCategory = () => {
    setEditingCategoryId(null);
    setEditCategoryName("");
    setEditCategoryHeader("");
    setEditCategoryOrderIndex(0);
    setEditCategoryParentId(null);
  };

  const handleUpdateCategory = async (id: number) => {
    if (!editCategoryName.trim() || !editCategoryHeader.trim()) {
      alert("Name and Header Text cannot be empty.");
      return;
    }

    const formData = new FormData();
    formData.append("name", editCategoryName);
    formData.append("header_text", editCategoryHeader);
    formData.append("order_index", editCategoryOrderIndex.toString());
    formData.append("parent_id", editCategoryParentId !== null ? editCategoryParentId.toString() : "");

    try {
      await updateCategory(id, formData);
      setEditingCategoryId(null);
      await loadCategories();
      if (onRefreshStats) onRefreshStats();
    } catch (error) {
      alert("Failed to update category.");
      console.error(error);
    }
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete category "${name}"?\nSnippets or child categories nested under it will lose their association.`)) {
      try {
        await deleteCategory(id);
        await loadCategories();
        if (onRefreshStats) onRefreshStats();
      } catch (error) {
        alert("Failed to delete category.");
        console.error(error);
      }
    }
  };

  const categoryTree = buildCategoryTree(categories);
  const flattenedOptions = getFlattenedOptions(categoryTree);

  return (
    <div className="row g-2">
      {/* Left Form: Add Category */}
      <div className="col-lg-4">
        <div className="card shadow-sm border-secondary-subtle">
          <div className="card-header bg-dark text-white fw-medium py-2">
            Add New Category
          </div>
          <div className="card-body">
            <form onSubmit={handleAddCategory}>
              <div className="mb-3">
                <label htmlFor="cat-name" className="form-label small fw-semibold text-secondary">
                  Category Name
                </label>
                <input
                  type="text"
                  id="cat-name"
                  name="name"
                  className="form-control border-secondary-subtle"
                  placeholder="e.g. Node.js Setup"
                  required
                />
              </div>

              <div className="mb-3">
                <label htmlFor="cat-header" className="form-label small fw-semibold text-secondary">
                  Header Text (Markdown Style)
                </label>
                <input
                  type="text"
                  id="cat-header"
                  name="header_text"
                  className="form-control font-monospace border-secondary-subtle"
                  placeholder="e.g. #### Node.js Config ####"
                  required
                />
                <div className="form-text small text-muted">
                  This will head the section in the generated document.
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="cat-parent-id" className="form-label small fw-semibold text-secondary">
                  Parent Category (Optional)
                </label>
                <select
                  id="cat-parent-id"
                  name="parent_id"
                  className="form-select border-secondary-subtle"
                >
                  <option value="">-- None (Top-Level Category) --</option>
                  {flattenedOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {"\u00A0\u00A0".repeat(opt.depth)}
                      {opt.depth > 0 ? "↳ " : ""}
                      {opt.name}
                    </option>
                  ))}
                </select>
                <div className="form-text small text-muted">
                  Select a parent to nest this category at any level of depth.
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="cat-order" className="form-label small fw-semibold text-secondary">
                  Order Index (Optional)
                </label>
                <input
                  type="number"
                  id="cat-order"
                  name="order_index"
                  className="form-control border-secondary-subtle"
                  placeholder="Auto-assigns next index"
                  min="0"
                />
                <div className="form-text small text-muted">
                  Leave blank to append to the end of the parent level automatically.
                </div>
              </div>

              <button type="submit" className="btn btn-primary w-100 py-2 fw-medium">
                Create Category
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Right Table: List Categories */}
      <div className="col-lg-8">
        <div className="card shadow-sm border-secondary-subtle">
          <div className="card-header bg-dark text-white fw-medium py-2">
            Existing Categories
          </div>
          <div className="card-body p-0">
            {loadingCategories ? (
              <div className="p-5 text-center">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : categories.length === 0 ? (
              <div className="p-5 text-center text-muted">
                No categories found. Create one using the form on the left.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead>
                    <tr>
                      <th style={{ width: "8%" }} className="ps-3">Order</th>
                      <th style={{ width: "22%" }}>Name</th>
                      <th style={{ width: "25%" }}>Category Path / Parent</th>
                      <th style={{ width: "30%" }}>Header Text (Output Prefix)</th>
                      <th style={{ width: "15%" }} className="text-end pe-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category) => {
                      const isEditing = editingCategoryId === category.id;
                      return (
                        <tr key={category.id} className={isEditing ? "table-warning" : ""}>
                          {/* Order */}
                          <td className="ps-3 font-monospace">
                            {isEditing ? (
                              <input
                                type="number"
                                className="form-control form-control-sm font-monospace"
                                value={editCategoryOrderIndex}
                                onChange={(e) => setEditCategoryOrderIndex(parseInt(e.target.value) || 0)}
                                min="0"
                                style={{ width: "55px" }}
                              />
                            ) : (
                              category.order_index
                            )}
                          </td>

                          {/* Name */}
                          <td>
                            {isEditing ? (
                              <input
                                type="text"
                                className="form-control form-control-sm fw-medium"
                                value={editCategoryName}
                                onChange={(e) => setEditCategoryName(e.target.value)}
                              />
                            ) : (
                              <span className="fw-semibold">{category.name}</span>
                            )}
                          </td>

                          {/* Parent Category with circular check */}
                          <td>
                            {isEditing ? (
                              <select
                                className="form-select form-select-sm"
                                value={editCategoryParentId || ""}
                                onChange={(e) => setEditCategoryParentId(e.target.value ? parseInt(e.target.value) : null)}
                              >
                                <option value="">-- None (Top-Level) --</option>
                                {flattenedOptions
                                  .filter((opt) => opt.id !== category.id && !isDescendant(categories, category.id, opt.id))
                                  .map((opt) => (
                                    <option key={opt.id} value={opt.id}>
                                      {"\u00A0\u00A0".repeat(opt.depth)}
                                      {opt.depth > 0 ? "↳ " : ""}
                                      {opt.name}
                                    </option>
                                  ))}
                              </select>
                            ) : (
                              (() => {
                                const fullPath = getCategoryPath(categories, category.parent_id, false);
                                const displayPath = getCategoryPath(categories, category.parent_id, true);
                                return fullPath === "None" ? (
                                  <span className="text-muted small">Top-Level</span>
                                ) : (
                                  <span className="badge bg-secondary-subtle text-secondary-emphasis" title={fullPath}>
                                    {displayPath}
                                  </span>
                                );
                              })()
                            )}
                          </td>

                          {/* Header Text */}
                          <td>
                            {isEditing ? (
                              <input
                                type="text"
                                className="form-control form-control-sm font-monospace"
                                value={editCategoryHeader}
                                onChange={(e) => setEditCategoryHeader(e.target.value)}
                              />
                            ) : (
                              <code className="text-info font-monospace fw-semibold">{category.header_text}</code>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="text-end pe-3">
                            {isEditing ? (
                              <div className="btn-group btn-group-sm">
                                <button
                                  type="button"
                                  className="btn btn-success fw-medium"
                                  onClick={() => handleUpdateCategory(category.id)}
                                >
                                  Save
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary"
                                  onClick={cancelEditCategory}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="btn-group btn-group-sm">
                                <button
                                  type="button"
                                  className="btn btn-outline-primary"
                                  onClick={() => startEditCategory(category)}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-danger"
                                  onClick={() => handleDeleteCategory(category.id, category.name)}
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
