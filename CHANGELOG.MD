# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog,
and this project adheres to Semantic Versioning.

## [Unreleased]

## [1.0.3] - 2026-04-13

### Added

- New extension popup settings page with a minimal UI and a toggle to include Deep Research sources in exported Markdown.
- Persistent user preference stored locally to control whether final Deep Research source lists are appended.

### Changed

- Extension action now opens the popup settings interface.
- Markdown extraction flow now applies the popup preference when exporting Deep Research responses.

### Fixed

- Inline math extraction no longer wraps simple values in display math, preventing outputs like $$300$$.
- Improved Deep Research table handling to keep content rows and ignore non-content footer controls.
- Reduced duplicated math artifacts by skipping rendered KaTeX wrapper nodes during extraction.
