"use client";

import { useState, useEffect } from "react";
import { getSnippets, getCategories, getPresets, addPreset, Snippet, Category, Preset } from "@/lib/actions";

// Types for recursive category tree structure
interface CategoryNode extends Category {
  children: CategoryNode[];
}

// Recursive Tree Builder
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
        roots.push(node); // Orphans fallback
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

// Recursive Document compiler
function compileCategoryText(
  node: CategoryNode,
  selectedIds: number[],
  snippets: Snippet[]
): string | null {
  const directSnippets = snippets.filter(
    (s) => s.category_id === node.id && selectedIds.includes(s.id)
  );

  // Recursively compile children
  const childrenTexts: string[] = [];
  node.children.forEach((child) => {
    const childText = compileCategoryText(child, selectedIds, snippets);
    if (childText) {
      childrenTexts.push(childText);
    }
  });

  // If no content inside this node or its children, skip it
  if (directSnippets.length === 0 && childrenTexts.length === 0) {
    return null;
  }

  let text = node.header_text;
  if (directSnippets.length > 0) {
    directSnippets.sort((a, b) => a.order_index - b.order_index);
    const directText = directSnippets.map((s) => s.content).join("\n");
    text += `\n${directText}`;
  }

  if (childrenTexts.length > 0) {
    text += `\n\n${childrenTexts.join("\n\n")}`;
  }

  return text;
}

export default function Home() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [newPresetName, setNewPresetName] = useState<string>("");
  const [savingPreset, setSavingPreset] = useState<boolean>(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [copied, setCopied] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [snippetData, categoryData, presetData] = await Promise.all([
          getSnippets(),
          getCategories(),
          getPresets(),
        ]);
        setSnippets(snippetData);
        setCategories(categoryData);
        setPresets(presetData);
      } catch (err) {
        console.error("Failed to load data: ", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleCheckboxChange = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
    setSelectedPresetId(""); // Clear preset selection on manual toggle
  };

  const handlePresetChange = (presetIdStr: string) => {
    setSelectedPresetId(presetIdStr);
    if (presetIdStr === "") {
      setSelectedIds([]);
      return;
    }
    const preset = presets.find((p) => p.id === parseInt(presetIdStr));
    if (preset) {
      try {
        const ids = JSON.parse(preset.snippet_ids) as number[];
        const validIds = ids.filter((id) => snippets.some((s) => s.id === id));
        setSelectedIds(validIds);
      } catch (e) {
        console.error("Error parsing preset snippet IDs:", e);
      }
    }
  };

  const handleSavePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newPresetName.trim();
    if (!trimmedName || selectedIds.length === 0) return;
    setSavingPreset(true);
    try {
      await addPreset(trimmedName, selectedIds);
      setNewPresetName("");
      const updatedPresets = await getPresets();
      setPresets(updatedPresets);
      const newPreset = updatedPresets.find((p) => p.name === trimmedName);
      if (newPreset) {
        setSelectedPresetId(newPreset.id.toString());
      }
    } catch (err) {
      console.error("Failed to save preset:", err);
      alert("Failed to save preset.");
    } finally {
      setSavingPreset(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
    setSelectedPresetId("");
  };

  const handleCopy = async () => {
    if (!generatedText) return;
    try {
      await navigator.clipboard.writeText(generatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  const handleDownload = () => {
    if (!generatedText) return;
    const blob = new Blob([generatedText], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "AGENTS.md");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Compile document recursively
  const categoryTree = buildCategoryTree(categories);
  const sections: string[] = [];

  categoryTree.forEach((rootNode) => {
    const compiled = compileCategoryText(rootNode, selectedIds, snippets);
    if (compiled) {
      sections.push(compiled);
    }
  });

  // Render uncategorized snippets
  const uncategorizedSnippets = snippets.filter(
    (s) =>
      selectedIds.includes(s.id) &&
      (s.category_id === null || !categories.some((c) => c.id === s.category_id))
  );
  if (uncategorizedSnippets.length > 0) {
    uncategorizedSnippets.sort((a, b) => a.order_index - b.order_index);
    const snippetsText = uncategorizedSnippets.map((s) => s.content).join("\n");
    sections.push(snippetsText);
  }

  const generatedText = sections.join("\n\n");

  // Helper function to check if a category tree node has any snippets anywhere inside it
  const hasSnippetsInTree = (node: CategoryNode): boolean => {
    if (snippets.some((s) => s.category_id === node.id)) return true;
    return node.children.some(hasSnippetsInTree);
  };

  // Recursive Category Checklist Renderer
  const renderCategoryNode = (node: CategoryNode, depth = 0) => {
    const catSnippets = snippets.filter((s) => s.category_id === node.id);

    if (!hasSnippetsInTree(node)) return null;

    return (
      <div key={node.id} className="mb-2">
        {/* Category Header */}
        <div className="d-flex align-items-center mb-1">
          <span className="fw-bold text-secondary text-uppercase small font-monospace">
            {depth > 0 ? "↳ " : ""}
            {node.name}
          </span>
          <hr className="flex-grow-1 ms-2 my-0 border-secondary-subtle" />
        </div>

        {/* Snippet Checkboxes */}
        {catSnippets.length > 0 && (
          <div className="list-group shadow-sm mb-3">
            {catSnippets.map((snippet) => {
              const isSelected = selectedIds.includes(snippet.id);
              return (
                <label
                  key={snippet.id}
                  className={`list-group-item list-group-item-action d-flex align-items-center justify-content-between p-2 border-secondary-subtle ${isSelected ? "bg-primary-subtle text-primary-emphasis border-primary" : ""
                    }`}
                  style={{ cursor: "pointer" }}
                >
                  <div className="d-flex align-items-center">
                    <input
                      className="form-check-input me-3"
                      type="checkbox"
                      value={snippet.id}
                      id={`snippet-${snippet.id}`}
                      checked={isSelected}
                      onChange={() => handleCheckboxChange(snippet.id)}
                    />
                    <span className="fw-medium">{snippet.title}</span>
                  </div>
                  <span className="badge bg-secondary rounded-pill font-monospace">
                    #{snippet.order_index}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        {/* Children (indented indentation helper) */}
        {node.children.length > 0 && (
          <div className="ms-3 ps-1">
            {node.children.map((child) => renderCategoryNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="row">
      {/* Left Column: Grouped Recursive Checklist */}
      <div className="col-md-4 mb-4">
        <h3 className="h4 mb-3 text-secondary">Available Snippets</h3>

        {/* Presets Configuration Card */}
        <div className="card border-secondary-subtle bg-dark-subtle mb-4 shadow-sm">
          <div className="card-body p-3">
            <h5 className="h6 text-secondary text-uppercase small font-monospace mb-2">Preset Configuration</h5>

            {/* Load Preset Selector */}
            <div className="mb-3">
              <div className="d-flex gap-2">
                <select
                  id="preset-select"
                  className="form-select form-select-sm border-secondary-subtle bg-dark text-light"
                  value={selectedPresetId}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Select Preset...</option>
                  {presets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="btn btn-sm btn-outline-danger font-monospace px-2"
                  title="Clear all checked snippets"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Save Preset Form */}
            <form onSubmit={handleSavePreset} className="mt-2 border-top border-secondary-subtle pt-2">
              <div className="input-group input-group-sm">
                <input
                  type="text"
                  id="preset-name"
                  className="form-control border-secondary-subtle bg-dark text-light"
                  placeholder="Save Current Selection..."
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  disabled={selectedIds.length === 0 || savingPreset}
                  required
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={selectedIds.length === 0 || !newPresetName.trim() || savingPreset}
                >
                  {savingPreset ? (
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  ) : (
                    "Save"
                  )}
                </button>
              </div>
              {selectedIds.length === 0 && (
                <div className="form-text small text-muted font-monospace mt-1" style={{ fontSize: '0.75rem' }}>
                  Check snippets below to save a preset.
                </div>
              )}
            </form>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-4">
            <div className="spinner-border text-primary spinner-border-sm" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : snippets.length === 0 ? (
          <div className="alert alert-info">
            No snippets available. Add some in Settings.
          </div>
        ) : (
          <div>
            {/* Render Category Tree recursively */}
            {categoryTree.map((rootNode) => renderCategoryNode(rootNode))}

            {/* Render Uncategorized Snippets at the bottom */}
            {(() => {
              const uncategorized = snippets.filter(
                (s) => s.category_id === null || !categories.some((c) => c.id === s.category_id)
              );
              if (uncategorized.length === 0) return null;
              return (
                <div className="mb-2">
                  <div className="d-flex align-items-center mb-1">
                    <span className="fw-bold text-secondary text-uppercase small font-monospace">
                      Uncategorized / Other
                    </span>
                    <hr className="flex-grow-1 ms-2 my-0 border-secondary-subtle" />
                  </div>
                  <div className="list-group shadow-sm">
                    {uncategorized.map((snippet) => {
                      const isSelected = selectedIds.includes(snippet.id);
                      return (
                        <label
                          key={snippet.id}
                          className={`list-group-item list-group-item-action d-flex align-items-center justify-content-between p-2 border-secondary-subtle ${isSelected ? "bg-primary-subtle text-primary-emphasis border-primary" : ""
                            }`}
                          style={{ cursor: "pointer" }}
                        >
                          <div className="d-flex align-items-center">
                            <input
                              className="form-check-input me-3"
                              type="checkbox"
                              value={snippet.id}
                              id={`snippet-${snippet.id}`}
                              checked={isSelected}
                              onChange={() => handleCheckboxChange(snippet.id)}
                            />
                            <span className="fw-medium">{snippet.title}</span>
                          </div>
                          <span className="badge bg-secondary rounded-pill font-monospace">
                            #{snippet.order_index}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Right Column: Code Editor Output */}
      <div className="col-md-8">
        <h3 className="h4 mb-3 text-secondary">Generated Output</h3>
        <div className="card border-secondary bg-dark text-light shadow-sm">
          {/* macOS styled terminal top bar */}
          <div className="card-header bg-black d-flex align-items-center justify-content-between py-2 border-bottom border-secondary">
            <div className="d-flex align-items-center">
              <span className="badge bg-danger rounded-circle p-1 me-1" style={{ width: '10px', height: '10px' }}></span>
              <span className="badge bg-warning rounded-circle p-1 me-1" style={{ width: '10px', height: '10px' }}></span>
              <span className="badge bg-success rounded-circle p-1" style={{ width: '10px', height: '10px' }}></span>
              <span className="ms-3 text-secondary font-monospace small">instruction_creator.md</span>
            </div>
            <span className="text-secondary font-monospace small">markdown</span>
          </div>
          {/* Terminal content area */}
          <div className="card-body p-0">
            <pre
              className="p-2 mb-0 font-monospace text-light bg-dark"
              style={{
                minHeight: "300px",
                whiteSpace: "pre-wrap",
                fontSize: "0.9rem",
              }}
            >
              {generatedText || "Select snippets from the list to compile your document..."}
            </pre>
          </div>
        </div>
        {generatedText && (
          <div className="d-flex justify-content-end mt-2 gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="btn btn-sm btn-success px-3 py-1 shadow-sm font-monospace d-flex align-items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" className="bi bi-download me-2" viewBox="0 0 16 16">
                <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5" />
                <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z" />
              </svg>
              Download AGENTS.md
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="btn btn-sm btn-secondary px-3 py-1 shadow-sm font-monospace"
            >
              {copied ? (
                <>
                  <span className="spinner-grow spinner-grow-sm text-success me-1" role="status" aria-hidden="true"></span>
                  Copied!
                </>
              ) : (
                "Copy to Clipboard"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}