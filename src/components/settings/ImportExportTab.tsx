"use client";

import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import {
  getSnippets,
  getCategories,
  getPresets,
  importDatabaseData,
  importTreeDatabaseData,
} from "@/lib/actions";

interface ImportExportTabProps {
  onRefreshStats?: () => void;
}

export default function ImportExportTab({ onRefreshStats }: ImportExportTabProps) {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [importingExcel, setImportingExcel] = useState(false);
  const [exportingTreeExcel, setExportingTreeExcel] = useState(false);
  const [importingTreeExcel, setImportingTreeExcel] = useState(false);
  const [clearFirst, setClearFirst] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "danger" } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelFileInputRef = useRef<HTMLInputElement>(null);
  const treeExcelFileInputRef = useRef<HTMLInputElement>(null);

  const formatWorksheetAsText = (ws: XLSX.WorkSheet) => {
    for (const key in ws) {
      if (key.startsWith("!")) continue;
      const cell = ws[key];
      if (cell) {
        cell.t = "s"; // Set cell type to String
        cell.z = "@"; // Set Excel number format to Text
        if (cell.v !== undefined && cell.v !== null) {
          cell.v = String(cell.v);
        }
      }
    }
  };

  // 1. JSON Export
  const handleExport = async () => {
    setExporting(true);
    setMessage(null);
    try {
      const [snippets, categories, presets] = await Promise.all([
        getSnippets(),
        getCategories(),
        getPresets(),
      ]);

      const backup = {
        exportedAt: new Date().toISOString(),
        categories,
        snippets,
        presets,
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `instruction_creator_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setMessage({ text: "Database exported successfully to JSON!", type: "success" });
    } catch (error) {
      console.error("Failed to export database", error);
      setMessage({ text: "Failed to export database records.", type: "danger" });
    } finally {
      setExporting(false);
    }
  };

  // 2. JSON Import
  const handleImport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);

    const fileInput = fileInputRef.current;
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      setMessage({ text: "Please select a backup JSON file first.", type: "danger" });
      return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        setImporting(true);
        const json = JSON.parse(event.target?.result as string);

        if (!json.categories || !json.snippets) {
          throw new Error("Invalid backup file structure. Missing categories or snippets arrays.");
        }

        const confirmMsg = clearFirst
          ? "⚠️ WARNING: This will completely wipe all your current snippets, categories, and presets, replacing them with the backup file data. Are you sure you want to continue?"
          : "This will import categories, snippets, and presets. Duplicate IDs will be overwritten. Proceed?";

        if (!confirm(confirmMsg)) {
          setImporting(false);
          return;
        }

        await importDatabaseData(
          json.categories,
          json.snippets,
          json.presets || [],
          clearFirst
        );

        setMessage({
          text: `Successfully imported backup! Loaded ${json.categories.length} categories, ${json.snippets.length} snippets, and ${(json.presets || []).length} presets.`,
          type: "success",
        });

        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        if (onRefreshStats) onRefreshStats();
      } catch (error: any) {
        console.error("Failed to import database", error);
        setMessage({
          text: `Import failed: ${error.message || "Invalid JSON backup file structure."}`,
          type: "danger",
        });
      } finally {
        setImporting(false);
      }
    };

    reader.onerror = () => {
      setMessage({ text: "Error reading the file.", type: "danger" });
    };

    reader.readAsText(file);
  };

  // 3. Excel Export
  const handleExportExcel = async () => {
    setExportingExcel(true);
    setMessage(null);
    try {
      const [snippets, categories, presets] = await Promise.all([
        getSnippets(),
        getCategories(),
        getPresets(),
      ]);

      const wb = XLSX.utils.book_new();

      // Categories Sheet
      const categoriesData = categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        header_text: cat.header_text,
        order_index: cat.order_index,
        parent_id: cat.parent_id
      }));
      const wsCats = XLSX.utils.json_to_sheet(categoriesData);
      formatWorksheetAsText(wsCats);
      XLSX.utils.book_append_sheet(wb, wsCats, "Categories");

      // Snippets Sheet
      const snippetsData = snippets.map(snip => ({
        id: snip.id,
        title: snip.title,
        content: snip.content,
        order_index: snip.order_index,
        category_id: snip.category_id
      }));
      const wsSnips = XLSX.utils.json_to_sheet(snippetsData);
      formatWorksheetAsText(wsSnips);
      XLSX.utils.book_append_sheet(wb, wsSnips, "Snippets");

      // Presets Sheet
      const presetsData = presets.map(preset => ({
        id: preset.id,
        name: preset.name,
        snippet_ids: preset.snippet_ids
      }));
      const wsPresets = XLSX.utils.json_to_sheet(presetsData);
      formatWorksheetAsText(wsPresets);
      XLSX.utils.book_append_sheet(wb, wsPresets, "Presets");

      XLSX.writeFile(wb, `instruction_creator_sheets_${new Date().toISOString().slice(0, 10)}.xlsx`);

      setMessage({ text: "Database exported to Excel successfully!", type: "success" });
    } catch (error) {
      console.error("Failed to export database to Excel", error);
      setMessage({ text: "Failed to export database to Excel.", type: "danger" });
    } finally {
      setExportingExcel(false);
    }
  };

  // 4. Excel Import
  const handleImportExcel = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);

    const fileInput = excelFileInputRef.current;
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      setMessage({ text: "Please select an Excel sheet first.", type: "danger" });
      return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        setImportingExcel(true);
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        const sheetCats = workbook.Sheets["Categories"];
        const sheetSnips = workbook.Sheets["Snippets"];
        const sheetPresets = workbook.Sheets["Presets"];

        if (!sheetCats || !sheetSnips) {
          throw new Error("Missing 'Categories' or 'Snippets' worksheets in the uploaded workbook.");
        }

        const categories = XLSX.utils.sheet_to_json<any>(sheetCats);
        const snippets = XLSX.utils.sheet_to_json<any>(sheetSnips);
        const presets = sheetPresets ? XLSX.utils.sheet_to_json<any>(sheetPresets) : [];

        const confirmMsg = clearFirst
          ? "⚠️ WARNING: This will completely wipe all your current snippets, categories, and presets, replacing them with the Excel spreadsheet data. Are you sure you want to continue?"
          : "This will import categories, snippets, and presets from Excel. Duplicate IDs will be overwritten. Proceed?";

        if (!confirm(confirmMsg)) {
          setImportingExcel(false);
          return;
        }

        const parsedCats = categories.map(cat => ({
          id: cat.id ? Number(cat.id) : undefined,
          name: String(cat.name || ""),
          header_text: String(cat.header_text || ""),
          order_index: cat.order_index ? Number(cat.order_index) : 0,
          parent_id: cat.parent_id !== undefined && cat.parent_id !== null && cat.parent_id !== "" ? Number(cat.parent_id) : null
        }));

        const parsedSnips = snippets.map(snip => ({
          id: snip.id ? Number(snip.id) : undefined,
          title: String(snip.title || ""),
          content: String(snip.content || ""),
          order_index: snip.order_index ? Number(snip.order_index) : 0,
          category_id: snip.category_id !== undefined && snip.category_id !== null && snip.category_id !== "" ? Number(snip.category_id) : null
        }));

        const parsedPresets = presets.map(preset => ({
          id: preset.id ? Number(preset.id) : undefined,
          name: String(preset.name || ""),
          snippet_ids: String(preset.snippet_ids || "[]")
        }));

        await importDatabaseData(
          parsedCats,
          parsedSnips,
          parsedPresets,
          clearFirst
        );

        setMessage({
          text: `Successfully imported Excel sheet! Loaded ${parsedCats.length} categories, ${parsedSnips.length} snippets, and ${parsedPresets.length} presets.`,
          type: "success",
        });

        if (excelFileInputRef.current) {
          excelFileInputRef.current.value = "";
        }
        if (onRefreshStats) onRefreshStats();
      } catch (error: any) {
        console.error("Failed to import database from Excel", error);
        setMessage({
          text: `Excel import failed: ${error.message || "Invalid spreadsheet structure."}`,
          type: "danger",
        });
      } finally {
        setImportingExcel(false);
      }
    };

    reader.onerror = () => {
      setMessage({ text: "Error reading the file.", type: "danger" });
    };

    reader.readAsArrayBuffer(file);
  };

  // 5. Tree-Structured Excel Export
  const handleExportTreeExcel = async () => {
    setExportingTreeExcel(true);
    setMessage(null);
    try {
      const [snippets, categories, presets] = await Promise.all([
        getSnippets(),
        getCategories(),
        getPresets(),
      ]);

      interface CatNode {
        category: any;
        children: CatNode[];
        snippets: any[];
      }

      const nodeMap = new Map<number, CatNode>();
      const roots: CatNode[] = [];

      for (const cat of categories) {
        nodeMap.set(cat.id, {
          category: cat,
          children: [],
          snippets: []
        });
      }

      for (const snip of snippets) {
        if (snip.category_id !== null) {
          const node = nodeMap.get(snip.category_id);
          if (node) {
            node.snippets.push(snip);
          }
        }
      }

      for (const cat of categories) {
        const node = nodeMap.get(cat.id)!;
        if (cat.parent_id === null) {
          roots.push(node);
        } else {
          const parentNode = nodeMap.get(cat.parent_id);
          if (parentNode) {
            parentNode.children.push(node);
          } else {
            roots.push(node);
          }
        }
      }

      const sortNode = (node: CatNode) => {
        node.children.sort((a, b) => (a.category.order_index || 0) - (b.category.order_index || 0));
        node.snippets.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
        for (const child of node.children) {
          sortNode(child);
        }
      };

      roots.sort((a, b) => (a.category.order_index || 0) - (b.category.order_index || 0));
      for (const root of roots) {
        sortNode(root);
      }

      const treeRows: any[] = [];
      const traverse = (node: CatNode, path: string[]) => {
        const currentPath = [...path, node.category.name];
        treeRows.push({
          "Level 1 Category": currentPath[0] || "",
          "Level 2 Category": currentPath[1] || "",
          "Level 3 Category": currentPath[2] || "",
          "Level 4 Category": currentPath[3] || "",
          "Level 5 Category": currentPath[4] || "",
          "Header Text": node.category.header_text || "",
          "Snippet Title": "",
          "Snippet Content": "",
          "Type": "Category",
          "Database ID": node.category.id,
          "Order Index": node.category.order_index
        });

        for (const snip of node.snippets) {
          treeRows.push({
            "Level 1 Category": currentPath[0] || "",
            "Level 2 Category": currentPath[1] || "",
            "Level 3 Category": currentPath[2] || "",
            "Level 4 Category": currentPath[3] || "",
            "Level 5 Category": currentPath[4] || "",
            "Header Text": "",
            "Snippet Title": snip.title,
            "Snippet Content": snip.content,
            "Type": "Snippet",
            "Database ID": snip.id,
            "Order Index": snip.order_index
          });
        }

        for (const child of node.children) {
          traverse(child, currentPath);
        }
      };

      for (const root of roots) {
        traverse(root, []);
      }

      const orphans = snippets.filter(s => s.category_id === null);
      if (orphans.length > 0) {
        orphans.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
        for (const snip of orphans) {
          treeRows.push({
            "Level 1 Category": "",
            "Level 2 Category": "",
            "Level 3 Category": "",
            "Level 4 Category": "",
            "Level 5 Category": "",
            "Header Text": "",
            "Snippet Title": snip.title,
            "Snippet Content": snip.content,
            "Type": "Snippet",
            "Database ID": snip.id,
            "Order Index": snip.order_index
          });
        }
      }

      const wb = XLSX.utils.book_new();
      const wsTree = XLSX.utils.json_to_sheet(treeRows);
      
      wsTree["!cols"] = [
        { wch: 25 }, // L1
        { wch: 25 }, // L2
        { wch: 25 }, // L3
        { wch: 25 }, // L4
        { wch: 25 }, // L5
        { wch: 30 }, // Header Text
        { wch: 20 }, // Snippet Title
        { wch: 50 }, // Snippet Content
        { wch: 12 }, // Type
        { wch: 12 }, // Database ID
        { wch: 12 }  // Order Index
      ];
      
      formatWorksheetAsText(wsTree);
      XLSX.utils.book_append_sheet(wb, wsTree, "Categories & Snippets");

      const presetsData = presets.map(preset => ({
        id: preset.id,
        name: preset.name,
        snippet_ids: preset.snippet_ids
      }));
      const wsPresets = XLSX.utils.json_to_sheet(presetsData);
      formatWorksheetAsText(wsPresets);
      XLSX.utils.book_append_sheet(wb, wsPresets, "Presets");

      XLSX.writeFile(wb, `instruction_creator_tree_${new Date().toISOString().slice(0, 10)}.xlsx`);
      setMessage({ text: "Database exported to Tree Excel successfully!", type: "success" });
    } catch (error) {
      console.error("Failed to export database to Tree Excel", error);
      setMessage({ text: "Failed to export database to Tree Excel.", type: "danger" });
    } finally {
      setExportingTreeExcel(false);
    }
  };

  // 6. Tree-Structured Excel Import
  const handleImportTreeExcel = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);

    const fileInput = treeExcelFileInputRef.current;
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      setMessage({ text: "Please select a Tree Excel sheet first.", type: "danger" });
      return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        setImportingTreeExcel(true);
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        const sheetTree = workbook.Sheets["Categories & Snippets"];
        const sheetPresets = workbook.Sheets["Presets"];

        if (!sheetTree) {
          throw new Error("Missing 'Categories & Snippets' worksheet in the uploaded workbook.");
        }

        const rawRows = XLSX.utils.sheet_to_json<any>(sheetTree);
        const presets = sheetPresets ? XLSX.utils.sheet_to_json<any>(sheetPresets) : [];

        const confirmMsg = clearFirst
          ? "⚠️ WARNING: This will completely wipe all your current snippets, categories, and presets, replacing them with the Tree Excel spreadsheet data. Are you sure you want to continue?"
          : "This will import categories and snippets from Tree Excel. Duplicate IDs will be overwritten. Proceed?";

        if (!confirm(confirmMsg)) {
          setImportingTreeExcel(false);
          return;
        }

        const parsedRows = rawRows.map(row => {
          return {
            level1: row["Level 1 Category"] !== undefined ? String(row["Level 1 Category"]) : undefined,
            level2: row["Level 2 Category"] !== undefined ? String(row["Level 2 Category"]) : undefined,
            level3: row["Level 3 Category"] !== undefined ? String(row["Level 3 Category"]) : undefined,
            level4: row["Level 4 Category"] !== undefined ? String(row["Level 4 Category"]) : undefined,
            level5: row["Level 5 Category"] !== undefined ? String(row["Level 5 Category"]) : undefined,
            header_text: row["Header Text"] !== undefined ? String(row["Header Text"]) : undefined,
            snippet_title: row["Snippet Title"] !== undefined ? String(row["Snippet Title"]) : undefined,
            snippet_content: row["Snippet Content"] !== undefined ? String(row["Snippet Content"]) : undefined,
            type: String(row["Type"] || "Category"),
            id: row["Database ID"] ? Number(row["Database ID"]) : null,
            order_index: row["Order Index"] !== undefined && row["Order Index"] !== "" ? Number(row["Order Index"]) : null
          };
        });

        const parsedPresets = presets.map(preset => ({
          id: preset.id ? Number(preset.id) : undefined,
          name: String(preset.name || ""),
          snippet_ids: String(preset.snippet_ids || "[]")
        }));

        await importTreeDatabaseData(
          parsedRows,
          parsedPresets,
          clearFirst
        );

        setMessage({
          text: `Successfully imported Tree Excel! Loaded ${parsedRows.filter(r => r.type === "Category").length} categories, ${parsedRows.filter(r => r.type === "Snippet").length} snippets, and ${parsedPresets.length} presets.`,
          type: "success",
        });

        if (treeExcelFileInputRef.current) {
          treeExcelFileInputRef.current.value = "";
        }
        if (onRefreshStats) onRefreshStats();
      } catch (error: any) {
        console.error("Failed to import database from Tree Excel", error);
        setMessage({
          text: `Tree Excel import failed: ${error.message || "Invalid spreadsheet structure."}`,
          type: "danger",
        });
      } finally {
        setImportingTreeExcel(false);
      }
    };

    reader.onerror = () => {
      setMessage({ text: "Error reading the file.", type: "danger" });
    };

    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="row g-3">
      {message && (
        <div className="col-12">
          <div className={`alert alert-${message.type} shadow-sm py-2 px-3`} role="alert">
            {message.type === "success" ? "✅" : "❌"} {message.text}
          </div>
        </div>
      )}

      {/* Global Config Row: Clear Database Toggle */}
      <div className="col-12">
        <div className="card shadow-sm border-secondary-subtle">
          <div className="card-body py-2 px-3 bg-dark-subtle rounded d-flex align-items-center justify-content-between">
            <div className="form-check my-1">
              <input
                className="form-check-input"
                type="checkbox"
                id="clear-db-check-global"
                checked={clearFirst}
                onChange={(e) => setClearFirst(e.target.checked)}
              />
              <label className="form-check-label small fw-semibold text-warning" htmlFor="clear-db-check-global">
                Wipe current database before importing (Full Restore mode)
              </label>
            </div>
            <span className="text-secondary small font-monospace" style={{ fontSize: "0.75rem" }}>
              Applies to both JSON and Excel imports.
            </span>
          </div>
        </div>
      </div>

      {/* Row 1: JSON Porting */}
      <div className="col-md-6">
        <div className="card shadow-sm border-secondary-subtle h-100">
          <div className="card-header bg-dark text-white fw-medium py-2 d-flex align-items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-filetype-json me-2" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M14 4.5V14a2 2 0 0 1-2 2h-1v-1h1a1 1 0 0 0 1-1V4.5h-2A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v9H2V2a2 2 0 0 1 2-2h5.5zM4.15 10.12h.73v3.08c0 .324-.085.586-.253.784-.166.195-.443.293-.83.293-.23 0-.442-.04-.633-.122v-.656c.18.083.352.124.514.124.239 0 .359-.143.359-.43v-.457h-.726v-.657h.726v-.935h.103zM7.228 10.12c.513 0 .9.176 1.161.528.26.35.39.855.39 1.517 0 .656-.129 1.157-.387 1.5-.258.344-.64.517-1.147.517-.517 0-.901-.173-1.151-.518-.25-.347-.375-.85-.375-1.508 0-.66.126-1.166.377-1.516.252-.352.645-.528 1.182-.528m-.017.653c-.279 0-.49.123-.633.37-.142.247-.213.626-.213 1.137 0 .509.07.887.21 1.133.141.246.35.37.625.37.28 0 .49-.124.629-.37.14-.247.21-.624.21-1.133 0-.512-.07-.89-.211-1.138-.14-.247-.35-.37-.627-.37m3.842-.653c.277 0 .513.067.708.2l-.337.584c-.161-.1-.326-.15-.494-.15-.228 0-.395.076-.5.23-.105.15-.158.384-.158.702v1.834h-.73v-3.08h.684v.51c.105-.184.22-.325.347-.425a.8.8 0 0 1 .48-.15"/>
            </svg>
            Export JSON
          </div>
          <div className="card-body d-flex flex-column justify-content-between p-3">
            <div>
              <p className="text-secondary small mb-2">
                Generate a full JSON backup file containing your database records.
              </p>
              <ul className="text-secondary small font-monospace mb-0">
                <li>All Category names & nested levels</li>
                <li>All Markdown snippet template texts</li>
                <li>All Saved selections (Presets)</li>
              </ul>
            </div>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="btn btn-primary w-100 py-2 fw-medium d-flex align-items-center justify-content-center gap-2 mt-3"
            >
              {exporting ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  Exporting JSON...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-download" viewBox="0 0 16 16">
                    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/>
                    <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"/>
                  </svg>
                  Export Database to JSON
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="col-md-6">
        <div className="card shadow-sm border-secondary-subtle h-100">
          <div className="card-header bg-dark text-white fw-medium py-2 d-flex align-items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-filetype-json me-2" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M14 4.5V14a2 2 0 0 1-2 2h-1v-1h1a1 1 0 0 0 1-1V4.5h-2A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v9H2V2a2 2 0 0 1 2-2h5.5zM4.15 10.12h.73v3.08c0 .324-.085.586-.253.784-.166.195-.443.293-.83.293-.23 0-.442-.04-.633-.122v-.656c.18.083.352.124.514.124.239 0 .359-.143.359-.43v-.457h-.726v-.657h.726v-.935h.103zM7.228 10.12c.513 0 .9.176 1.161.528.26.35.39.855.39 1.517 0 .656-.129 1.157-.387 1.5-.258.344-.64.517-1.147.517-.517 0-.901-.173-1.151-.518-.25-.347-.375-.85-.375-1.508 0-.66.126-1.166.377-1.516.252-.352.645-.528 1.182-.528m-.017.653c-.279 0-.49.123-.633.37-.142.247-.213.626-.213 1.137 0 .509.07.887.21 1.133.141.246.35.37.625.37.28 0 .49-.124.629-.37.14-.247.21-.624.21-1.133 0-.512-.07-.89-.211-1.138-.14-.247-.35-.37-.627-.37m3.842-.653c.277 0 .513.067.708.2l-.337.584c-.161-.1-.326-.15-.494-.15-.228 0-.395.076-.5.23-.105.15-.158.384-.158.702v1.834h-.73v-3.08h.684v.51c.105-.184.22-.325.347-.425a.8.8 0 0 1 .48-.15"/>
            </svg>
            Import JSON
          </div>
          <div className="card-body p-3">
            <form onSubmit={handleImport} className="d-flex flex-column justify-content-between h-100">
              <div>
                <p className="text-secondary small">
                  Upload a previously exported JSON backup file to load categories, snippets, and presets.
                </p>

                <div className="mb-3">
                  <label htmlFor="import-file" className="form-label small text-secondary fw-semibold">
                    Backup JSON File
                  </label>
                  <input
                    type="file"
                    id="import-file"
                    ref={fileInputRef}
                    accept=".json"
                    className="form-control border-secondary-subtle bg-dark text-light"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={importing}
                className="btn btn-warning w-100 py-2 fw-medium d-flex align-items-center justify-content-center gap-2"
              >
                {importing ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    Importing JSON...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi fill-current" viewBox="0 0 16 16">
                      <path fillRule="evenodd" d="M15.817.113a.5.5 0 0 1 .121.509l-5.97 11.9a.5.5 0 0 1-.908 0L6.643 6.943.113 4.542a.5.5 0 0 1 0-.908L12.013.113a.5.5 0 0 1 .509.121L15.817.113z"/>
                    </svg>
                    Import JSON Backup
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Row 2: Excel Porting */}
      <div className="col-md-6 mt-2">
        <div className="card shadow-sm border-secondary-subtle h-100">
          <div className="card-header bg-dark text-white fw-medium py-2 d-flex align-items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-file-earmark-excel me-2" viewBox="0 0 16 16">
              <path d="M5.884 6.68a.5.5 0 1 0-.768.64L7.349 10l-2.233 2.68a.5.5 0 0 0 .768.64L8 10.781l2.117 2.54a.5.5 0 0 0 .768-.641L8.651 10l2.233-2.68a.5.5 0 0 0-.768-.64L8 9.219l-2.116-2.54z"/>
              <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/>
            </svg>
            Export to Excel
          </div>
          <div className="card-body d-flex flex-column justify-content-between p-3">
            <div>
              <p className="text-secondary small mb-2">
                Generate an Excel spreadsheet workbook (`.xlsx`) containing worksheets:
              </p>
              <ul className="text-secondary small font-monospace mb-0">
                <li><strong>Categories</strong>: Category IDs, parents, headers</li>
                <li><strong>Snippets</strong>: Prompt content, categories, ordering</li>
                <li><strong>Presets</strong>: Custom checkbox combinations</li>
              </ul>
            </div>

            <button
              onClick={handleExportExcel}
              disabled={exportingExcel}
              className="btn btn-success w-100 py-2 fw-medium d-flex align-items-center justify-content-center gap-2 mt-3"
            >
              {exportingExcel ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  Exporting Excel...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-download" viewBox="0 0 16 16">
                    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/>
                    <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"/>
                  </svg>
                  Export Database to Excel
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="col-md-6 mt-2">
        <div className="card shadow-sm border-secondary-subtle h-100">
          <div className="card-header bg-dark text-white fw-medium py-2 d-flex align-items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-file-earmark-excel me-2" viewBox="0 0 16 16">
              <path d="M5.884 6.68a.5.5 0 1 0-.768.64L7.349 10l-2.233 2.68a.5.5 0 0 0 .768.64L8 10.781l2.117 2.54a.5.5 0 0 0 .768-.641L8.651 10l2.233-2.68a.5.5 0 0 0-.768-.64L8 9.219l-2.116-2.54z"/>
              <path d="M14 14V4.5L9.5 0H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2zM9.5 3A1.5 1.5 0 0 0 11 4.5h2V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h5.5v2z"/>
            </svg>
            Import Excel
          </div>
          <div className="card-body p-3">
            <form onSubmit={handleImportExcel} className="d-flex flex-column justify-content-between h-100">
              <div>
                <p className="text-secondary small">
                  Upload an Excel workbook spreadsheet containing worksheets named exactly `Categories` and `Snippets`.
                </p>

                <div className="mb-3">
                  <label htmlFor="import-excel-file" className="form-label small text-secondary fw-semibold">
                    Excel Workbook File
                  </label>
                  <input
                    type="file"
                    id="import-excel-file"
                    ref={excelFileInputRef}
                    accept=".xlsx, .xls"
                    className="form-control border-secondary-subtle bg-dark text-light"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={importingExcel}
                className="btn btn-warning w-100 py-2 fw-medium d-flex align-items-center justify-content-center gap-2"
              >
                {importingExcel ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    Importing Excel...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi fill-current" viewBox="0 0 16 16">
                      <path fillRule="evenodd" d="M15.817.113a.5.5 0 0 1 .121.509l-5.97 11.9a.5.5 0 0 1-.908 0L6.643 6.943.113 4.542a.5.5 0 0 1 0-.908L12.013.113a.5.5 0 0 1 .509.121L15.817.113z"/>
                    </svg>
                    Import Workbook Data
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Row 3: Tree-Structured Excel Porting */}
      <div className="col-md-6 mt-2">
        <div className="card shadow-sm border-secondary-subtle h-100">
          <div className="card-header bg-dark text-white fw-medium py-2 d-flex align-items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-diagram-3-fill me-2" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M6 3.5A1.5 1.5 0 0 1 7.5 2h1A1.5 1.5 0 0 1 10 3.5v1A1.5 1.5 0 0 1 8.5 6v1.5h3.879a1.5 1.5 0 0 1 1.06.44l1.42 1.42a1.5 1.5 0 0 1 .44 1.06v1.5a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5V11a1.5 1.5 0 0 1 .44-1.06l1.42-1.42h-3.88V11a1.5 1.5 0 0 1-1.5 1.5h-1A1.5 1.5 0 0 1 6 11V8.5H2.121a1.5 1.5 0 0 1-1.06-.44L.44 6.64a1.5 1.5 0 0 1-.44-1.06v-1.5A1.5 1.5 0 0 1 1.5 2.6h1A1.5 1.5 0 0 1 4 4.1v1.5H6V3.5z"/>
            </svg>
            Export to Tree Excel (Single Sheet)
          </div>
          <div className="card-body d-flex flex-column justify-content-between p-3">
            <div>
              <p className="text-secondary small mb-2">
                Generate a single-sheet Excel workbook (`.xlsx`) structured as a visual parent-child hierarchy:
              </p>
              <ul className="text-secondary small font-monospace mb-0">
                <li><strong>Tree Columns</strong>: Level 1 to Level 5 category columns</li>
                <li><strong>Readable Layout</strong>: Subcategories and Snippets nest visually from left to right</li>
                <li><strong>No ID Management</strong>: Rebuilds relations dynamically from indentation on import</li>
              </ul>
            </div>

            <button
              onClick={handleExportTreeExcel}
              disabled={exportingTreeExcel}
              className="btn btn-success w-100 py-2 fw-medium d-flex align-items-center justify-content-center gap-2 mt-3"
            >
              {exportingTreeExcel ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  Exporting Tree...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-download" viewBox="0 0 16 16">
                    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/>
                    <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"/>
                  </svg>
                  Export Tree Excel
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="col-md-6 mt-2">
        <div className="card shadow-sm border-secondary-subtle h-100">
          <div className="card-header bg-dark text-white fw-medium py-2 d-flex align-items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-diagram-3-fill me-2" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M6 3.5A1.5 1.5 0 0 1 7.5 2h1A1.5 1.5 0 0 1 10 3.5v1A1.5 1.5 0 0 1 8.5 6v1.5h3.879a1.5 1.5 0 0 1 1.06.44l1.42 1.42a1.5 1.5 0 0 1 .44 1.06v1.5a1.5 1.5 0 0 1-1.5 1.5h-1a1.5 1.5 0 0 1-1.5-1.5V11a1.5 1.5 0 0 1 .44-1.06l1.42-1.42h-3.88V11a1.5 1.5 0 0 1-1.5 1.5h-1A1.5 1.5 0 0 1 6 11V8.5H2.121a1.5 1.5 0 0 1-1.06-.44L.44 6.64a1.5 1.5 0 0 1-.44-1.06v-1.5A1.5 1.5 0 0 1 1.5 2.6h1A1.5 1.5 0 0 1 4 4.1v1.5H6V3.5z"/>
            </svg>
            Import Tree Excel (Single Sheet)
          </div>
          <div className="card-body p-3">
            <form onSubmit={handleImportTreeExcel} className="d-flex flex-column justify-content-between h-100">
              <div>
                <p className="text-secondary small">
                  Upload a Tree Excel sheet workbook. It must have a sheet named `Categories & Snippets`.
                </p>

                <div className="mb-3">
                  <label htmlFor="import-tree-excel-file" className="form-label small text-secondary fw-semibold">
                    Tree Excel Workbook File
                  </label>
                  <input
                    type="file"
                    id="import-tree-excel-file"
                    ref={treeExcelFileInputRef}
                    accept=".xlsx, .xls"
                    className="form-control border-secondary-subtle bg-dark text-light"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={importingTreeExcel}
                className="btn btn-warning w-100 py-2 fw-medium d-flex align-items-center justify-content-center gap-2"
              >
                {importingTreeExcel ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    Importing Tree...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi fill-current" viewBox="0 0 16 16">
                      <path fillRule="evenodd" d="M15.817.113a.5.5 0 0 1 .121.509l-5.97 11.9a.5.5 0 0 1-.908 0L6.643 6.943.113 4.542a.5.5 0 0 1 0-.908L12.013.113a.5.5 0 0 1 .509.121L15.817.113z"/>
                    </svg>
                    Import Tree Workbook
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
