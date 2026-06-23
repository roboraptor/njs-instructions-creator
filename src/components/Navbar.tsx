"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="navbar navbar-expand-md navbar-dark bg-dark py-1">
      <div className="container">
        <Link className="navbar-brand fw-bold" href="/">
          InstructionCreator
        </Link>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item">
              <Link
                className={`nav-link ${pathname === "/" ? "active fw-semibold" : ""}`}
                href="/"
              >
                Main Page
              </Link>
            </li>
            <li className="nav-item">
              <Link
                className={`nav-link ${pathname === "/settings" ? "active fw-semibold" : ""}`}
                href="/settings"
              >
                Settings
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}
