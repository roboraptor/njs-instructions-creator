"use client";

import { useState, useEffect } from "react";
import { getSnippets, getCategories, getPresets } from "@/lib/actions";
import SnippetsTab from "@/components/settings/SnippetsTab";
import CategoriesTab from "@/components/settings/CategoriesTab";
import PresetsTab from "@/components/settings/PresetsTab";

export default function Settings() {
  const [activeTab, setActiveTab] = useState<"snippets" | "categories" | "presets">("snippets");
  const [stats, setStats] = useState({ snippets: 0, categories: 0, presets: 0 });

  const loadStats = async () => {
    try {
      const [s, c, p] = await Promise.all([
        getSnippets(),
        getCategories(),
        getPresets(),
      ]);
      setStats({
        snippets: s.length,
        categories: c.length,
        presets: p.length,
      });
    } catch (e) {
      console.error("Failed to load settings dashboard stats", e);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  return (
    <div className="col-md-12 pb-4">
      <div className="d-flex align-items-center justify-content-between mb-2 border-bottom pb-2">
        <h1 className="h3 mb-0 text-secondary">Settings Dashboard</h1>
        <div className="d-flex gap-2">
          <span className="badge bg-secondary font-monospace">{stats.snippets} Snippets</span>
          <span className="badge bg-secondary font-monospace">{stats.categories} Categories</span>
          <span className="badge bg-secondary font-monospace">{stats.presets} Presets</span>
        </div>
      </div>

      {/* Tabs Selector */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link fw-semibold px-2 ${activeTab === "snippets" ? "active text-primary" : "text-secondary"}`}
            onClick={() => setActiveTab("snippets")}
          >
            Manage Snippets
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link fw-semibold px-2 ${activeTab === "categories" ? "active text-primary" : "text-secondary"}`}
            onClick={() => setActiveTab("categories")}
          >
            Manage Categories
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link fw-semibold px-2 ${activeTab === "presets" ? "active text-primary" : "text-secondary"}`}
            onClick={() => setActiveTab("presets")}
          >
            Manage Presets
          </button>
        </li>
      </ul>

      {/* Dynamic Tab Views */}
      {activeTab === "snippets" && <SnippetsTab onRefreshStats={loadStats} />}
      {activeTab === "categories" && <CategoriesTab onRefreshStats={loadStats} />}
      {activeTab === "presets" && <PresetsTab onRefreshStats={loadStats} />}
    </div>
  );
}
